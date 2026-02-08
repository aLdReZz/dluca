import emailjs from '@emailjs/browser';

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

export interface SendPayslipParams {
    recipientEmail: string;
    employeeName: string;
    payCoverage: string;
    netSalary: string;
    pdfBase64: string;
}

export const sendPayslipEmail = async (params: SendPayslipParams): Promise<void> => {
    if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
        throw new Error(
            'EmailJS is not configured. ' +
            'Set VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, and VITE_EMAILJS_PUBLIC_KEY in .env.local'
        );
    }

    emailjs.init({ publicKey: PUBLIC_KEY });

    // Convert base64 to a Blob and attach via sendForm workaround
    // EmailJS free tier supports file attachments when using sendForm with a hidden input
    const form = document.createElement('form');

    const addField = (name: string, value: string) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.appendChild(input);
    };

    addField('to_email', params.recipientEmail);
    addField('employee_name', params.employeeName);
    addField('pay_coverage', params.payCoverage);
    addField('net_salary', params.netSalary);

    // Add PDF as file attachment
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.name = 'pdf_attachment';
    form.appendChild(fileInput);

    // Convert base64 to File and set it on the file input
    const binaryString = atob(params.pdfBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9\s\-]/g, '').replace(/\s+/g, '_');
    const file = new File([blob], `${sanitize(params.employeeName)}_Payslip_${sanitize(params.payCoverage)}.pdf`, { type: 'application/pdf' });

    // Use DataTransfer to set the file on the input
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;

    console.log('📧 Sending email via EmailJS with PDF attachment...', {
        serviceId: SERVICE_ID,
        templateId: TEMPLATE_ID,
        to_email: params.recipientEmail,
        fileName: file.name,
        fileSize: file.size,
    });

    try {
        const response = await emailjs.sendForm(SERVICE_ID, TEMPLATE_ID, form);
        console.log('✅ EmailJS response:', response);
    } catch (error: any) {
        console.error('❌ EmailJS error:', error);
        console.error('❌ EmailJS status:', error?.status);
        console.error('❌ EmailJS message:', error?.message);
        throw error;
    }
};
