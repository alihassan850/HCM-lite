const PDFDocument = require('pdfkit');

function generatePayslipPDF(payslipData, companySettings, stream) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(stream);

  const companyName = companySettings?.company_name || 'HCM Lite Enterprise';

  // Header
  doc.fillColor('#1e293b')
     .fontSize(22)
     .font('Helvetica-Bold')
     .text(companyName, 40, 40);

  doc.fontSize(10)
     .font('Helvetica')
     .fillColor('#64748b')
     .text('Human Capital Management System — Official Payslip', 40, 68);

  doc.strokeColor('#e2e8f0')
     .lineWidth(1)
     .moveTo(40, 85)
     .lineTo(555, 85)
     .stroke();

  // Title Box
  doc.rect(40, 95, 515, 32).fill('#f1f5f9');
  doc.fillColor('#0f172a')
     .fontSize(12)
     .font('Helvetica-Bold')
     .text(`PAYSLIP FOR PERIOD: ${payslipData.year_month}`, 55, 105);

  doc.fontSize(10)
     .font('Helvetica')
     .fillColor('#64748b')
     .text(`Generated on: ${new Date().toLocaleDateString()}`, 380, 105);

  // Employee Information Section
  doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('Employee Information', 40, 145);
  doc.rect(40, 160, 515, 65).strokeColor('#e2e8f0').stroke();

  doc.fontSize(10).font('Helvetica');
  doc.fillColor('#64748b').text('Employee Code:', 50, 170);
  doc.fillColor('#0f172a').font('Helvetica-Bold').text(payslipData.employee_code, 150, 170);

  doc.font('Helvetica').fillColor('#64748b').text('Employee Name:', 50, 188);
  doc.fillColor('#0f172a').font('Helvetica-Bold').text(`${payslipData.first_name} ${payslipData.last_name}`, 150, 188);

  doc.font('Helvetica').fillColor('#64748b').text('Email Address:', 50, 206);
  doc.fillColor('#0f172a').font('Helvetica').text(payslipData.email, 150, 206);

  doc.font('Helvetica').fillColor('#64748b').text('Department:', 320, 170);
  doc.fillColor('#0f172a').font('Helvetica-Bold').text(payslipData.department_name || 'N/A', 410, 170);

  doc.font('Helvetica').fillColor('#64748b').text('Designation:', 320, 188);
  doc.fillColor('#0f172a').font('Helvetica-Bold').text(payslipData.designation_title || 'N/A', 410, 188);

  doc.font('Helvetica').fillColor('#64748b').text('Joining Date:', 320, 206);
  doc.fillColor('#0f172a').font('Helvetica').text(payslipData.joining_date || 'N/A', 410, 206);

  // Attendance Metrics Section
  doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('Attendance Summary', 40, 240);
  doc.rect(40, 255, 515, 50).fill('#f8fafc');

  doc.fontSize(9).font('Helvetica');
  const attCols = [
    { label: 'Work Days', val: payslipData.working_days, x: 50 },
    { label: 'Present', val: payslipData.days_present, x: 130 },
    { label: 'Absent', val: payslipData.days_absent, x: 210 },
    { label: 'Half Days', val: payslipData.days_half, x: 290 },
    { label: 'Unpaid Leave', val: payslipData.days_unpaid_leave, x: 370 },
    { label: 'Late Count', val: payslipData.late_count, x: 460 },
  ];

  attCols.forEach(col => {
    doc.fillColor('#64748b').text(col.label, col.x, 265);
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(11).text(String(col.val ?? 0), col.x, 282);
    doc.font('Helvetica').fontSize(9);
  });

  // Salary Breakdown Table
  doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('Earnings & Deductions', 40, 320);

  // Table header
  doc.rect(40, 335, 250, 24).fill('#e2e8f0');
  doc.rect(305, 335, 250, 24).fill('#e2e8f0');

  doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(10);
  doc.text('Earnings Component', 50, 342);
  doc.text('Amount (PKR)', 210, 342);

  doc.text('Deduction Component', 315, 342);
  doc.text('Amount (PKR)', 475, 342);

  let curY = 365;
  const earnings = [
    { label: 'Basic Salary', val: payslipData.basic_salary },
    { label: 'House Rent Allowance (HRA 40%)', val: payslipData.hra },
    { label: 'Medical Allowance (10%)', val: payslipData.medical_allowance },
  ];

  const deductions = [
    { label: 'Attendance & Leave Deductions', val: payslipData.deductions },
    { label: 'Income Tax', val: payslipData.income_tax },
  ];

  const maxRows = Math.max(earnings.length, deductions.length);
  doc.font('Helvetica').fontSize(9);

  for (let i = 0; i < maxRows; i++) {
    const ern = earnings[i];
    const ded = deductions[i];

    if (ern) {
      doc.fillColor('#334155').text(ern.label, 50, curY);
      doc.fillColor('#0f172a').font('Helvetica-Bold').text(Number(ern.val).toLocaleString('en-US', { minimumFractionDigits: 2 }), 210, curY);
      doc.font('Helvetica');
    }

    if (ded) {
      doc.fillColor('#334155').text(ded.label, 315, curY);
      doc.fillColor('#dc2626').font('Helvetica-Bold').text(Number(ded.val).toLocaleString('en-US', { minimumFractionDigits: 2 }), 475, curY);
      doc.font('Helvetica');
    }

    curY += 20;
  }

  // Totals Line
  doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(40, curY + 5).lineTo(555, curY + 5).stroke();
  curY += 12;

  doc.font('Helvetica-Bold').fontSize(10);
  doc.fillColor('#0f172a').text('Total Gross Salary:', 50, curY);
  doc.text(Number(payslipData.gross_salary).toLocaleString('en-US', { minimumFractionDigits: 2 }), 210, curY);

  const totalDeductions = (payslipData.deductions || 0) + (payslipData.income_tax || 0);
  doc.text('Total Deductions:', 315, curY);
  doc.fillColor('#dc2626').text(Number(totalDeductions).toLocaleString('en-US', { minimumFractionDigits: 2 }), 475, curY);

  // Net Pay Highlight Box
  curY += 35;
  doc.rect(40, curY, 515, 45).fill('#ecfdf5');
  doc.rect(40, curY, 515, 45).strokeColor('#10b981').stroke();

  doc.fillColor('#065f46').font('Helvetica-Bold').fontSize(13);
  doc.text('NET TAKE-HOME SALARY:', 55, curY + 16);
  doc.fillColor('#047857').fontSize(16).text(`PKR ${Number(payslipData.net_salary).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 350, curY + 14);

  // Footer notes & signature
  doc.fontSize(8).font('Helvetica').fillColor('#94a3b8');
  doc.text('Note: This is a system-generated payslip computed under HCM Lite verified payroll rules.', 40, 720);
  doc.text('Confidential document. Unauthorized dissemination is strictly prohibited.', 40, 732);

  doc.strokeColor('#94a3b8').lineWidth(0.5).moveTo(400, 725).lineTo(540, 725).stroke();
  doc.text('Authorized HR Signatory', 420, 732);

  doc.end();
}

module.exports = {
  generatePayslipPDF
};
