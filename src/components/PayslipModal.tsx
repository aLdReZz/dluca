import React, { useState, useMemo, useEffect } from 'react';
import type { PayrollRecord } from '../types';
import { XMarkIcon, PrinterIcon } from './Icons';

interface PayslipModalProps {
    record: PayrollRecord;
    payPeriod: { start: string; end: string };
    onClose: () => void;
    onSave: (updatedRecord: PayrollRecord) => void;
}

const formatPeso = (amount: number) => {
    return 'PHP ' + amount.toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00Z');
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
};

const escapeHtml = (value: string) =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const PayslipModal: React.FC<PayslipModalProps> = ({ record, payPeriod, onClose, onSave }) => {
    const [serviceCharge, setServiceCharge] = useState(record.serviceCharge || 0);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const { grossPay, netPay, earningsTotal, deductionTotal } = useMemo(() => {
        const regular = record.regularPay ?? 0;
        const overtime = record.overtimePay ?? 0;
        const earnings = regular + overtime + serviceCharge;
        const gross = earnings;
        const deductions = record.deductions?.total ?? 0;
        const net = earnings - deductions;
        return {
            grossPay: gross,
            netPay: net,
            earningsTotal: earnings,
            deductionTotal: deductions
        };
    }, [record.regularPay, record.overtimePay, record.deductions, serviceCharge]);

    const handleServiceChargeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setServiceCharge(parseFloat(e.target.value) || 0);
    };

    const handleSave = () => {
        const updatedRecord: PayrollRecord = {
            ...record,
            serviceCharge,
            grossPay,
            deductions: {
                sss: record.deductions?.sss ?? 0,
                philhealth: record.deductions?.philhealth ?? 0,
                pagibig: record.deductions?.pagibig ?? 0,
                total: deductionTotal
            },
            netPay
        };
        onSave(updatedRecord);
    };

    const handlePrint = () => {
        const safeEmployee = escapeHtml(record.employee ?? '');
        const safePosition = escapeHtml(record.position ?? '');
        const payPeriodStart = formatDateForDisplay(payPeriod.start);
        const payPeriodEnd = formatDateForDisplay(payPeriod.end);
        const payDateLabel = formatDateForDisplay(payPeriod.end) || '';

        const regularHours = record.regularHours ?? 0;
        const overtimeHours = record.overtimeHours ?? 0;
        const rate = record.rate ?? 0;
        const overtimeAmount = record.overtimePay ?? 0;

        const formatMoneySymbol = (amount: number) =>
            `₱ ${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const formatMoneyOrDash = (amount: number) => (amount > 0 ? formatMoneySymbol(amount) : '₱ -');
        const formatHours = (hours: number) => hours.toFixed(2);

        const sss = record.deductions?.sss ?? 0;
        const philhealth = record.deductions?.philhealth ?? 0;
        const pagibig = record.deductions?.pagibig ?? 0;
        const otherDeductions = Math.max(deductionTotal - (sss + philhealth + pagibig), 0);

        const overtimeRate =
            overtimeHours > 0 ? formatMoneySymbol(overtimeAmount / overtimeHours || 0) : '₱ -';

        const earningsRows = [
            `<tr>
                <td>REGULAR HOURS</td>
                <td class="amount">${formatHours(regularHours)}</td>
                <td class="amount">${formatMoneySymbol(rate)}</td>
                <td class="amount">${formatMoneySymbol(record.regularPay ?? 0)}</td>
            </tr>`,
            `<tr>
                <td>OVERTIME</td>
                <td class="amount">${formatHours(overtimeHours)}</td>
                <td class="amount">${overtimeRate}</td>
                <td class="amount">${formatMoneySymbol(overtimeAmount)}</td>
            </tr>`,
            `<tr>
                <td>SERVICE CHARGE</td>
                <td class="amount">-</td>
                <td class="amount">-</td>
                <td class="amount">${formatMoneySymbol(serviceCharge)}</td>
            </tr>`
        ].join('');

        const deductionRows = [
            `<tr>
                <td>SSS</td>
                <td class="amount">${formatMoneyOrDash(sss)}</td>
            </tr>`,
            `<tr>
                <td>PHILHEALTH</td>
                <td class="amount">${formatMoneyOrDash(philhealth)}</td>
            </tr>`,
            `<tr>
                <td>PAG-IBIG</td>
                <td class="amount">${formatMoneyOrDash(pagibig)}</td>
            </tr>`,
            `<tr>
                <td>OTHER</td>
                <td class="amount">${formatMoneyOrDash(otherDeductions)}</td>
            </tr>`
        ].join('');

        const printableMarkup = `
<div class="payslip">
  <div class="logo">
    <img src="${window.location.origin}/dlc-mainlogo.png" alt="D'Luca Bistro x Café Logo">
  </div>
  <div class="company-name">D'Luca Bistro x Café</div>

  <table class="header-table">
    <tr>
      <th>EMPLOYEE NAME</th>
      <th>JOB TITLE</th>
      <th>STATUS</th>
      <th>DATE (FROM)</th>
      <th>DATE (TO)</th>
      <th>PAY DATE</th>
    </tr>
    <tr>
      <td>${safeEmployee}</td>
      <td>${safePosition}</td>
      <td>Active</td>
      <td>${payPeriodStart}</td>
      <td>${payPeriodEnd}</td>
      <td>${payDateLabel}</td>
    </tr>
  </table>

  <div class="flex">
    <table class="earnings">
      <tr><th colspan="4" class="section-title">EARNINGS</th></tr>
      <tr>
        <th>WAGE TYPE</th>
        <th>HOURS</th>
        <th>RATE</th>
        <th>AMOUNT</th>
      </tr>
      ${earningsRows}
      <tr><td colspan="4" style="height:40px;"></td></tr>
    </table>

    <table class="deductions">
      <tr><th colspan="2" class="section-title">DEDUCTIONS</th></tr>
      <tr>
        <th>DEDUCTION TYPE</th>
        <th>AMOUNT</th>
      </tr>
      ${deductionRows}
      <tr><td colspan="2" style="height:40px;"></td></tr>
    </table>
  </div>

  <table class="totals">
    <tr>
      <td>EARNINGS TOTAL</td>
      <td>${formatMoneySymbol(earningsTotal)}</td>
    </tr>
    <tr>
      <td>DEDUCTIONS TOTAL</td>
      <td>${formatMoneySymbol(deductionTotal)}</td>
    </tr>
    <tr>
      <td>NET PAY TOTAL</td>
      <td>${formatMoneySymbol(netPay)}</td>
    </tr>
  </table>

  <div class="signatures">
    <div class="signature">
      <div class="line"></div>
      <span>Prepared By</span>
    </div>
    <div class="signature">
      <div class="line"></div>
      <span>Approved By</span>
    </div>
  </div>
</div>`;

        const styles = `
<style>
  :root {
    --primary: #0d334c;
    --accent: #2e4a62;
    --light: #f4f6f8;
    --border: #ccc;
    --text: #222;
    --red: #d32f2f;
    --font: "Segoe UI", Arial, sans-serif;
  }

  body {
    font-family: var(--font);
    background: #fff;
    color: var(--text);
    margin: 0;
    padding: 40px;
  }

  .payslip {
    max-width: 900px;
    margin: 0 auto;
  }

  .logo {
    text-align: center;
    margin-bottom: 10px;
  }

  .logo img {
    width: 90px;
    height: auto;
  }

  .company-name {
    text-align: center;
    font-weight: 600;
    font-size: 20px;
    margin-bottom: 25px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 15px;
  }

  th, td {
    border: 1px solid var(--border);
    padding: 8px 10px;
    font-size: 13px;
  }

  th {
    background: var(--primary);
    color: #fff;
    text-align: left;
  }

  .header-table td {
    background: var(--light);
  }

  .header-table th {
    text-align: center;
  }

  .section-title {
    background: var(--accent);
    color: #fff;
    text-transform: uppercase;
    font-size: 13px;
    padding: 6px 10px;
    font-weight: 600;
  }

  .earnings, .deductions {
    vertical-align: top;
    width: 49%;
  }

  .flex {
    display: flex;
    justify-content: space-between;
    gap: 2%;
  }

  .earnings th:nth-child(2),
  .earnings th:nth-child(3),
  .earnings th:nth-child(4),
  .deductions th:nth-child(2) {
    text-align: center;
  }

  .amount {
    text-align: right;
  }

  .red {
    color: var(--red);
    font-weight: 600;
  }

  .totals {
    width: 100%;
    margin-top: 10px;
  }

  .totals td {
    font-weight: 600;
  }

  .totals td:first-child {
    background: var(--accent);
    color: #fff;
    width: 70%;
  }

  .totals td:last-child {
    text-align: right;
  }

  .signatures {
    display: flex;
    justify-content: space-between;
    gap: 40px;
    margin-top: 60px;
  }

  .signature {
    width: 45%;
    text-align: center;
  }

  .signature .line {
    border-bottom: 1px solid var(--border);
    height: 48px;
    margin-bottom: 8px;
  }

  .signature span {
    font-size: 12px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--accent);
  }

  @media print {
    body { padding: 0; }
    .payslip { margin: 0; }
  }
