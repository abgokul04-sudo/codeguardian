import jsPDF from 'jspdf';
import html2pdf from 'html2pdf.js';

export function generateReviewPDF({ result, language, code, explanationLanguage, execState, languageLabels, reportElement }) {
  // If reportElement is available in the DOM, use html2pdf for perfect Unicode/Font rendering across all languages
  if (reportElement) {
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `CodeGuardian-Review-Report-${Date.now()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    return html2pdf().set(opt).from(reportElement).save();
  }

  // Fallback vector PDF generation
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - (margin * 2);
  let y = 16;

  function checkPageBreak(neededHeight = 12) {
    if (y + neededHeight >= pageHeight - 16) {
      doc.addPage();
      y = 16;
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 140);
      doc.text('CodeGuardian - AI Code Review & Tutor Report', margin, 10);
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, 11, pageWidth - margin, 11);
      doc.setTextColor(30, 30, 30);
    }
  }

  // --- HEADER ---
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(margin, y, contentWidth, 24, 3, 3, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text('CodeGuardian - AI Code Review & Tutor Report', margin + 6, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  const langDisplay = (language || '').toUpperCase();
  const explDisplay = (languageLabels && languageLabels[explanationLanguage]) || explanationLanguage || 'English';
  doc.text(`Code Language: ${langDisplay}  |  Explanation: ${explDisplay}  |  Generated: ${new Date().toLocaleDateString()}`, margin + 6, y + 17);

  y += 30;

  // --- METRIC BADGES BAR ---
  const correctCount = (result.correct_parts || []).length;
  const errorsCount = (result.errors_found || []).length;
  const potentialCount = (result.potential_problems || []).length;
  const suggestionsCount = (result.suggestions || []).length;

  const boxWidth = (contentWidth - 9) / 4;
  const boxes = [
    { label: 'Correct Parts', val: correctCount, bg: [236, 253, 245], border: [167, 243, 208], text: [4, 120, 87] },
    { label: 'Errors Found', val: errorsCount, bg: [255, 241, 242], border: [254, 205, 211], text: [190, 18, 60] },
    { label: 'Potential Issues', val: potentialCount, bg: [255, 251, 235], border: [253, 230, 138], text: [180, 83, 9] },
    { label: 'Suggestions', val: suggestionsCount, bg: [238, 242, 255], border: [199, 210, 254], text: [67, 56, 202] }
  ];

  boxes.forEach((b, idx) => {
    const bx = margin + idx * (boxWidth + 3);
    doc.setFillColor(b.bg[0], b.bg[1], b.bg[2]);
    doc.setDrawColor(b.border[0], b.border[1], b.border[2]);
    doc.roundedRect(bx, y, boxWidth, 14, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(b.label, bx + 3, y + 5);

    doc.setFontSize(12);
    doc.setTextColor(b.text[0], b.text[1], b.text[2]);
    doc.text(String(b.val), bx + 3, y + 11.5);
  });

  y += 20;

  // --- SECTION 1: ERRORS & ISSUES FOUND ---
  checkPageBreak(15);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Errors & Issues Found', margin, y);
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y + 2, pageWidth - margin, y + 2);
  y += 7;

  if (errorsCount === 0 && potentialCount === 0) {
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(margin, y, contentWidth, 10, 2, 2, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(22, 101, 52);
    doc.text('No errors or bugs detected in this code. Clean and well structured!', margin + 4, y + 6.5);
    y += 14;
  } else {
    (result.errors_found || []).forEach((err, i) => {
      checkPageBreak(25);
      doc.setFillColor(255, 241, 242);
      doc.setDrawColor(254, 205, 211);
      
      const probLines = doc.splitTextToSize(`Problem: ${err.problem || ''}`, contentWidth - 8);
      const whyLines = doc.splitTextToSize(`Why it happens: ${err.why_it_happens || ''}`, contentWidth - 8);
      const fixLines = doc.splitTextToSize(`Suggested Fix: ${err.suggested_fix || ''}`, contentWidth - 8);
      const cardHeight = 8 + (probLines.length + whyLines.length + fixLines.length) * 4;

      doc.roundedRect(margin, y, contentWidth, cardHeight, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(190, 18, 60);
      doc.text(`Issue #${i + 1} (Line ${err.line || 'General'})`, margin + 4, y + 5);

      let lineY = y + 9.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);

      probLines.forEach(l => { doc.text(l, margin + 4, lineY); lineY += 4; });
      whyLines.forEach(l => { doc.text(l, margin + 4, lineY); lineY += 4; });
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(4, 120, 87);
      fixLines.forEach(l => { doc.text(l, margin + 4, lineY); lineY += 4; });

      y += cardHeight + 4;
    });

    (result.potential_problems || []).forEach((prob, i) => {
      checkPageBreak(18);
      doc.setFillColor(255, 251, 235);
      doc.setDrawColor(253, 230, 138);
      
      const probLines = doc.splitTextToSize(`Warning: ${prob.problem || ''}`, contentWidth - 8);
      const fixLines = doc.splitTextToSize(`Recommendation: ${prob.suggested_fix || ''}`, contentWidth - 8);
      const cardHeight = 8 + (probLines.length + fixLines.length) * 4;

      doc.roundedRect(margin, y, contentWidth, cardHeight, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(180, 83, 9);
      doc.text(`Potential Problem #${i + 1} (Line ${prob.line || 'General'})`, margin + 4, y + 5);

      let lineY = y + 9.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      probLines.forEach(l => { doc.text(l, margin + 4, lineY); lineY += 4; });
      fixLines.forEach(l => { doc.text(l, margin + 4, lineY); lineY += 4; });

      y += cardHeight + 4;
    });
  }

  // --- SECTION 2: WHAT WAS IMPLEMENTED ---
  checkPageBreak(18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('2. What Was Implemented', margin, y);
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y + 2, pageWidth - margin, y + 2);
  y += 7;

  if (result.implemented_fixes && result.implemented_fixes.length > 0) {
    result.implemented_fixes.forEach(fix => {
      checkPageBreak(10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(29, 78, 216);
      doc.text(`• Line ${fix.line}:`, margin + 2, y + 3.5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      const fixDesc = doc.splitTextToSize(fix.fix_description || '', contentWidth - 26);
      doc.text(fixDesc, margin + 22, y + 3.5);
      y += Math.max(7, fixDesc.length * 4.5);
    });
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('No modifications were required. Original logic intact.', margin + 2, y + 3.5);
    y += 7;
  }

  y += 4;

  // --- SECTION 3: EXECUTION RESULT ---
  checkPageBreak(25);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('3. Execution Result', margin, y);
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y + 2, pageWidth - margin, y + 2);
  y += 7;

  const execStatus = execState?.status || 'Executed';
  const execOutput = execState?.output || execState?.simulated_output || (execState?.error ? '' : 'Program executed successfully.');
  const execErr = execState?.error || '';

  const outLines = doc.splitTextToSize(execOutput, contentWidth - 8);
  const errLines = execErr ? doc.splitTextToSize(execErr, contentWidth - 8) : [];
  const termHeight = 10 + (outLines.length + errLines.length) * 4;

  doc.setFillColor(15, 23, 42);
  doc.roundedRect(margin, y, contentWidth, termHeight, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Status: ${execStatus}`, margin + 4, y + 6);

  let termY = y + 11;
  if (outLines.length > 0) {
    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(52, 211, 153);
    outLines.forEach(l => { doc.text(l, margin + 4, termY); termY += 4; });
  }

  if (errLines.length > 0) {
    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(251, 113, 133);
    errLines.forEach(l => { doc.text(l, margin + 4, termY); termY += 4; });
  }

  y += termHeight + 6;

  // --- SECTION 4: IMPROVED CODE ---
  checkPageBreak(30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('4. Improved Code (Minimal Changes Only)', margin, y);
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y + 2, pageWidth - margin, y + 2);
  y += 7;

  const codeText = result.improved_code || code || '';
  const codeLines = doc.splitTextToSize(codeText, contentWidth - 8);
  const codeBoxHeight = Math.min(60, 6 + codeLines.length * 3.8);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, codeBoxHeight, 2, 2, 'FD');

  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  
  let codeY = y + 5;
  codeLines.slice(0, 14).forEach(l => {
    doc.text(l, margin + 4, codeY);
    codeY += 3.8;
  });

  if (codeLines.length > 14) {
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139);
    doc.text('... (full code available in the application)', margin + 4, codeY);
  }

  y += codeBoxHeight + 6;

  // --- SECTION 5: STEP-BY-STEP FLOWCHART & WALKTHROUGH ---
  if (result.walkthrough && result.walkthrough.length > 0) {
    checkPageBreak(25);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('5. Visual Flowchart & Step-by-Step Execution', margin, y);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + 2, pageWidth - margin, y + 2);
    y += 7;

    result.walkthrough.forEach((step, idx) => {
      checkPageBreak(22);
      doc.setFillColor(250, 245, 255); // purple-50
      doc.setDrawColor(233, 213, 255); // purple-200
      
      const explLines = doc.splitTextToSize(step.explanation || '', contentWidth - 8);
      const stepBoxHeight = 12 + (step.code_snippet ? 5 : 0) + (step.condition ? 4 : 0) + explLines.length * 4;

      doc.roundedRect(margin, y, contentWidth, stepBoxHeight, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(126, 34, 206);
      doc.text(`Step ${step.step_number || idx + 1}: ${step.phase || 'Process'}`, margin + 4, y + 5);

      if (step.state_changes) {
        doc.setFont('courier', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(88, 28, 135);
        doc.text(`State: ${step.state_changes}`, pageWidth - margin - 5, y + 5, { align: 'right' });
      }

      let stepY = y + 9.5;
      if (step.code_snippet) {
        doc.setFont('courier', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);
        doc.text(`Code: ${step.code_snippet}`, margin + 4, stepY);
        stepY += 4.5;
      }

      if (step.condition) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(180, 83, 9);
        doc.text(`Check Condition: ${step.condition} -> Next: ${step.next_step || 'Proceeds'}`, margin + 4, stepY);
        stepY += 4;
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      explLines.forEach(l => { doc.text(l, margin + 4, stepY); stepY += 4; });

      y += stepBoxHeight + 3.5;
    });
  }

  // --- FOOTER ---
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${totalPages} | CodeGuardian AI Tutor`, pageWidth / 2, pageHeight - 8, { align: 'center' });
  }

  // Download PDF
  doc.save(`CodeGuardian-Review-Report-${Date.now()}.pdf`);
}
