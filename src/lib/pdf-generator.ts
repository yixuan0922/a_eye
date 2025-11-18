import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatSingaporeTimestamp } from './time-utils';

interface PPEViolationReportData {
  violations: any[];
  todayViolations: any[];
  monthViolations: any[];
  violationsByPerson: Array<{
    personName: string;
    violations: any[];
    totalViolations: number;
    todayViolations: number;
    monthViolations: number;
    missingItems: string[];
  }>;
  missingItemsCount: Record<string, number>;
  totalCount: number;
  isLimited: boolean;
  zoneIntrusions: any[];
  todayZoneIntrusions: any[];
  monthZoneIntrusions: any[];
  zoneIntrusionsTotalCount: number;
  isZoneIntrusionsLimited: boolean;
  attendance: Array<{
    name: string;
    daysPresent: number;
  }>;
  todayAttendanceCount: number;
  totalAttendanceRecords: number;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
}

interface Site {
  name: string;
  location: string;
  code: string;
}

export const generatePPEViolationReport = (data: PPEViolationReportData, site: Site) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Helper function to add a new page if needed
  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - 20) {
      doc.addPage();
      yPosition = 20;
      return true;
    }
    return false;
  };

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Safety Violations Report', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  // Site Information
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Site: ${site.name}`, 14, yPosition);
  yPosition += 6;
  doc.text(`Location: ${site.location}`, 14, yPosition);
  yPosition += 6;
  doc.text(`Site Code: ${site.code}`, 14, yPosition);
  yPosition += 6;

  // Date Range
  const startDateStr = data.dateRange.startDate.toLocaleDateString();
  const endDateStr = data.dateRange.endDate.toLocaleDateString();
  doc.text(`Report Period: ${startDateStr} - ${endDateStr}`, 14, yPosition);
  yPosition += 6;

  // Format generation timestamp using Singapore timezone
  const generatedTime = new Date();
  const year = generatedTime.getFullYear();
  const month = String(generatedTime.getMonth() + 1).padStart(2, '0');
  const day = String(generatedTime.getDate()).padStart(2, '0');
  const hours = String(generatedTime.getHours()).padStart(2, '0');
  const minutes = String(generatedTime.getMinutes()).padStart(2, '0');
  const seconds = String(generatedTime.getSeconds()).padStart(2, '0');
  const generatedTimeStr = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  doc.text(`Generated: ${generatedTimeStr}`, 14, yPosition);
  yPosition += 12;

  // Executive Summary
  checkPageBreak(40);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', 14, yPosition);
  yPosition += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const summaryData = [
    ['Total PPE Violations (Period)', data.totalCount.toString()],
    ['PPE Violations Analyzed', data.violations.length.toString()],
    ['Total Zone Intrusions (Period)', data.zoneIntrusionsTotalCount.toString()],
    ['Zone Intrusions Analyzed', data.zoneIntrusions.length.toString()],
    ['Today\'s PPE Violations', data.todayViolations.length.toString()],
    ['Today\'s Zone Intrusions', data.todayZoneIntrusions.length.toString()],
    ['This Month\'s PPE Violations', data.monthViolations.length.toString()],
    ['This Month\'s Zone Intrusions', data.monthZoneIntrusions.length.toString()],
    ['Personnel with PPE Violations', data.violationsByPerson.length.toString()],
    ['Today\'s Attendance', data.todayAttendanceCount.toString()],
    ['Total Attendance Records', data.totalAttendanceRecords.toString()],
    ['Unique Personnel Tracked', data.attendance.length.toString()],
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [['Metric', 'Count']],
    body: summaryData,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 10 },
    margin: { left: 14, right: 14 },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 8;

  // Add warning if data is limited
  if (data.isLimited) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(231, 76, 60); // Red color
    doc.text(
      `⚠ Note: Report limited to ${data.violations.length} most recent violations out of ${data.totalCount} total violations for performance.`,
      14,
      yPosition
    );
    yPosition += 6;
    doc.setTextColor(0); // Reset to black
  }

  yPosition += 6;

  // Most Frequently Missing PPE Items
  checkPageBreak(60);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Most Frequently Missing PPE Items', 14, yPosition);
  yPosition += 8;

  const missingItemsData = Object.entries(data.missingItemsCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([item, count]) => [item, count.toString()]);

  if (missingItemsData.length > 0) {
    autoTable(doc, {
      startY: yPosition,
      head: [['PPE Item', 'Times Missing']],
      body: missingItemsData,
      theme: 'striped',
      headStyles: { fillColor: [231, 76, 60], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10 },
      margin: { left: 14, right: 14 },
    });
    yPosition = (doc as any).lastAutoTable.finalY + 12;
  } else {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'italic');
    doc.text('No missing PPE items recorded.', 14, yPosition);
    yPosition += 12;
  }

  // Personnel Violation Summary - Daily Dashboard
  if (data.violationsByPerson.length > 0) {
    checkPageBreak(60);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Daily Violation Dashboard', 14, yPosition);
    yPosition += 8;

    const todayPersonnelData = data.violationsByPerson
      .filter(p => p.todayViolations > 0)
      .sort((a, b) => b.todayViolations - a.todayViolations)
      .map(person => [
        person.personName,
        person.todayViolations.toString(),
        person.missingItems.join(', '),
      ]);

    if (todayPersonnelData.length > 0) {
      autoTable(doc, {
        startY: yPosition,
        head: [['Personnel Name', 'Today\'s Violations', 'Missing Items']],
        body: todayPersonnelData,
        theme: 'striped',
        headStyles: { fillColor: [230, 126, 34], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 35, halign: 'center' },
          2: { cellWidth: 'auto' },
        },
        margin: { left: 14, right: 14 },
      });
      yPosition = (doc as any).lastAutoTable.finalY + 12;
    } else {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'italic');
      doc.text('No violations recorded today.', 14, yPosition);
      yPosition += 12;
    }

    // Personnel Violation Summary - Monthly Dashboard
    checkPageBreak(60);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Monthly Violation Dashboard', 14, yPosition);
    yPosition += 8;

    const monthPersonnelData = data.violationsByPerson
      .filter(p => p.monthViolations > 0)
      .sort((a, b) => b.monthViolations - a.monthViolations)
      .map(person => [
        person.personName,
        person.monthViolations.toString(),
        person.missingItems.join(', '),
      ]);

    if (monthPersonnelData.length > 0) {
      autoTable(doc, {
        startY: yPosition,
        head: [['Personnel Name', 'This Month\'s Violations', 'Missing Items']],
        body: monthPersonnelData,
        theme: 'striped',
        headStyles: { fillColor: [52, 152, 219], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 35, halign: 'center' },
          2: { cellWidth: 'auto' },
        },
        margin: { left: 14, right: 14 },
      });
      yPosition = (doc as any).lastAutoTable.finalY + 12;
    }
  }

  // Attendance Summary
  if (data.attendance.length > 0) {
    checkPageBreak(60);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Attendance Summary', 14, yPosition);
    yPosition += 8;

    const attendanceData = data.attendance.slice(0, 50).map(person => [
      person.name,
      person.daysPresent.toString(),
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Personnel Name', 'Days Present']],
      body: attendanceData,
      theme: 'striped',
      headStyles: { fillColor: [46, 204, 113], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 40, halign: 'center' },
      },
      margin: { left: 14, right: 14 },
    });
    yPosition = (doc as any).lastAutoTable.finalY + 12;

    if (data.attendance.length > 50) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.text(
        `Note: Showing top 50 personnel. Total: ${data.attendance.length} personnel tracked.`,
        14,
        yPosition
      );
      yPosition += 8;
    }
  }

  // Detailed Violation Records
  if (data.violations.length > 0) {
    // Add a new page for detailed records
    doc.addPage();
    yPosition = 20;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Detailed Violation Records', 14, yPosition);
    yPosition += 8;

    const detailedData = data.violations.map(violation => {
      const missing = Array.isArray(violation.ppeMissing)
        ? violation.ppeMissing
        : JSON.parse(violation.ppeMissing);

      // Format timestamp using Singapore timezone (same as Telegram notifications)
      const formattedTime = formatSingaporeTimestamp(violation.detectionTimestamp);

      return [
        formattedTime,
        violation.personName,
        missing.join(', '),
        violation.camera?.name || 'N/A',
        violation.severity.toUpperCase(),
      ];
    });

    autoTable(doc, {
      startY: yPosition,
      head: [['Time', 'Personnel', 'Missing PPE', 'Camera', 'Severity']],
      body: detailedData,
      theme: 'grid',
      headStyles: { fillColor: [44, 62, 80], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 35 },
        2: { cellWidth: 50 },
        3: { cellWidth: 35 },
        4: { cellWidth: 25, halign: 'center' },
      },
      margin: { left: 14, right: 14 },
      didDrawCell: (data) => {
        // Highlight high severity violations
        if (data.column.index === 4 && data.cell.text[0] === 'HIGH') {
          doc.setFillColor(231, 76, 60);
        }
      },
    });
  }

  // Detailed Zone Intrusion Records
  if (data.zoneIntrusions.length > 0) {
    // Add a new page for zone intrusion records
    doc.addPage();
    yPosition = 20;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Detailed Zone Intrusion Records', 14, yPosition);
    yPosition += 8;

    const zoneIntrusionData = data.zoneIntrusions.map(intrusion => {
      // Extract person name and zone from description
      // Expected format: "PersonName detected in ZoneName"
      const descParts = intrusion.description.split(' detected in ');
      const personName = descParts[0] || 'Unknown';
      const zoneName = descParts[1] || intrusion.location || 'Unknown Zone';

      // Format timestamp using Singapore timezone (same as Telegram notifications)
      const formattedTime = formatSingaporeTimestamp(intrusion.createdAt);

      return [
        formattedTime,
        personName,
        zoneName,
        intrusion.camera?.name || intrusion.location || 'N/A',
        intrusion.severity.toUpperCase(),
      ];
    });

    autoTable(doc, {
      startY: yPosition,
      head: [['Time', 'Person', 'Restricted Zone', 'Location/Camera', 'Severity']],
      body: zoneIntrusionData,
      theme: 'grid',
      headStyles: { fillColor: [156, 39, 176], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 35 },
        2: { cellWidth: 40 },
        3: { cellWidth: 40 },
        4: { cellWidth: 25, halign: 'center' },
      },
      margin: { left: 14, right: 14 },
      didDrawCell: (data) => {
        // Highlight high severity intrusions
        if (data.column.index === 4 && data.cell.text[0] === 'HIGH') {
          doc.setFillColor(231, 76, 60);
        }
      },
    });
  }

  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(128);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    doc.text(
      `A-Eye Safety Management System`,
      14,
      pageHeight - 10
    );
  }

  // Open PDF in new tab for preview instead of auto-downloading
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');

  // Optional: Clean up the URL after a delay
  setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);
};

// Export a version that returns the blob for modal preview
export const generatePPEViolationReportBlob = (data: PPEViolationReportData, site: Site): Blob => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Helper function to add a new page if needed
  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - 20) {
      doc.addPage();
      yPosition = 20;
      return true;
    }
    return false;
  };

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Safety Violations Report', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  // Site Information
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Site: ${site.name}`, 14, yPosition);
  yPosition += 6;
  doc.text(`Location: ${site.location}`, 14, yPosition);
  yPosition += 6;
  doc.text(`Site Code: ${site.code}`, 14, yPosition);
  yPosition += 6;

  // Date Range
  const startDateStr = data.dateRange.startDate.toLocaleDateString();
  const endDateStr = data.dateRange.endDate.toLocaleDateString();
  doc.text(`Report Period: ${startDateStr} - ${endDateStr}`, 14, yPosition);
  yPosition += 6;

  // Format generation timestamp using Singapore timezone
  const generatedTime = new Date();
  const year = generatedTime.getFullYear();
  const month = String(generatedTime.getMonth() + 1).padStart(2, '0');
  const day = String(generatedTime.getDate()).padStart(2, '0');
  const hours = String(generatedTime.getHours()).padStart(2, '0');
  const minutes = String(generatedTime.getMinutes()).padStart(2, '0');
  const seconds = String(generatedTime.getSeconds()).padStart(2, '0');
  const generatedTimeStr = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  doc.text(`Generated: ${generatedTimeStr}`, 14, yPosition);
  yPosition += 12;

  // Executive Summary
  checkPageBreak(40);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', 14, yPosition);
  yPosition += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const summaryData = [
    ['Total PPE Violations (Period)', data.totalCount.toString()],
    ['PPE Violations Analyzed', data.violations.length.toString()],
    ['Total Zone Intrusions (Period)', data.zoneIntrusionsTotalCount.toString()],
    ['Zone Intrusions Analyzed', data.zoneIntrusions.length.toString()],
    ['Today\'s PPE Violations', data.todayViolations.length.toString()],
    ['Today\'s Zone Intrusions', data.todayZoneIntrusions.length.toString()],
    ['This Month\'s PPE Violations', data.monthViolations.length.toString()],
    ['This Month\'s Zone Intrusions', data.monthZoneIntrusions.length.toString()],
    ['Personnel with PPE Violations', data.violationsByPerson.length.toString()],
    ['Today\'s Attendance', data.todayAttendanceCount.toString()],
    ['Total Attendance Records', data.totalAttendanceRecords.toString()],
    ['Unique Personnel Tracked', data.attendance.length.toString()],
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [['Metric', 'Count']],
    body: summaryData,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 10 },
    margin: { left: 14, right: 14 },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 8;

  // Add warning if data is limited
  if (data.isLimited) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(231, 76, 60); // Red color
    doc.text(
      `⚠ Note: Report limited to ${data.violations.length} most recent violations out of ${data.totalCount} total violations for performance.`,
      14,
      yPosition
    );
    yPosition += 6;
    doc.setTextColor(0); // Reset to black
  }

  yPosition += 6;

  // Most Frequently Missing PPE Items
  checkPageBreak(60);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Most Frequently Missing PPE Items', 14, yPosition);
  yPosition += 8;

  const missingItemsData = Object.entries(data.missingItemsCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([item, count]) => [item, count.toString()]);

  if (missingItemsData.length > 0) {
    autoTable(doc, {
      startY: yPosition,
      head: [['PPE Item', 'Times Missing']],
      body: missingItemsData,
      theme: 'striped',
      headStyles: { fillColor: [231, 76, 60], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10 },
      margin: { left: 14, right: 14 },
    });
    yPosition = (doc as any).lastAutoTable.finalY + 12;
  } else {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'italic');
    doc.text('No missing PPE items recorded.', 14, yPosition);
    yPosition += 12;
  }

  // Personnel Violation Summary - Daily Dashboard
  if (data.violationsByPerson.length > 0) {
    checkPageBreak(60);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Daily Violation Dashboard', 14, yPosition);
    yPosition += 8;

    const todayPersonnelData = data.violationsByPerson
      .filter(p => p.todayViolations > 0)
      .sort((a, b) => b.todayViolations - a.todayViolations)
      .map(person => [
        person.personName,
        person.todayViolations.toString(),
        person.missingItems.join(', '),
      ]);

    if (todayPersonnelData.length > 0) {
      autoTable(doc, {
        startY: yPosition,
        head: [['Personnel Name', 'Today\'s Violations', 'Missing Items']],
        body: todayPersonnelData,
        theme: 'striped',
        headStyles: { fillColor: [230, 126, 34], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 35, halign: 'center' },
          2: { cellWidth: 'auto' },
        },
        margin: { left: 14, right: 14 },
      });
      yPosition = (doc as any).lastAutoTable.finalY + 12;
    } else {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'italic');
      doc.text('No violations recorded today.', 14, yPosition);
      yPosition += 12;
    }

    // Personnel Violation Summary - Monthly Dashboard
    checkPageBreak(60);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Monthly Violation Dashboard', 14, yPosition);
    yPosition += 8;

    const monthPersonnelData = data.violationsByPerson
      .filter(p => p.monthViolations > 0)
      .sort((a, b) => b.monthViolations - a.monthViolations)
      .map(person => [
        person.personName,
        person.monthViolations.toString(),
        person.missingItems.join(', '),
      ]);

    if (monthPersonnelData.length > 0) {
      autoTable(doc, {
        startY: yPosition,
        head: [['Personnel Name', 'This Month\'s Violations', 'Missing Items']],
        body: monthPersonnelData,
        theme: 'striped',
        headStyles: { fillColor: [52, 152, 219], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 35, halign: 'center' },
          2: { cellWidth: 'auto' },
        },
        margin: { left: 14, right: 14 },
      });
      yPosition = (doc as any).lastAutoTable.finalY + 12;
    }
  }

  // Attendance Summary
  if (data.attendance.length > 0) {
    checkPageBreak(60);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Attendance Summary', 14, yPosition);
    yPosition += 8;

    const attendanceData = data.attendance.slice(0, 50).map(person => [
      person.name,
      person.daysPresent.toString(),
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Personnel Name', 'Days Present']],
      body: attendanceData,
      theme: 'striped',
      headStyles: { fillColor: [46, 204, 113], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 40, halign: 'center' },
      },
      margin: { left: 14, right: 14 },
    });
    yPosition = (doc as any).lastAutoTable.finalY + 12;

    if (data.attendance.length > 50) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.text(
        `Note: Showing top 50 personnel. Total: ${data.attendance.length} personnel tracked.`,
        14,
        yPosition
      );
      yPosition += 8;
    }
  }

  // Detailed Violation Records
  if (data.violations.length > 0) {
    doc.addPage();
    yPosition = 20;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Detailed Violation Records', 14, yPosition);
    yPosition += 8;

    const detailedData = data.violations.map(violation => {
      const missing = Array.isArray(violation.ppeMissing)
        ? violation.ppeMissing
        : JSON.parse(violation.ppeMissing);

      const formattedTime = formatSingaporeTimestamp(violation.detectionTimestamp);

      return [
        formattedTime,
        violation.personName,
        missing.join(', '),
        violation.camera?.name || 'N/A',
        violation.severity.toUpperCase(),
      ];
    });

    autoTable(doc, {
      startY: yPosition,
      head: [['Time', 'Personnel', 'Missing PPE', 'Camera', 'Severity']],
      body: detailedData,
      theme: 'grid',
      headStyles: { fillColor: [44, 62, 80], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 35 },
        2: { cellWidth: 50 },
        3: { cellWidth: 35 },
        4: { cellWidth: 25, halign: 'center' },
      },
      margin: { left: 14, right: 14 },
      didDrawCell: (data) => {
        if (data.column.index === 4 && data.cell.text[0] === 'HIGH') {
          doc.setFillColor(231, 76, 60);
        }
      },
    });
  }

  // Detailed Zone Intrusion Records
  if (data.zoneIntrusions.length > 0) {
    doc.addPage();
    yPosition = 20;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Detailed Zone Intrusion Records', 14, yPosition);
    yPosition += 8;

    const zoneIntrusionData = data.zoneIntrusions.map(intrusion => {
      const descParts = intrusion.description.split(' detected in ');
      const personName = descParts[0] || 'Unknown';
      const zoneName = descParts[1] || intrusion.location || 'Unknown Zone';

      const formattedTime = formatSingaporeTimestamp(intrusion.createdAt);

      return [
        formattedTime,
        personName,
        zoneName,
        intrusion.camera?.name || intrusion.location || 'N/A',
        intrusion.severity.toUpperCase(),
      ];
    });

    autoTable(doc, {
      startY: yPosition,
      head: [['Time', 'Person', 'Restricted Zone', 'Location/Camera', 'Severity']],
      body: zoneIntrusionData,
      theme: 'grid',
      headStyles: { fillColor: [156, 39, 176], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 35 },
        2: { cellWidth: 40 },
        3: { cellWidth: 40 },
        4: { cellWidth: 25, halign: 'center' },
      },
      margin: { left: 14, right: 14 },
      didDrawCell: (data) => {
        if (data.column.index === 4 && data.cell.text[0] === 'HIGH') {
          doc.setFillColor(231, 76, 60);
        }
      },
    });
  }

  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(128);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    doc.text(
      `A-Eye Safety Management System`,
      14,
      pageHeight - 10
    );
  }

  // Return the blob instead of saving
  return doc.output('blob');
};
