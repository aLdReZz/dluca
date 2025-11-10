import { jsPDF } from 'jspdf';

export interface PayslipPdfTableRow {
    description: string;
    amount: number;
}

export interface PayslipPdfData {
    companyName: string;
    companyAddress: string;
    employeeName: string;
    department: string;
    designation: string;
    payCoverage: string;
    payDate: string;
    bankAccount: string;
    paymentMode: string;
    earnings: PayslipPdfTableRow[];
    deductions: PayslipPdfTableRow[];
    totalEarnings: number;
    totalDeductions: number;
    netSalary: number;
    daysPresent: number;
    daysAbsent: number;
    daysLate: number;
    totalHours: number;
}

const MARGIN = 72; // 1 inch margin on A4 (72pt = 1in)
const TEXT_COLOR = { r: 30, g: 30, b: 30 };
const SUBTEXT_COLOR = { r: 120, g: 120, b: 120 };
const EMPHASIS_TEXT = { r: 17, g: 17, b: 17 };
const LOGO_BG = { r: 7, g: 7, b: 7 };
const TABLE_HEADER_FILL = { r: 198, g: 199, b: 204 };
const TABLE_ROW_FILL = { r: 245, g: 246, b: 248 };
const TABLE_ALT_ROW_FILL = { r: 253, g: 253, b: 253 };
const TABLE_TOTAL_FILL = { r: 226, g: 227, b: 230 };
const TABLE_BORDER = { r: 195, g: 197, b: 201 };

const LOGO_PATHS = ['/dlc-sublogo.png', '/favicon.png'];
const HEADER_FONT = 'helvetica';

const formatMoney = (value: number) =>
    (Number.isFinite(value) ? value : 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

const setTextColor = (doc: jsPDF, color: typeof TEXT_COLOR) => {
    doc.setTextColor(color.r, color.g, color.b);
};

const drawInfoColumn = (
    doc: jsPDF,
    rows: { label: string; value: string }[],
    startX: number,
    startY: number,
    columnWidth: number,
) => {
    const lineHeight = 18;
    const labelWidth = 105;
    rows.forEach((row, index) => {
        const y = startY + index * lineHeight;
        const colonX = startX + labelWidth;
        const valueX = colonX + 10;
        const maxValueWidth = Math.max(60, columnWidth - labelWidth - 10);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(row.label, startX, y);
        doc.text(':', colonX, y);

        doc.setFont('helvetica', 'normal');
        doc.text(row.value, valueX, y, { maxWidth: maxValueWidth });
    });
};

interface TableOptions {
    doc: jsPDF;
    title: string;
    rows: PayslipPdfTableRow[];
    totalLabel: string;
    totalValue: number;
    startY: number;
    pageWidth: number;
}

const drawTable = ({
    doc,
    title,
    rows,
    totalLabel,
    totalValue,
    startY,
    pageWidth,
}: TableOptions) => {
    const tableWidth = pageWidth - MARGIN * 2;
    let y = startY;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(title, MARGIN, y);
    y += 18;

    const headerHeight = 22;
    doc.setFillColor(TABLE_HEADER_FILL.r, TABLE_HEADER_FILL.g, TABLE_HEADER_FILL.b);
    doc.rect(MARGIN, y, tableWidth, headerHeight, 'F');
    doc.setDrawColor(TABLE_BORDER.r, TABLE_BORDER.g, TABLE_BORDER.b);
    doc.rect(MARGIN, y, tableWidth, headerHeight, 'S');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('Description', MARGIN + 12, y + headerHeight - 8);
    doc.text('Amount', MARGIN + tableWidth - 12, y + headerHeight - 8, { align: 'right' });
    y += headerHeight;

    const rowHeight = 20;
    const safeRows =
        rows.length > 0 ? rows : [{ description: 'No entries recorded', amount: 0 }];

    doc.setFont('helvetica', 'normal');
    setTextColor(doc, TEXT_COLOR);
    safeRows.forEach((row, index) => {
        const isEven = index % 2 === 0;
        const fillColor = isEven ? TABLE_ROW_FILL : TABLE_ALT_ROW_FILL;
        doc.setFillColor(fillColor.r, fillColor.g, fillColor.b);
        doc.rect(MARGIN, y, tableWidth, rowHeight, 'F');
        doc.rect(MARGIN, y, tableWidth, rowHeight, 'S');
        doc.text(row.description, MARGIN + 12, y + rowHeight - 7);
        doc.text(formatMoney(row.amount), MARGIN + tableWidth - 12, y + rowHeight - 7, {
            align: 'right',
        });
        y += rowHeight;
    });

    doc.setFont('helvetica', 'bold');
    setTextColor(doc, EMPHASIS_TEXT);
    doc.setFillColor(TABLE_TOTAL_FILL.r, TABLE_TOTAL_FILL.g, TABLE_TOTAL_FILL.b);
    doc.rect(MARGIN, y, tableWidth, rowHeight, 'F');
    doc.rect(MARGIN, y, tableWidth, rowHeight, 'S');
    doc.text(totalLabel.toUpperCase(), MARGIN + 12, y + rowHeight - 7);
    doc.text(formatMoney(totalValue), MARGIN + tableWidth - 12, y + rowHeight - 7, {
        align: 'right',
    });
    return y + rowHeight + 10;
};

let cachedLogoDataUrl: string | null = null;

const blobToDataUrl = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });

