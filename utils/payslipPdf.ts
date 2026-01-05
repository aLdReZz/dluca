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
    additionalIncomeItems?: PayslipPdfTableRow[];
    salaryDeductionItems?: PayslipPdfTableRow[];
    lateMinutes?: number;
    lateDeduction?: number;
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
const BODY_FONT = 'helvetica'; // Apple-like font (Helvetica is similar to San Francisco)

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

        // Ensure label and value are valid strings
        const label = String(row.label || '');
        const value = String(row.value || 'N/A');

        doc.setFont(BODY_FONT, 'bold');
        doc.setFontSize(11);
        doc.text(label, startX, y);
        doc.text(':', colonX, y);

        doc.setFont(BODY_FONT, 'normal');
        doc.text(value, valueX, y, { maxWidth: maxValueWidth });
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

    const headerHeight = 26;
    doc.setFillColor(TABLE_HEADER_FILL.r, TABLE_HEADER_FILL.g, TABLE_HEADER_FILL.b);
    doc.rect(MARGIN, y, tableWidth, headerHeight, 'F');
    doc.setDrawColor(TABLE_BORDER.r, TABLE_BORDER.g, TABLE_BORDER.b);
    doc.rect(MARGIN, y, tableWidth, headerHeight, 'S');

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    setTextColor(doc, TEXT_COLOR);
    doc.text('Description', MARGIN + 12, y + headerHeight - 9);
    doc.text('Amount', MARGIN + tableWidth - 12, y + headerHeight - 9, { align: 'right' });
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

        // Ensure description is a valid string
        const description = String(row.description || 'N/A');
        const amount = Number.isFinite(row.amount) ? row.amount : 0;

        doc.text(description, MARGIN + 12, y + rowHeight - 7);
        doc.text(formatMoney(amount), MARGIN + tableWidth - 12, y + rowHeight - 7, {
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

const renderPayslipPage = async (doc: jsPDF, data: PayslipPdfData, logoDataUrl: string | null) => {
    const pageWidth = doc.internal.pageSize.getWidth();

    setTextColor(doc, TEXT_COLOR);

    let cursorY = MARGIN - 20; // Move starting position up

    const columnGap = 28;
    const columnWidth = (pageWidth - MARGIN * 2 - columnGap) / 2;
    const logoWidth = 120;
    const logoHeight = 120;
    const logoX = MARGIN - 15; // Move logo to the left
    const logoY = cursorY - 10; // Move logo up

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
    doc.setFont(BODY_FONT, 'bold');
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

    // Summary section - minimalist design
    const summaryBoxHeight = 70;
    const summaryBoxWidth = pageWidth - MARGIN * 2;

    // Simple header bar
    const headerHeight = 24;
    doc.setFillColor(TABLE_HEADER_FILL.r, TABLE_HEADER_FILL.g, TABLE_HEADER_FILL.b);
    doc.rect(MARGIN, cursorY, summaryBoxWidth, headerHeight, 'F');
    doc.setDrawColor(TABLE_BORDER.r, TABLE_BORDER.g, TABLE_BORDER.b);
    doc.setLineWidth(0.5);
    doc.rect(MARGIN, cursorY, summaryBoxWidth, headerHeight, 'S');

    doc.setFont(BODY_FONT, 'bold');
    doc.setFontSize(11);
    setTextColor(doc, TEXT_COLOR);
    doc.text('SUMMARY', MARGIN + 12, cursorY + 16);

    // Stats row
    const statsY = cursorY + headerHeight;
    const statsHeight = summaryBoxHeight - headerHeight;

    doc.setFillColor(TABLE_ROW_FILL.r, TABLE_ROW_FILL.g, TABLE_ROW_FILL.b);
    doc.rect(MARGIN, statsY, summaryBoxWidth, statsHeight, 'F');
    doc.rect(MARGIN, statsY, summaryBoxWidth, statsHeight, 'S');

    // Four columns for stats
    const colWidth = summaryBoxWidth / 4;
    const summaryStats = [
        { label: 'Present', value: String(data.daysPresent) },
        { label: 'Absent', value: String(data.daysAbsent) },
        { label: 'Late', value: String(data.daysLate) },
        { label: 'Total Hours', value: data.totalHours.toFixed(2) + ' hrs' }
    ];

    summaryStats.forEach((stat, index) => {
        const colX = MARGIN + (index * colWidth);
        const centerX = colX + colWidth / 2;

        // Draw vertical separator lines between columns
        if (index > 0) {
            doc.setDrawColor(TABLE_BORDER.r, TABLE_BORDER.g, TABLE_BORDER.b);
            doc.setLineWidth(0.5);
            doc.line(colX, statsY, colX, statsY + statsHeight);
        }

        // Label
        doc.setFont(BODY_FONT, 'normal');
        doc.setFontSize(9);
        setTextColor(doc, SUBTEXT_COLOR);
        doc.text(stat.label, centerX, statsY + 18, { align: 'center' });

        // Value
        doc.setFont(BODY_FONT, 'bold');
        doc.setFontSize(14);
        setTextColor(doc, EMPHASIS_TEXT);
        doc.text(stat.value, centerX, statsY + 36, { align: 'center' });
    });

    cursorY += summaryBoxHeight + 20;

    // Combine earnings with individual additional income items
    let finalEarnings = [...data.earnings];
    if (data.additionalIncomeItems && data.additionalIncomeItems.length > 0) {
        finalEarnings = finalEarnings.filter(row => row.description !== 'Additional Income');
        finalEarnings.push(...data.additionalIncomeItems);
    }

    // Combine deductions with individual salary deduction items
    let finalDeductions = [...data.deductions];
    if (data.salaryDeductionItems && data.salaryDeductionItems.length > 0) {
        finalDeductions = finalDeductions.filter(row => row.description !== 'Custom Deduction');
        finalDeductions.push(...data.salaryDeductionItems);
    }

    // Add late deduction if available
    if (data.lateDeduction && data.lateDeduction > 0 && data.lateMinutes && data.lateMinutes > 0) {
        finalDeductions.push({
            description: `late (${data.lateMinutes} min)`,
            amount: data.lateDeduction
        });
    }

    // Draw earnings and deductions side by side
    const containerWidth = pageWidth - MARGIN * 2;
    const earningsColumnGap = 20;
    const earningsColumnWidth = (containerWidth - earningsColumnGap) / 2;

    // Header row
    const earningsHeaderHeight = 24;
    doc.setFillColor(TABLE_HEADER_FILL.r, TABLE_HEADER_FILL.g, TABLE_HEADER_FILL.b);
    doc.rect(MARGIN, cursorY, earningsColumnWidth, earningsHeaderHeight, 'F');
    doc.rect(MARGIN + earningsColumnWidth + earningsColumnGap, cursorY, earningsColumnWidth, earningsHeaderHeight, 'F');
    doc.setDrawColor(TABLE_BORDER.r, TABLE_BORDER.g, TABLE_BORDER.b);
    doc.setLineWidth(0.5);
    doc.rect(MARGIN, cursorY, earningsColumnWidth, earningsHeaderHeight, 'S');
    doc.rect(MARGIN + earningsColumnWidth + earningsColumnGap, cursorY, earningsColumnWidth, earningsHeaderHeight, 'S');

    doc.setFont(BODY_FONT, 'bold');
    doc.setFontSize(11);
    setTextColor(doc, TEXT_COLOR);
    doc.text('EARNINGS', MARGIN + 12, cursorY + 16);
    doc.text('DEDUCTIONS', MARGIN + earningsColumnWidth + earningsColumnGap + 12, cursorY + 16);

    cursorY += earningsHeaderHeight;

    // Content rows
    const maxRows = Math.max(finalEarnings.length, finalDeductions.length);
    const safeEarnings = finalEarnings.length > 0 ? finalEarnings : [{ description: 'No entries recorded', amount: 0 }];
    const safeDeductions = finalDeductions.length > 0 ? finalDeductions : [{ description: 'No entries recorded', amount: 0 }];
    const rowHeight = 20;

    const actualMaxRows = Math.max(safeEarnings.length, safeDeductions.length);

    for (let i = 0; i < actualMaxRows; i++) {
        const isEven = i % 2 === 0;
        const fillColor = isEven ? TABLE_ROW_FILL : TABLE_ALT_ROW_FILL;

        // Earnings row
        const earningRow = safeEarnings[i];
        if (earningRow) {
            doc.setFillColor(fillColor.r, fillColor.g, fillColor.b);
            doc.rect(MARGIN, cursorY, earningsColumnWidth, rowHeight, 'F');
            doc.rect(MARGIN, cursorY, earningsColumnWidth, rowHeight, 'S');

            doc.setFont(BODY_FONT, 'normal');
            doc.setFontSize(10);
            setTextColor(doc, TEXT_COLOR);
            doc.text(String(earningRow.description || 'N/A'), MARGIN + 12, cursorY + rowHeight - 7, { maxWidth: earningsColumnWidth * 0.6 });
            doc.text(formatMoney(earningRow.amount), MARGIN + earningsColumnWidth - 12, cursorY + rowHeight - 7, { align: 'right' });
        }

        // Deductions row
        const deductionRow = safeDeductions[i];
        if (deductionRow) {
            doc.setFillColor(fillColor.r, fillColor.g, fillColor.b);
            doc.rect(MARGIN + earningsColumnWidth + earningsColumnGap, cursorY, earningsColumnWidth, rowHeight, 'F');
            doc.rect(MARGIN + earningsColumnWidth + earningsColumnGap, cursorY, earningsColumnWidth, rowHeight, 'S');

            doc.setFont(BODY_FONT, 'normal');
            doc.setFontSize(10);
            setTextColor(doc, TEXT_COLOR);
            doc.text(String(deductionRow.description || 'N/A'), MARGIN + earningsColumnWidth + earningsColumnGap + 12, cursorY + rowHeight - 7, { maxWidth: earningsColumnWidth * 0.6 });
            doc.text(formatMoney(deductionRow.amount), MARGIN + earningsColumnWidth + earningsColumnGap + earningsColumnWidth - 12, cursorY + rowHeight - 7, { align: 'right' });
        }

        cursorY += rowHeight;
    }

    // Total rows
    doc.setFont(BODY_FONT, 'bold');
    doc.setFontSize(10);
    setTextColor(doc, EMPHASIS_TEXT);
    doc.setFillColor(TABLE_TOTAL_FILL.r, TABLE_TOTAL_FILL.g, TABLE_TOTAL_FILL.b);

    doc.rect(MARGIN, cursorY, earningsColumnWidth, rowHeight, 'F');
    doc.rect(MARGIN, cursorY, earningsColumnWidth, rowHeight, 'S');
    doc.text('TOTAL EARNINGS', MARGIN + 12, cursorY + rowHeight - 7);
    doc.text(formatMoney(data.totalEarnings), MARGIN + earningsColumnWidth - 12, cursorY + rowHeight - 7, { align: 'right' });

    doc.rect(MARGIN + earningsColumnWidth + earningsColumnGap, cursorY, earningsColumnWidth, rowHeight, 'F');
    doc.rect(MARGIN + earningsColumnWidth + earningsColumnGap, cursorY, earningsColumnWidth, rowHeight, 'S');
    doc.text('TOTAL DEDUCTIONS', MARGIN + earningsColumnWidth + earningsColumnGap + 12, cursorY + rowHeight - 7);
    doc.text(formatMoney(data.totalDeductions), MARGIN + earningsColumnWidth + earningsColumnGap + earningsColumnWidth - 12, cursorY + rowHeight - 7, { align: 'right' });

    cursorY += rowHeight + 20;

    // Net Salary Box - matching table style
    const tableWidth = pageWidth - MARGIN * 2;
    const netSalaryHeight = 35;

    doc.setFillColor(TABLE_TOTAL_FILL.r, TABLE_TOTAL_FILL.g, TABLE_TOTAL_FILL.b);
    doc.rect(MARGIN, cursorY, tableWidth, netSalaryHeight, 'F');
    doc.setDrawColor(TABLE_BORDER.r, TABLE_BORDER.g, TABLE_BORDER.b);
    doc.setLineWidth(1);
    doc.rect(MARGIN, cursorY, tableWidth, netSalaryHeight, 'S');

    doc.setFont(BODY_FONT, 'bold');
    doc.setFontSize(16);
    setTextColor(doc, TEXT_COLOR);
    doc.text('NET SALARY', MARGIN + 12, cursorY + netSalaryHeight - 11);

    doc.setFontSize(18);
    doc.text(formatMoney(data.netSalary), MARGIN + tableWidth - 12, cursorY + netSalaryHeight - 11, { align: 'right' });

    cursorY += netSalaryHeight + 40;

    // Bottom note
    doc.setFont(BODY_FONT, 'italic');
    doc.setFontSize(9);
    setTextColor(doc, SUBTEXT_COLOR);
    const noteText = 'This is a computer-generated payslip and does not require a signature.';
    doc.text(noteText, pageWidth / 2, cursorY, { align: 'center' });
};

export const generatePayslipPdf = async (data: PayslipPdfData) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const logoDataUrl = await loadLogoDataUrl();

    await renderPayslipPage(doc, data, logoDataUrl);

    // Generate filename: [employee name] Payslip [pay duration]
    const sanitizeFilename = (str: string) => str.replace(/[^a-zA-Z0-9\s\-]/g, '');
    const employeePart = sanitizeFilename(data.employeeName);
    const durationPart = sanitizeFilename(data.payCoverage);
    const filename = `${employeePart} Payslip ${durationPart}.pdf`;

    doc.save(filename);
};

export const generateConsolidatedPayslipsPdf = async (payslipsData: PayslipPdfData[]) => {
    if (payslipsData.length === 0) {
        console.warn('No payslip data provided for consolidated PDF');
        return;
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const logoDataUrl = await loadLogoDataUrl();

    for (let i = 0; i < payslipsData.length; i++) {
        if (i > 0) {
            doc.addPage();
        }
        await renderPayslipPage(doc, payslipsData[i], logoDataUrl);
    }

    // Generate filename using first payslip's pay coverage
    const sanitizeFilename = (str: string) => str.replace(/[^a-zA-Z0-9\s\-]/g, '');
    const durationPart = sanitizeFilename(payslipsData[0].payCoverage);
    const filename = `All Payslips ${durationPart}.pdf`;

    doc.save(filename);
};
