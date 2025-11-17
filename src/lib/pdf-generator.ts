import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, yPosition);
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

  // Detailed Violation Records
  if (data.violations.length > 0) {
    // Add a new page for detailed records
    doc.addPage();
    yPosition = 20;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Detailed Violation Records', 14, yPosition);
    yPosition += 8;

    const detailedData = data.violations.slice(0, 100).map(violation => {
      const missing = Array.isArray(violation.ppeMissing)
        ? violation.ppeMissing
        : JSON.parse(violation.ppeMissing);
      const timestamp = new Date(violation.detectionTimestamp).toLocaleString();

      return [
        timestamp,
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

    if (data.violations.length > 100) {
      yPosition = (doc as any).lastAutoTable.finalY + 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text(
        `* Showing first 100 of ${data.violations.length} total violations`,
        14,
        yPosition
      );
    }
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

    const zoneIntrusionData = data.zoneIntrusions.slice(0, 100).map(intrusion => {
      // Extract person name and zone from description
      // Expected format: "PersonName detected in ZoneName"
      const descParts = intrusion.description.split(' detected in ');
      const personName = descParts[0] || 'Unknown';
      const zoneName = descParts[1] || intrusion.location || 'Unknown Zone';
      const timestamp = new Date(intrusion.createdAt).toLocaleString();

      return [
        timestamp,
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

    if (data.zoneIntrusions.length > 100) {
      yPosition = (doc as any).lastAutoTable.finalY + 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text(
        `* Showing first 100 of ${data.zoneIntrusions.length} total zone intrusions`,
        14,
        yPosition
      );
    }

    // Add warning if zone intrusion data is limited
    if (data.isZoneIntrusionsLimited) {
      yPosition = (doc as any).lastAutoTable.finalY + 8;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(231, 76, 60);
      doc.text(
        `⚠ Note: Report limited to ${data.zoneIntrusions.length} most recent zone intrusions out of ${data.zoneIntrusionsTotalCount} total.`,
        14,
        yPosition
      );
      doc.setTextColor(0);
    }
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

  // Save the PDF
  const fileName = `Safety_Violations_Report_${site.code}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};