const loadLogoDataUrl = async () => {
    if (cachedLogoDataUrl) return cachedLogoDataUrl;
    for (const path of LOGO_PATHS) {
        try {
            const response = await fetch(path);
            if (!response.ok) continue;
            const blob = await response.blob();
            cachedLogoDataUrl = await blobToDataUrl(blob);
            return cachedLogoDataUrl;
        } catch {
            // ignore and try next path
        }
    }
    return null;
};

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
};

export const generatePayslipPdf = async (data: PayslipPdfData) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    setTextColor(doc, TEXT_COLOR);

    let cursorY = MARGIN - 20; // Move starting position up

    const columnGap = 28;
    const columnWidth = (pageWidth - MARGIN * 2 - columnGap) / 2;
    const logoWidth = 120;
    const logoHeight = 120;
    const logoX = MARGIN - 15; // Move logo to the left
    const logoY = cursorY - 10; // Move logo up
    const logoDataUrl = await loadLogoDataUrl();

    if (logoDataUrl) {
        doc.addImage(logoDataUrl, 'PNG', logoX, logoY, logoWidth, logoHeight, undefined, 'FAST');
    } else {
        const fallbackDiameter = 96;
        const logoCenterX = logoX + fallbackDiameter / 2;
        const logoCenterY = logoY + fallbackDiameter / 2;
        doc.setFillColor(LOGO_BG.r, LOGO_BG.g, LOGO_BG.b);
        doc.circle(logoCenterX, logoCenterY, fallbackDiameter / 2, 'F');
        doc.setDrawColor(LOGO_BG.r, LOGO_BG.g, LOGO_BG.b);
        doc.setLineWidth(2);
        doc.circle(logoCenterX, logoCenterY, fallbackDiameter / 2, 'S');
        doc.setFontSize(32);
        doc.setTextColor(249, 250, 251);
        doc.setFont('helvetica', 'bold');
        doc.text('dlc', logoCenterX, logoCenterY + 4, { align: 'center' });
        doc.setFontSize(10);
        doc.text('BISTRO × CAFÉ', logoCenterX, logoCenterY + 20, { align: 'center' });
    }

    const headerRightX = pageWidth - MARGIN;
    setTextColor(doc, TEXT_COLOR);
    doc.setFont(HEADER_FONT, 'bold');
    doc.setFontSize(28);
    doc.text(data.companyName, headerRightX, cursorY + 35, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    setTextColor(doc, SUBTEXT_COLOR);
    doc.text(data.companyAddress, headerRightX, cursorY + 52, { align: 'right', maxWidth: 200 });
    setTextColor(doc, TEXT_COLOR);

    cursorY += logoHeight + 40;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(30);
    doc.text('EMPLOYEE PAYSLIP', pageWidth / 2, cursorY, { align: 'center' });

    cursorY += 40;
    doc.setLineWidth(0.5);
    doc.setDrawColor(220, 220, 220);
    doc.line(MARGIN, cursorY, pageWidth - MARGIN, cursorY);
    cursorY += 24;

    const leftRows = [
        { label: 'Employee Name', value: data.employeeName },
        { label: 'Designation', value: data.designation },
    ];
    const rightRows = [
        { label: 'Pay Coverage', value: data.payCoverage },
        { label: 'Pay Date', value: data.payDate },
    ];

    drawInfoColumn(doc, leftRows, MARGIN, cursorY, columnWidth);
    drawInfoColumn(doc, rightRows, MARGIN + columnWidth + columnGap, cursorY, columnWidth);
    cursorY += 90;

    cursorY = drawTable({
        doc,
        title: 'EARNINGS',
        rows: data.earnings,
        totalLabel: 'Total Earnings',
        totalValue: data.totalEarnings,
        startY: cursorY,
        pageWidth,
    });

    cursorY = drawTable({
        doc,
        title: 'Deductions',
        rows: data.deductions,
        totalLabel: 'Total Deductions',
        totalValue: data.totalDeductions,
        startY: cursorY + 10,
        pageWidth,
    });

    cursorY += 20;

    // Net Salary Box - matching table style
    const tableWidth = pageWidth - MARGIN * 2;
    const netSalaryHeight = 35;

    doc.setFillColor(TABLE_TOTAL_FILL.r, TABLE_TOTAL_FILL.g, TABLE_TOTAL_FILL.b);
    doc.rect(MARGIN, cursorY, tableWidth, netSalaryHeight, 'F');
    doc.setDrawColor(TABLE_BORDER.r, TABLE_BORDER.g, TABLE_BORDER.b);
    doc.setLineWidth(1);
    doc.rect(MARGIN, cursorY, tableWidth, netSalaryHeight, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    setTextColor(doc, TEXT_COLOR);
    doc.text('NET SALARY', MARGIN + 12, cursorY + netSalaryHeight - 11);

    doc.setFontSize(18);
    doc.text(formatMoney(data.netSalary), MARGIN + tableWidth - 12, cursorY + netSalaryHeight - 11, { align: 'right' });

    cursorY += netSalaryHeight + 40;

    // Bottom note
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    setTextColor(doc, SUBTEXT_COLOR);
    const noteText = 'This is a computer-generated payslip and does not require a signature.';
    doc.text(noteText, pageWidth / 2, cursorY, { align: 'center' });

    // Generate filename: [employee name] Payslip [pay duration]
    const sanitizeFilename = (str: string) => str.replace(/[^a-zA-Z0-9\s\-]/g, '');
    const employeePart = sanitizeFilename(data.employeeName);
    const durationPart = sanitizeFilename(data.payCoverage);
    const filename = `${employeePart} Payslip ${durationPart}.pdf`;

    doc.save(filename);
};