</style>`;

        const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" />${styles}</head><body>${printableMarkup}</body></html>`;
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.setAttribute('aria-hidden', 'true');
        document.body.appendChild(iframe);

        const removeFrame = () => {
            if (iframe.parentNode) {
                iframe.parentNode.removeChild(iframe);
            }
        };

        const onFrameLoad = () => {
            const frameWindow = iframe.contentWindow;
            if (!frameWindow) {
                removeFrame();
                return;
            }
            frameWindow.focus();
            frameWindow.print();
            frameWindow.onafterprint = removeFrame;
        };

        iframe.onload = onFrameLoad;
        const frameDocument = iframe.contentWindow?.document;
        if (frameDocument) {
            frameDocument.open();
            frameDocument.write(html);
            frameDocument.close();
        }

        setTimeout(() => {
            const frameWindow = iframe.contentWindow;
            if (!frameWindow) {
                removeFrame();
                return;
            }
            if (frameWindow.document.readyState === 'complete') {
                onFrameLoad();
            }
        }, 80);

        setTimeout(removeFrame, 60000);
    };

    const DetailRow: React.FC<{
        label: string;
        value: string;
        subValue?: string;
        isBold?: boolean;
        isInput?: boolean;
        name?: string;
        inputValue?: number;
        onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    }> = ({ label, value, subValue, isBold, isInput, name, inputValue, onChange }) => (
        <div className="flex justify-between items-center py-2.5">
            <div>
                <span className="text-sm text-text-secondary">{label}</span>
                {subValue && <span className="block text-xs text-text-secondary/60">{subValue}</span>}
            </div>
            {isInput ? (
                <input
                    type="number"
                    name={name}
                    value={inputValue}
                    onChange={onChange}
                    className={`w-28 text-right bg-bg-primary border border-border-color rounded-lg p-1.5 text-sm font-medium ${isBold ? 'text-text-primary' : 'text-text-secondary'}`}
                />
            ) : (
                <span className={`text-sm text-right ${isBold ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}>{value}</span>
            )}
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-bg-secondary w-full max-w-lg rounded-2xl border border-border-color shadow-2xl flex flex-col animate-pop-in" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b border-border-color">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-semibold">Payslip</h2>
                            <p className="text-sm text-text-secondary">For period {formatDateForDisplay(payPeriod.start)} to {formatDateForDisplay(payPeriod.end)}</p>
                        </div>
                        <button onClick={onClose} className="p-2 -mt-2 -mr-2 rounded-full text-text-secondary hover:bg-hover-bg transition-colors no-print">
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="mt-4">
                        <p className="font-semibold text-lg">{record.employee}</p>
                        <p className="text-sm text-text-secondary">{record.position}</p>
                    </div>
                </div>
                <div className="p-6 max-h-[50vh] overflow-y-auto">
                    <div className="space-y-6">
                        <div>
                            <h3 className="font-semibold text-text-primary mb-2 border-b border-border-color pb-2">Pay Calculation</h3>
                            <DetailRow label="Period Earnings" value={formatPeso(record.regularPay ?? 0)} />
                            <DetailRow
                                label="Service Charge"
                                value=""
                                isInput
                                name="serviceCharge"
                                inputValue={serviceCharge}
                                onChange={handleServiceChargeChange}
                            />
                            <div className="border-t border-border-color mt-2">
                                <DetailRow label="Gross Pay" value={formatPeso(grossPay)} isBold />
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 bg-bg-tertiary p-4 rounded-xl">
                        <div className="flex justify-between items-center">
                            <span className="text-lg font-semibold">Net Pay</span>
                            <span className="text-lg font-bold text-accent-green">{formatPeso(netPay)}</span>
                        </div>
                    </div>
                    <div className="mt-6">
                        <h3 className="font-semibold text-text-primary mb-2 border-b border-border-color pb-2">Summary</h3>
                        <div className="grid grid-cols-3 text-center mt-4">
                            <div>
                                <div className="text-xl font-bold">{record.daysPresent}</div>
                                <div className="text-xs text-text-secondary">Present</div>
                            </div>
                            <div>
                                <div className="text-xl font-bold">{record.daysAbsent}</div>
                                <div className="text-xs text-text-secondary">Absent</div>
                            </div>
                            <div>
                                <div className="text-xl font-bold">{record.daysLate}</div>
                                <div className="text-xs text-text-secondary">Late</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-bg-tertiary/50 border-t border-border-color flex justify-end items-center gap-4 rounded-b-2xl no-print">
                    <div className="relative group flex items-center gap-2">
                        <button onClick={handlePrint} className="px-4 py-2 rounded-lg font-medium text-sm bg-bg-tertiary hover:bg-hover-bg transition flex items-center gap-2">
                            <PrinterIcon className="w-5 h-5" /> Print / Export
                        </button>
                    </div>
                    <button onClick={handleSave} className="px-4 py-2 rounded-lg font-semibold bg-accent-blue text-white hover:bg-opacity-80 transition">
                        Save & Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PayslipModal;

