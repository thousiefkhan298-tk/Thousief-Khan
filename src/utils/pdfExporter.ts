import { format } from 'date-fns';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase.js';
import { User } from '../types.js';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportClientToPDF = (
  client: User,
  healthAssessment: any | null,
  recentLogs: any[],
  workoutPlans: any[],
  dietPlans: any[],
  attendance: any[],
  paymentRecords: any[],
  healthDoc: any,
  fitnessDoc: any
) => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const primaryColor: [number, number, number] = [220, 0, 0]; // brand red
    const darkColor: [number, number, number] = [20, 20, 20];
    const grayColor: [number, number, number] = [100, 100, 100];
    const lightBg: [number, number, number] = [248, 248, 248];

    // Helper to draw clean header on single page
    const drawPageHeader = () => {
      // Top accent line
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 4, 'F');

      // Title & Logo
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('SPEED FIT', 12, 13);

      // Subtitle
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
      doc.text(`EMS FITNESS DOSSIER & COMPREHENSIVE PERFORMANCE MAP`, 12, 17);

      // Meta date/status (Right aligned)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text(`GENERATED: ${format(new Date(), 'yyyy-MM-dd')} UTC`, 198, 11, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.text(`LEDGER STATEMENT STATUS: ACTIVE`, 198, 15, { align: 'right' });

      // Horizontal separator line
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.line(12, 19, 198, 19);
    };

    // Helper to draw section headers
    const drawSectionTitle = (title: string, yPos: number): number => {
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(12, yPos, 2.5, 4, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text(title.toUpperCase(), 16, yPos + 3.2);
      return yPos + 6;
    };

    // Calculate metadata ratios
    const presentCount = attendance.filter(a => a.status === 'Present').length;
    const leaveCount = attendance.filter(a => a.status === 'Missed' || a.status === 'Absent').length;
    const totalAttendance = attendance.length;
    const attendancePct = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 100;

    const latestWorkoutPlan = workoutPlans?.[0];
    const latestDietPlan = dietPlans?.[0];

    const circ = fitnessDoc?.circumference || {};
    const bodyFat = fitnessDoc?.bodyFat || {};
    const bodyTests = fitnessDoc?.physicalTests || {};

    const cleanVal = (val: any) => {
      if (val === undefined || val === null || val === '') return '—';
      return val;
    };

    // --- DRAW SINGLE PAGE DOSSIER ---
    drawPageHeader();

    // Section 1: Demographics & Dashboard Vitals (Consolidated into a very clean compact grid to save vertical height)
    let currentY = drawSectionTitle('Client Profile & Demographic Vitals', 22);

    autoTable(doc, {
      startY: currentY,
      head: [['CLIENT INTRODUCTORY PROFILE', 'PHYSIOLOGICAL KEY INFRASTRUCTURE', 'ATTENDANCE & PROFILE TIERS']],
      body: [[
        `Name: ${cleanVal(client.name)}\nEmail: ${cleanVal(client.email)}`,
        `Current Weight: ${cleanVal(healthAssessment?.weight)} kg\nTarget Target: ${cleanVal(healthAssessment?.targetWeight)} kg`,
        `Attendance: ${attendancePct}% (${presentCount}P / ${leaveCount}L)\nAccess: ${cleanVal(client.role).toUpperCase()}`
      ]],
      theme: 'grid',
      styles: { cellPadding: 2, fontSize: 7, textColor: darkColor },
      headStyles: { fillColor: darkColor, textColor: [255, 255, 255], fontSize: 6.8, fontStyle: 'bold', cellPadding: 1.5 },
      margin: { left: 12, right: 12 },
      tableWidth: 186
    });

    currentY = (doc as any).lastAutoTable.finalY + 4;

    // Section 2: Physiological Tape & Skinfold Measures (Side-By-Side Tables, micro-padding)
    currentY = drawSectionTitle('Physiological Metrics & Anthropometric Assessment', currentY);

    autoTable(doc, {
      startY: currentY,
      head: [['TAPE MEASURES', 'VALUE']],
      body: [
        ['Neck / Shoulders', `${cleanVal(circ.neck)} / ${cleanVal(circ.shoulders)} cm`],
        ['Chest / Waist / Hips', `${cleanVal(circ.chest)} / ${cleanVal(circ.waist)} / ${cleanVal(circ.hips)} cm`],
        ['Thigh R / L', `${cleanVal(circ.rightThigh)} / ${cleanVal(circ.leftThigh)} cm`],
        ['Upper Arm R / L', `${cleanVal(circ.rightUpperArm)} / ${cleanVal(circ.leftUpperArm)} cm`]
      ],
      theme: 'striped',
      headStyles: { fillColor: darkColor, textColor: [255, 255, 255], fontSize: 6.5, fontStyle: 'bold', cellPadding: 1.2 },
      bodyStyles: { fontSize: 6.8, textColor: darkColor, cellPadding: 1.2 },
      margin: { left: 12 },
      tableWidth: 90
    });

    autoTable(doc, {
      startY: currentY,
      head: [['CALIPER SKINFOLDS', 'VALUE']],
      body: [
        ['Triceps / Chest / Mid-Ax', `${cleanVal(bodyFat.triceps)} / ${cleanVal(bodyFat.chest)} / ${cleanVal(bodyFat.midAxillary)} mm`],
        ['Sub-Scap / Abdomen', `${cleanVal(bodyFat.subScapular)} / ${cleanVal(bodyFat.abdomen)} mm`],
        ['Supra-Iliac / Thigh', `${cleanVal(bodyFat.supraIliac)} / ${cleanVal(bodyFat.thigh)} mm`],
        ['Est. Bodyfat Percentage', `${fitnessDoc?.bodyFatResult || fitnessDoc?.bodyFat?.calculatedResult || '—'}% Fat Estimate`]
      ],
      theme: 'striped',
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontSize: 6.5, fontStyle: 'bold', cellPadding: 1.2 },
      bodyStyles: { fontSize: 6.8, textColor: darkColor, cellPadding: 1.2 },
      margin: { left: 108 },
      tableWidth: 90
    });

    currentY = (doc as any).lastAutoTable.finalY + 4;

    // Section 3: Performance Capability Indicators (Grid formatted for pixel-perfect single-page fit)
    currentY = drawSectionTitle('Functional Performance Capability Tests & FMS Metric', currentY);

    autoTable(doc, {
      startY: currentY,
      head: [['CARDIO STEP TEST', 'AIRDYNE MASS BURN', 'WALL-SIT HOLD', 'PUSHUP METRIC', 'FMS SCREEN SCORE']],
      body: [[
        `${cleanVal(bodyTests.stepTestBpm)} BPM`,
        `${cleanVal(bodyTests.calorieBurnAirDyne)} kCal`,
        `${cleanVal(bodyTests.maximalWallSitTime)} Sec`,
        `${cleanVal(bodyTests.pushUps)} Reps`,
        `${cleanVal(fitnessDoc?.movementScreen?.totalScore || fitnessDoc?.movementScreenScore || '3')} / 3`
      ]],
      theme: 'striped',
      styles: { cellPadding: 1.8, fontSize: 7.2, textColor: darkColor, halign: 'center' },
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontSize: 6.2, fontStyle: 'bold', cellPadding: 1.4, halign: 'center' },
      margin: { left: 12, right: 12 },
      tableWidth: 186
    });

    currentY = (doc as any).lastAutoTable.finalY + 4;

    // Section 4: Prescribed Protocols
    currentY = drawSectionTitle('Prescribed Active Workout & Nutritional Protocol Maps', currentY);

    const routineText = latestWorkoutPlan ? `${latestWorkoutPlan.description || 'Active EMS training setup'}` : 'High-impact EMS loaded functional protocol routing.';
    const dietText = latestDietPlan ? `${latestDietPlan.description || 'Assigned meals breakdown'}` : 'Lean muscle mass hyper-recomp high protein allocation.';

    autoTable(doc, {
      startY: currentY,
      head: [['PRESCRIBED WORKOUT PROTOCOL', 'NUTRITIONAL STRATEGY TARGETS']],
      body: [[
        routineText,
        dietText
      ]],
      theme: 'grid',
      styles: { cellPadding: 1.8, fontSize: 6.8, textColor: darkColor },
      headStyles: { fillColor: darkColor, textColor: [255, 255, 255], fontSize: 6.5, fontStyle: 'bold', cellPadding: 1.2 },
      columnStyles: {
        0: { textColor: primaryColor, fontStyle: 'bold' },
        1: { textColor: [0, 110, 50], fontStyle: 'bold' }
      },
      margin: { left: 12, right: 12 },
      tableWidth: 186
    });

    currentY = (doc as any).lastAutoTable.finalY + 4;

    // Section 5: Recent Logs (Top 1 for guaranteed single-sheet safety margins)
    currentY = drawSectionTitle('Recent Training Logs & Bio-Metric Coaching Feedback', currentY);

    const recentLogsLimit = recentLogs.slice(0, 1).map(log => {
      const drills = log.entries?.map((e: any) => `${e.exercise}: ${cleanVal(e.sets)}x${cleanVal(e.reps)}`).join(', ') || '—';
      return [
        format(new Date(log.date), 'yyyy-MM-dd'),
        drills,
        cleanVal(log.notes)
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['RECORDED DATE', 'EMS/STRENGTH DRILLS COMPLETED', 'STRENGTH REMARKS & COACH RECOMMENDATIONS']],
      body: recentLogsLimit.length > 0 ? recentLogsLimit : [['—', 'No performance training logs mapped in database yet.', '—']],
      theme: 'striped',
      headStyles: { fillColor: darkColor, textColor: [255, 255, 255], fontSize: 6.5, fontStyle: 'bold', cellPadding: 1.2 },
      bodyStyles: { fontSize: 6.8, textColor: darkColor, cellPadding: 1.4 },
      margin: { left: 12, right: 12 },
      tableWidth: 186
    });

    currentY = (doc as any).lastAutoTable.finalY + 4;

    // Section 6: Payments & Financial Membership Statements (MADE BIG and highlighted for first-class visibility)
    currentY = drawSectionTitle('Active Client Membership & Billing Ledger Dockets', currentY);

    const totalPaymentsCount = paymentRecords.length;
    const paidRecords = paymentRecords.filter(p => p.status === 'Paid');
    const unpaidRecords = paymentRecords.filter(p => p.status !== 'Paid');
    const overdueRecords = paymentRecords.filter(p => p.status === 'Overdue');
    const hasOverdue = overdueRecords.length > 0;

    let ledgerStatusText = 'ACCOUNT STATE: CURRENT (IN GOOD STANDING)';
    let ledgerStatusColor: [number, number, number] = [0, 130, 80]; // Green
    if (hasOverdue) {
      ledgerStatusText = 'ACCOUNT STATE: IMMEDIATE ATTENTION REQUIRED (OVERDUE STATEMENTS)';
      ledgerStatusColor = [220, 0, 0]; // Red
    } else if (unpaidRecords.length > 0) {
      ledgerStatusText = 'ACCOUNT STATE: UNRESOLVED STATEMENTS PENDING';
      ledgerStatusColor = [180, 100, 0]; // Amber
    }

    // Ledger Status Highlight Banner (Very high visibility)
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.rect(12, currentY, 186, 11, 'F');
    doc.setDrawColor(220, 220, 220);
    doc.rect(12, currentY, 186, 11, 'S');

    doc.setFillColor(ledgerStatusColor[0], ledgerStatusColor[1], ledgerStatusColor[2]);
    doc.rect(12, currentY, 3.5, 11, 'F');

    // Box header texts
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(ledgerStatusColor[0], ledgerStatusColor[1], ledgerStatusColor[2]);
    doc.text(ledgerStatusText, 18, currentY + 4.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.text(`TOTAL ASSIGNMENTS: ${totalPaymentsCount} RECORDS  |  PAID STATEMENTS: ${paidRecords.length}  |  PENDING DUE: ${unpaidRecords.length}`, 18, currentY + 8);

    currentY += 13;

    // Table mapping payment records (Made large, with highlighted payment amount column)
    const paymentsBody = paymentRecords.slice(0, 10).map(pay => {
      const startFmt = pay.startDate ? format(new Date(pay.startDate), 'yyyy-MM-dd') : '—';
      const dueFmt = pay.dueDate ? format(new Date(pay.dueDate), 'yyyy-MM-dd') : '—';
      const balanceAmount = `Rs. ${pay.amount || '0'}`;
      const payStatus = pay.status ? pay.status.toUpperCase() : 'PENDING';
      return [
        pay.package ? pay.package.toUpperCase() : 'SPEEDFIT PREMIUM ACCESS MODULE',
        startFmt,
        dueFmt,
        balanceAmount,
        payStatus
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['ACTIVE MEMBERSHIP PACKAGE', 'START DATE', 'RENEWAL DUE DATE', 'STATEMENT VALUE', 'TRANSACTION STATUS']],
      body: paymentsBody.length > 0 ? paymentsBody : [['—', '—', '—', 'Rs. 0', 'NO BALANCE']],
      theme: 'grid',
      styles: { cellPadding: 3.2, fontSize: 9.5, textColor: darkColor }, // Sized-up row inputs
      headStyles: { 
        fillColor: primaryColor, 
        textColor: [255, 255, 255], 
        fontSize: 8.5, 
        fontStyle: 'bold', 
        cellPadding: 2.8 
      },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: darkColor },
        1: { fontStyle: 'bold', halign: 'center' },
        2: { fontStyle: 'bold', halign: 'center' },
        3: { fontStyle: 'bold', fontSize: 13, textColor: [180, 0, 0], halign: 'right' }, // Payment column is highlighted BIG
        4: { fontStyle: 'bold', halign: 'center', fontSize: 10 }
      },
      didParseCell: (data) => {
        if (data.section === 'body') {
          // Highlight background of the key billing amount column (STATEMENT VALUE)
          if (data.column.index === 3) {
            data.cell.styles.fillColor = [255, 235, 235]; // highlighted soft pink bg
          }
          
          // Transaction status column custom high-contrast badge fills
          if (data.column.index === 4) {
            const val = String(data.cell.raw).toUpperCase();
            if (val.includes('PAID')) {
              data.cell.styles.fillColor = [220, 245, 225]; // highlighted green
              data.cell.styles.textColor = [0, 130, 50];
            } else if (val.includes('OVERDUE')) {
              data.cell.styles.fillColor = [255, 215, 215]; // highlighted red bg
              data.cell.styles.textColor = [190, 0, 0];
            } else {
              data.cell.styles.fillColor = [255, 245, 205]; // highlighted amber bg
              data.cell.styles.textColor = [160, 90, 0];
            }
          }
        }
      },
      margin: { left: 12, right: 12 },
      tableWidth: 186
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;

    // Stamp / Legal notice & Sign-off area (Clamped to ensure 100% fits on single page)
    const advisoryY = Math.max(currentY, 212);

    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.4);
    doc.line(12, advisoryY, 198, advisoryY);

    // Advisory notice
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6);
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.text('ADVISORY CLINICAL NOTICE: Electro Muscle Stimulation (EMS) training incorporates active neuromuscular loads. Keep coaches fully integrated on cardiovascular updates. Hydrate regularly before assessments. Ledger statements represent certified Speed Fit program entries.', 12, advisoryY + 3.5, { maxWidth: 186 });

    // Signature lines
    const signatureY = advisoryY + 11;
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.25);

    // Left Coach sign
    doc.line(12, signatureY + 6, 82, signatureY + 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text('CERTIFIED OFFICIATING COACH STAMP', 12, signatureY + 9.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.text('SPEED FIT CORE TRAINING TEAM', 12, signatureY + 12.5);

    // Right Member sign
    doc.line(128, signatureY + 6, 198, signatureY + 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text('MEMBER LEDGER STATEMENT CONFIRMATION', 128, signatureY + 9.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.text('VERIFIED WITH TERMS & ACTIVE DOCK METRIC', 128, signatureY + 12.5);

    // Fixed single-sheet footer Y=285
    const footerY = 286;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(12, footerY - 2.5, 198, footerY - 2.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.text('SPEED FIT EMS • OFFICIAL SYSTEM PROFILE & STATEMENT LOG', 12, footerY + 1.2);
    doc.text('PAGE 1 OF 1  (SINGLE REPORT LOG)', 198, footerY + 1.2, { align: 'right' });

    // Directly save and trigger client-side download
    const clientNameSanitized = client.name?.toLowerCase().replace(/\s+/g, '_') || 'recruit';
    const filename = `speedfit_dossier_${clientNameSanitized}.pdf`;
    
    try {
      doc.save(filename);
    } catch (saveError) {
      console.warn("Direct save failed in sandboxed context:", saveError);
    }

    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);

    return {
      success: true,
      filename,
      blobUrl,
      doc
    };
  } catch (error) {
    console.error("PDF generation crash caught:", error);
    alert("An error occurred during PDF compiling. We are reviewing alignment dependencies.");
    return null;
  }
};

export const downloadClientReport = async (client: User) => {
  try {
    // 1. Fetch health assessment
    const healthQ = query(collection(db, 'healthAssessments'), where('clientId', '==', client.id));
    const healthSnap = await getDocs(healthQ);
    const healthDoc = healthSnap.docs.length > 0 ? { id: healthSnap.docs[0].id, ...healthSnap.docs[0].data() } : null;

    // 2. Fetch fitness assessment
    const fitnessQ = query(collection(db, 'fitnessAssessments'), where('clientId', '==', client.id));
    const fitnessSnap = await getDocs(fitnessQ);
    const fitnessDoc = fitnessSnap.docs.length > 0 ? { id: fitnessSnap.docs[0].id, ...fitnessSnap.docs[0].data() } : null;

    // 3. Fetch workout logs
    const logsQ = query(collection(db, 'workoutLogs'), where('clientId', '==', client.id));
    const logsSnap = await getDocs(logsQ);
    const recentLogs = logsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
    // sort logs by date descending
    recentLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 4. Fetch workout plans
    const workoutQ = query(collection(db, 'workoutPlans'), where('clientId', '==', client.id));
    const workoutSnap = await getDocs(workoutQ);
    const workoutPlans = workoutSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

    // 5. Fetch diet plans
    const dietQ = query(collection(db, 'dietPlans'), where('clientId', '==', client.id));
    const dietSnap = await getDocs(dietQ);
    const dietPlans = dietSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

    // 6. Fetch attendance
    const attendanceQ = query(collection(db, 'attendance'), where('clientId', '==', client.id));
    const attendanceSnap = await getDocs(attendanceQ);
    const attendance = attendanceSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

    // 7. Fetch payment logs
    const paymentQ = query(collection(db, 'paymentRecords'), where('clientId', '==', client.id));
    const paymentSnap = await getDocs(paymentQ);
    const paymentRecords = paymentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

    // Now invoke the main export PDF!
    return exportClientToPDF(
      client,
      healthDoc as any,
      recentLogs,
      workoutPlans,
      dietPlans,
      attendance,
      paymentRecords,
      healthDoc,
      fitnessDoc
    );
  } catch (error) {
    console.error("Error generating dynamic report:", error);
    alert("Error fetching client metrics. Please check network connectivity.");
    return null;
  }
};

export const exportPaidClientsReport = (paymentRecords: any[], clients: User[]) => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const primaryColor: [number, number, number] = [220, 0, 0]; // brand red
    const darkColor: [number, number, number] = [20, 20, 20];
    const grayColor: [number, number, number] = [100, 100, 100];
    const lightBg: [number, number, number] = [248, 248, 248];

    // Header
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 4, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('SPEED FIT', 12, 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.text(`OFFICIAL FINANCIAL REPORT • PAID RECRUITS LEDGER`, 12, 17);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text(`GENERATED: ${format(new Date(), 'yyyy-MM-dd')} UTC`, 198, 11, { align: 'right' });

    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(12, 19, 198, 19);

    // Section Title
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(12, 22, 2.5, 4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text('PAID RECRUITS & PAYMENTS DATABASE', 16, 25.2);

    // Highlight metrics from paid records
    const paidRecords = paymentRecords.filter(p => p.status === 'Paid');
    const totalRevenue = paidRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.rect(12, 28, 186, 12, 'F');
    doc.setDrawColor(220, 220, 220);
    doc.rect(12, 28, 186, 12, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('TOTAL REVENUE ACQUIRED: ' + `Rs. ${totalRevenue.toLocaleString()}`, 16, 33);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.text(`TOTAL PAID MEMBERSHIPS: ${paidRecords.length} ACTIVE STATEMENTS`, 16, 37);

    // Paid Clients Table
    const tableBody = paidRecords.map(pay => {
      const clientObj = clients.find(c => c.id === pay.clientId);
      const cName = clientObj ? (clientObj.name || clientObj.email) : 'Unnamed Recruit';
      const cEmail = clientObj ? clientObj.email : 'No Email';
      const startFmt = pay.startDate ? format(new Date(pay.startDate), 'yyyy-MM-dd') : '—';
      const dueFmt = pay.dueDate ? format(new Date(pay.dueDate), 'yyyy-MM-dd') : '—';
      const balanceAmount = `Rs. ${pay.amount || '0'}`;
      
      return [
        cName.toUpperCase(),
        cEmail,
        pay.package ? pay.package.toUpperCase() : 'SPEEDFIT PREMIUM ACCESS',
        startFmt,
        dueFmt,
        balanceAmount
      ];
    });

    autoTable(doc, {
      startY: 44,
      head: [['RECRUIT NAME', 'EMAIL ADDRESS', 'PACKAGE / MEMBERSHIP', 'START DATE', 'RENEWAL DUE DATE', 'PAID AMOUNT']],
      body: tableBody.length > 0 ? tableBody : [['—', '—', '—', '—', '—', 'Rs. 0']],
      theme: 'grid',
      styles: { cellPadding: 3.2, fontSize: 8.5, textColor: darkColor },
      headStyles: { 
        fillColor: primaryColor, 
        textColor: [255, 255, 255], 
        fontSize: 8, 
        fontStyle: 'bold', 
        cellPadding: 2.8 
      },
      columnStyles: {
        0: { fontStyle: 'bold' },
        3: { halign: 'center' },
        4: { halign: 'center' },
        5: { fontStyle: 'bold', textColor: [0, 120, 40], halign: 'right' }
      },
      didParseCell: (data) => {
        if (data.section === 'body') {
          if (data.column.index === 5) {
            data.cell.styles.fillColor = [235, 255, 240]; // Light green
          }
        }
      },
      margin: { left: 12, right: 12 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // Stamps & Seals
    const signatureY = Math.max(finalY, 190);
    doc.line(12, signatureY + 6, 82, signatureY + 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text('CERTIFIED SPEED FIT ACCOUNTING STAMP', 12, signatureY + 9.5);
    doc.setFont('helvetica', 'normal');
    doc.text('SYSTEM VERIFIED AND AUDITED LEDGER', 12, signatureY + 12.5);

    // Footer
    const footerY = 286;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(12, footerY - 2.5, 198, footerY - 2.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.text('SPEED FIT EMS • PAID CLIENTS DATABASE STATEMENT', 12, footerY + 1.2);
    doc.text('PAGE 1 OF 1', 198, footerY + 1.2, { align: 'right' });

    const filename = `speedfit_paid_recruits_report.pdf`;
    try {
      doc.save(filename);
    } catch (saveError) {
      console.warn("Direct save failed in sandboxed context", saveError);
    }

    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);

    return {
      success: true,
      filename,
      blobUrl
    };
  } catch (err) {
    console.error("Paid report generation crash", err);
    return null;
  }
};

export const exportAllInvoicesReport = (paymentRecords: any[], clients: User[]) => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const primaryColor: [number, number, number] = [220, 0, 0]; // brand red
    const darkColor: [number, number, number] = [20, 20, 20];
    const grayColor: [number, number, number] = [100, 100, 100];
    const lightBg: [number, number, number] = [248, 248, 248];

    // Helper functions for payment sums
    const getPaidAmountForRecord = (record: any) => {
      if (record.transactions && record.transactions.length > 0) {
        return record.transactions.reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
      }
      return record.status === 'Paid' ? (Number(record.amount) || 0) : 0;
    };

    const getBalanceDueForRecord = (record: any) => {
      const recordAmount = Number(record.amount) || 0;
      const paidAmount = getPaidAmountForRecord(record);
      return Math.max(0, recordAmount - paidAmount);
    };

    // Header
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 4, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('SPEED FIT', 12, 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.text(`OFFICIAL SUBSCRIPTION BILLING & INVOICES LEDGER`, 12, 17);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text(`GENERATED: ${format(new Date(), 'yyyy-MM-dd')} UTC`, 198, 11, { align: 'right' });

    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(12, 19, 198, 19);

    // Section Title
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(12, 22, 2.5, 4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text('ALL CLIENTS MEMBERSHIP INVOICES & LEDGERS', 16, 25.2);

    // Calculate billing metrics
    const paidRecords = paymentRecords.filter(p => p.status === 'Paid');
    const pendingRecords = paymentRecords.filter(p => p.status === 'Pending');
    const overdueRecords = paymentRecords.filter(p => p.status === 'Overdue');
    const totalDues = paymentRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const totalCollected = paymentRecords.reduce((sum, r) => sum + getPaidAmountForRecord(r), 0);
    const totalOutstanding = paymentRecords.reduce((sum, r) => sum + getBalanceDueForRecord(r), 0);

    // Summary Box
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.rect(12, 28, 186, 16, 'F');
    doc.setDrawColor(220, 220, 220);
    doc.rect(12, 28, 186, 16, 'S');

    // Colored accents inside the summary box
    doc.setFillColor(0, 130, 50); // Green for collected
    doc.rect(15, 30, 2, 12, 'F');
    doc.setFillColor(220, 0, 0); // Red for outstanding
    doc.rect(110, 30, 2, 12, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text(`TOTAL BILLED VALUE: Rs. ${totalDues.toLocaleString('en-IN')}`, 20, 34);
    doc.text(`TOTAL REVENUE COLLECTED: Rs. ${totalCollected.toLocaleString('en-IN')}`, 20, 40);

    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`OUTSTANDING DUES: Rs. ${totalOutstanding.toLocaleString('en-IN')}`, 115, 34);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.text(`PAID: ${paidRecords.length}  |  PENDING: ${pendingRecords.length}  |  OVERDUE: ${overdueRecords.length}`, 115, 40);

    // Table data mapping
    const tableBody = paymentRecords.map(pay => {
      const clientObj = clients.find(c => c.id === pay.clientId);
      const cName = clientObj ? (clientObj.name || clientObj.email) : 'Unnamed Recruit';
      const startFmt = pay.startDate ? format(new Date(pay.startDate), 'yyyy-MM-dd') : '—';
      const dueFmt = pay.dueDate ? format(new Date(pay.dueDate), 'yyyy-MM-dd') : '—';
      const totalAmount = `Rs. ${(Number(pay.amount) || 0).toLocaleString('en-IN')}`;
      const paidAmount = `Rs. ${getPaidAmountForRecord(pay).toLocaleString('en-IN')}`;
      const balanceDue = `Rs. ${getBalanceDueForRecord(pay).toLocaleString('en-IN')}`;
      const statusFmt = pay.status ? pay.status.toUpperCase() : 'PENDING';
      
      return [
        cName.toUpperCase(),
        pay.package ? pay.package.toUpperCase() : 'SPEEDFIT PREMIUM ACCESS',
        startFmt,
        dueFmt,
        totalAmount,
        paidAmount,
        balanceDue,
        statusFmt
      ];
    });

    autoTable(doc, {
      startY: 48,
      head: [['RECRUIT NAME', 'PACKAGE / MEMBERSHIP', 'START DATE', 'DUE DATE', 'BILL VALUE', 'PAID TO DATE', 'BALANCE DUE', 'STATUS']],
      body: tableBody.length > 0 ? tableBody : [['—', '—', '—', '—', 'Rs. 0', 'Rs. 0', 'Rs. 0', '—']],
      theme: 'grid',
      styles: { cellPadding: 2.2, fontSize: 7, textColor: darkColor },
      headStyles: { 
        fillColor: primaryColor, 
        textColor: [255, 255, 255], 
        fontSize: 7, 
        fontStyle: 'bold', 
        cellPadding: 2.2 
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 32 },
        1: { cellWidth: 43 },
        2: { halign: 'center', cellWidth: 18 },
        3: { halign: 'center', cellWidth: 18 },
        4: { fontStyle: 'bold', halign: 'right', cellWidth: 18 },
        5: { fontStyle: 'bold', halign: 'right', cellWidth: 18 },
        6: { fontStyle: 'bold', halign: 'right', cellWidth: 18 },
        7: { fontStyle: 'bold', halign: 'center', cellWidth: 21 }
      },
      didParseCell: (data) => {
        if (data.section === 'body') {
          if (data.column.index === 4) {
            data.cell.styles.fillColor = [250, 250, 250];
          }
          if (data.column.index === 5) {
            data.cell.styles.fillColor = [240, 255, 242]; // very light green
          }
          if (data.column.index === 6) {
            const rawVal = String(data.cell.raw).replace(/[^\d]/g, '');
            if (Number(rawVal) > 0) {
              data.cell.styles.fillColor = [255, 240, 240]; // very light red
            } else {
              data.cell.styles.fillColor = [250, 250, 250];
            }
          }
          if (data.column.index === 7) {
            const val = String(data.cell.raw).toUpperCase();
            if (val.includes('PAID')) {
              data.cell.styles.fillColor = [220, 245, 225]; // soft green bg
              data.cell.styles.textColor = [0, 130, 50];
            } else if (val.includes('OVERDUE')) {
              data.cell.styles.fillColor = [255, 215, 215]; // soft red bg
              data.cell.styles.textColor = [190, 0, 0];
            } else {
              data.cell.styles.fillColor = [255, 245, 205]; // soft amber bg
              data.cell.styles.textColor = [160, 90, 0];
            }
          }
        }
      },
      margin: { left: 12, right: 12 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // Stamps & Seals
    const signatureY = Math.max(finalY, 190);
    doc.line(12, signatureY + 6, 82, signatureY + 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text('CERTIFIED SPEED FIT TREASURER STAMP', 12, signatureY + 9.5);
    doc.setFont('helvetica', 'normal');
    doc.text('SYSTEM DIGITAL PAYMENT SECURED STAMP', 12, signatureY + 12.5);

    // Footer
    const footerY = 286;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(12, footerY - 2.5, 198, footerY - 2.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.text('SPEED FIT EMS • COMPREHENSIVE INVOICES REPORT', 12, footerY + 1.2);
    doc.text('PAGE 1 OF 1', 198, footerY + 1.2, { align: 'right' });

    const filename = `speedfit_all_clients_invoices_report.pdf`;
    try {
      doc.save(filename);
    } catch (saveError) {
      console.warn("Direct save failed in sandboxed context", saveError);
    }

    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);

    return {
      success: true,
      filename,
      blobUrl
    };
  } catch (err) {
    console.error("All client invoices report generation crash", err);
    return null;
  }
};

export const exportPaymentReceiptToPDF = (client: User, record: any) => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const primaryColor: [number, number, number] = [220, 0, 0]; // brand red
    const darkColor: [number, number, number] = [20, 20, 20];
    const grayColor: [number, number, number] = [100, 100, 100];
    const lightBg: [number, number, number] = [248, 248, 248];

    // Top accent line
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 4, 'F');

    // Title & Logo
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('SPEED FIT', 12, 13);

    // Subtitle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.text(`EMS FITNESS OFFICIAL INVOICE & PAYMENT RECEIPT`, 12, 17);

    // Meta (Right aligned)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text(`INVOICE NO: SF-REC-${record.id?.slice(0, 6)?.toUpperCase() || 'NA'}`, 198, 11, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(`DATE OF ISSUE: ${record.startDate || format(new Date(), 'yyyy-MM-dd')}`, 198, 15, { align: 'right' });

    // Separator
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(12, 19, 198, 19);

    // Billing Parties Box
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.rect(12, 23, 186, 25, 'F');
    doc.setDrawColor(220, 220, 220);
    doc.rect(12, 23, 186, 25, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('ISSUED BY:', 16, 28);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text('SPEED FIT\nBUILD TO TRANSFORM', 16, 32);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('BILLED TO (RECRUIT):', 128, 28);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text(`Name: ${client.name || 'Unnamed Recruit'}\nEmail: ${client.email}\nID: ${client.id}`, 128, 32);

    // Section heading: Receipt Breakdown
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(12, 53, 2.5, 4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text('MEMBERSHIP BILLING STATEMENT BREAKDOWN', 16, 56.2);

    // Premium Table
    const startFmt = record.startDate ? format(new Date(record.startDate), 'MMMM dd, yyyy') : '—';
    const dueFmt = record.dueDate ? format(new Date(record.dueDate), 'MMMM dd, yyyy') : '—';
    const activePackageName = record.package ? record.package.toUpperCase() : 'SPEEDFIT ELITE ACCESS SERVICE';

    // Helper functions for payment sums
    const getPaidAmountForRecord = (rec: any) => {
      if (rec.transactions && rec.transactions.length > 0) {
        return rec.transactions.reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
      }
      return rec.status === 'Paid' ? (Number(rec.amount) || 0) : 0;
    };

    const getBalanceDueForRecord = (rec: any) => {
      const recordAmount = Number(rec.amount) || 0;
      const paidAmount = getPaidAmountForRecord(rec);
      return Math.max(0, recordAmount - paidAmount);
    };

    const totalAmt = Number(record.amount) || 0;
    const paidAmt = getPaidAmountForRecord(record);
    const balanceDue = getBalanceDueForRecord(record);

    autoTable(doc, {
      startY: 60,
      head: [['MEMBERSHIP PLAN & DESCRIPTION', 'PERIOD START', 'RENEWAL DUE DATE', 'TOTAL VALUED PRICE']],
      body: [
        [
          activePackageName + `\n(${record.packageType || 'Monthly'} EMS Training Program Access Credit)`,
          startFmt,
          dueFmt,
          `Rs. ${totalAmt.toLocaleString('en-IN')}`
        ],
        [
          { content: 'TOTAL AMOUNT BILLED', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
          `Rs. ${totalAmt.toLocaleString('en-IN')}`
        ],
        [
          { content: 'TOTAL AMOUNT PAID TO DATE', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold', textColor: [0, 120, 45] } },
          `Rs. ${paidAmt.toLocaleString('en-IN')}`
        ],
        [
          { content: 'OUTSTANDING BALANCE DUE', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold', textColor: [180, 0, 0] } },
          `Rs. ${balanceDue.toLocaleString('en-IN')}`
        ]
      ],
      theme: 'grid',
      styles: { cellPadding: 4, fontSize: 9, textColor: darkColor },
      headStyles: { 
        fillColor: primaryColor, 
        textColor: [255, 255, 255], 
        fontSize: 8.5, 
        fontStyle: 'bold', 
        cellPadding: 3.5 
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 85 },
        1: { halign: 'center', cellWidth: 35 },
        2: { halign: 'center', cellWidth: 35 },
        3: { fontStyle: 'bold', fontSize: 11, halign: 'right', cellWidth: 31 }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
          if (data.row.index === 0) {
            data.cell.styles.fillColor = [250, 250, 250];
          } else if (data.row.index === 1) {
            data.cell.styles.fillColor = [245, 245, 245];
          } else if (data.row.index === 2) {
            data.cell.styles.fillColor = [235, 255, 240]; // Soft green for paid
            data.cell.styles.textColor = [0, 120, 45];
          } else if (data.row.index === 3) {
            data.cell.styles.fillColor = [255, 240, 240]; // Soft red for balance
            data.cell.styles.textColor = [180, 0, 0];
          }
        }
      },
      margin: { left: 12, right: 12 }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 10;

    // Stamp / Seal and signature
    doc.setFillColor(250, 250, 250);
    doc.rect(12, currentY, 186, 30, 'F');
    doc.rect(12, currentY, 186, 30, 'S');

    // Watermark/badge in print based on status
    const payStatus = (record.status || 'Paid').toUpperCase();
    if (payStatus === 'OVERDUE') {
      doc.setDrawColor(220, 0, 0); // brand red
      doc.setLineWidth(0.8);
      doc.rect(20, currentY + 5, 45, 20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(220, 0, 0);
      doc.text('OVERDUE INVOICE', 22, currentY + 11);
      doc.setFontSize(13);
      doc.text('⚠ OVERDUE', 22, currentY + 20);
    } else if (payStatus === 'PENDING') {
      doc.setDrawColor(245, 158, 11); // amber
      doc.setLineWidth(0.8);
      doc.rect(20, currentY + 5, 45, 20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(245, 158, 11);
      doc.text('PENDING INVOICE', 22, currentY + 11);
      doc.setFontSize(13);
      doc.text('⏳ PENDING', 22, currentY + 20);
    } else {
      doc.setDrawColor(0, 150, 60); // green
      doc.setLineWidth(0.8);
      doc.rect(20, currentY + 5, 45, 20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(0, 130, 45);
      doc.text('OFFICIAL RECEIPT', 23, currentY + 11);
      doc.setFontSize(14);
      doc.text('✓ PAID', 23, currentY + 20);
    }

    // Signature Area
    const sigY = currentY + 4;
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.25);
    doc.line(118, sigY + 14, 188, sigY + 14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text('SPEED FIT OFFICIATING TREASURER', 118, sigY + 18.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text('SYSTEM DIGITAL PAYMENT SECURED STAMP', 118, sigY + 21.5);

    // Advisory Notice
    const advY = currentY + 36;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6);
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.text('PAYMENT NOTICE AND CONDITIONS: All active program access depends on ahead-of-time financial registry. No partial month refund is sanctioned once membership is active.', 12, advY, { maxWidth: 186 });

    // Footer
    const footerY = 286;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(12, footerY - 2.5, 198, footerY - 2.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[grayColor.length - 1]);
    doc.text('SPEED FIT INVOICING SERVICE • GENERATED SECURE PROFILE', 12, footerY + 1.2);
    doc.text('PAGE 1 OF 1', 198, footerY + 1.2, { align: 'right' });

    const filename = `speedfit_receipt_${client.name?.toLowerCase().replace(/\s+/g, '_') || 'recruit'}_SF-${record.id?.slice(0, 6)}.pdf`;
    
    try {
      doc.save(filename);
    } catch (saveError) {
      console.warn("Direct save failed in sandboxed context:", saveError);
    }

    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);

    return {
      success: true,
      filename,
      blobUrl
    };
  } catch (err) {
    console.error("Receipt generation crash caught", err);
    return null;
  }
};

export const exportAITransformationReportToPDF = async (client: User, draft: any) => {
  try {
    // 1. Fetch completely journal of the client, health assessments, and physical biometrics
    let recentLogs: any[] = [];
    let healthDoc: any = null;
    let fitnessDoc: any = null;
    
    try {
      const logsQ = query(collection(db, 'workoutLogs'), where('clientId', '==', client.id));
      const logsSnap = await getDocs(logsQ);
      recentLogs = logsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      recentLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (e) {
      console.warn("Could not retrieve client journal workoutLogs:", e);
    }

    try {
      const healthQ = query(collection(db, 'healthAssessments'), where('clientId', '==', client.id));
      const healthSnap = await getDocs(healthQ);
      if (healthSnap.docs.length > 0) {
        healthDoc = { id: healthSnap.docs[0].id, ...healthSnap.docs[0].data() };
      }

      const fitnessQ = query(collection(db, 'fitnessAssessments'), where('clientId', '==', client.id));
      const fitnessSnap = await getDocs(fitnessQ);
      if (fitnessSnap.docs.length > 0) {
        fitnessDoc = { id: fitnessSnap.docs[0].id, ...fitnessSnap.docs[0].data() };
      }
    } catch (e) {
      console.warn("Could not retrieve client assessments:", e);
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const primaryColor: [number, number, number] = [220, 0, 0]; // brand red
    const darkColor: [number, number, number] = [20, 20, 20];
    const grayColor: [number, number, number] = [100, 100, 100];
    const lightBg: [number, number, number] = [248, 248, 248];

    const report = draft.transformationReport || {};
    const diet = draft.dietPlan || {};
    const workout = draft.workoutPlan || {};
    const posture = draft.postureAssessment || {};
    const lifestyle = draft.lifestylePlan || {};
    const supplements = draft.supplementRecommendations || {};
    const risk = draft.riskAssessment || {};
    const weekly = draft.weeklyActionPlan || {};
    const pdfSecs = draft.pdfSections || {};

    const clean = (val: any) => val || 'Not specified';

    // Helper: Page Setup
    const setupPage = (title: string, subtitle: string, pageNum: number) => {
      // Accent line
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 4, 'F');

      // Header branding
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('SPEED FIT', 12, 13);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
      doc.text(`ATHLETIC TRANSFORMATION REPORT • COMPREHENSIVE PERFORMANCE MAP`, 12, 17);

      // Metas
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text(`CONFIDENTIAL CLIENT DOSSIER`, 198, 11, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.text(`STATUS: APPROVED PLAN PROTOCOL`, 198, 15, { align: 'right' });

      // Title Box
      doc.setFillColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.rect(12, 21, 186, 10, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(title.toUpperCase(), 16, 27.5);

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(220, 220, 220);
      doc.text(subtitle.toUpperCase(), 194, 27.2, { align: 'right' });

      // Footer
      const footerY = 286;
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.line(12, footerY - 2.5, 198, footerY - 2.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
      doc.text('SPEED FIT BIOMETRIC ENGINE • CHIEF COACH APPROVED INTEGRATION', 12, footerY + 1.2);
      doc.text(`PAGE ${pageNum}`, 198, footerY + 1.2, { align: 'right' });
    };

    // PAGE 1: Assessment summary & Body Analysis & Measurements
    setupPage('1. TRANSFORMATION ASSESSMENT & PHYSIOMETRICS', 'Section A', 1);

    // Demographics and Vitals Grid
    autoTable(doc, {
      startY: 34,
      head: [['TRANSFORMATION IDENTIFIER', 'VALUE / CLINICAL STATEMENT']],
      body: [
        ['Athlete Full Name', clean(client.name)],
        ['Athlete ID / Email', `${clean(client.id)} / ${clean(client.email)}`],
        ['Primary Training Goals', clean(draft.clientData?.goals ? draft.clientData.goals.join(', ') : 'Fat Loss & Advanced Hypertrophy')],
        ['Occupation Vector Profile', clean(draft.clientData?.occupation)],
        ['Equipment Provisioning Access', clean(draft.clientData?.equipmentAccess)],
        ['Water Strategy Daily Target', `${draft.clientData?.waterIntake || '3'} Liters Daily`]
      ],
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontSize: 7, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.2, textColor: darkColor },
      margin: { left: 12, right: 12 },
      tableWidth: 186
    });

    let currentY = (doc as any).lastAutoTable.finalY + 4;

    // Actual Measurements Tape Measures & Skinfolds
    const circ = fitnessDoc?.circumference || {};
    const bodyFat = fitnessDoc?.bodyFat || {};
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text('CLINICAL ATHLETE BIOMETRICS & TAPE MEASUREMENTS (JOURNAL DATA)', 12, currentY + 3);
    currentY += 4.5;

    autoTable(doc, {
      startY: currentY,
      head: [['Tape Metric', 'Tape Size', 'Caliper Skinfold', 'Caliper Measurement']],
      body: [
        ['Neck Circumference', circ.neck ? `${circ.neck} cm` : '—', 'Triceps Skinfold', bodyFat.triceps ? `${bodyFat.triceps} mm` : '—'],
        ['Shoulders Circumference', circ.shoulders ? `${circ.shoulders} cm` : '—', 'Chest Skinfold', bodyFat.chest ? `${bodyFat.chest} mm` : '—'],
        ['Chest Circumference', circ.chest ? `${circ.chest} cm` : '—', 'Mid-Axillary Skinfold', bodyFat.midAxillary ? `${bodyFat.midAxillary} mm` : '—'],
        ['Waist Circumference', circ.waist ? `${circ.waist} cm` : '—', 'Sub-Scapular Skinfold', bodyFat.subScapular ? `${bodyFat.subScapular} mm` : '—'],
        ['Hips Circumference', circ.hips ? `${circ.hips} cm` : '—', 'Abdomen Skinfold', bodyFat.abdomen ? `${bodyFat.abdomen} mm` : '—'],
        ['Right/Left Thigh', `${circ.rightThigh || '—'} / ${circ.leftThigh || '—'} cm`, 'Supra-Iliac Skinfold', bodyFat.supraIliac ? `${bodyFat.supraIliac} mm` : '—'],
        ['Right/Left Upper Arm', `${circ.rightUpperArm || '—'} / ${circ.leftUpperArm || '—'} cm`, 'Calculated Body Fat %', fitnessDoc?.bodyFatResult ? `${fitnessDoc.bodyFatResult}%` : '—']
      ],
      theme: 'striped',
      headStyles: { fillColor: darkColor, textColor: [255, 255, 255], fontSize: 6.5, fontStyle: 'bold', cellPadding: 1.2 },
      bodyStyles: { fontSize: 6.8, textColor: darkColor, cellPadding: 1.2 },
      margin: { left: 12, right: 12 },
      tableWidth: 186
    });

    currentY = (doc as any).lastAutoTable.finalY + 4;

    // Body Analysis Summary
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.rect(12, currentY, 186, 22, 'F');
    doc.setDrawColor(220, 220, 220);
    doc.rect(12, currentY, 186, 22, 'S');
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(12, currentY, 2.5, 22, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text('TRANSFORMATION SPECIALIST RECOMMENDATIONS SUMMARY', 18, currentY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(60, 60, 60);
    const summaryText = report.currentCondition || pdfSecs.bodyAnalysis || "Undergone physical adaptivity scoring to guide active musculoskeletal load lines.";
    doc.text(summaryText, 18, currentY + 8.5, { maxWidth: 175 });

    currentY += 26;

    // Strengths / Weaknesses and Correctives row
    autoTable(doc, {
      startY: currentY,
      head: [['RECRUIT BIOMECHANICAL STRENGTHS', 'RECRUIT MOVEMENT LIMITATIONS']],
      body: [
        [
          (report.strengths || []).map((s: string) => `• ${s}`).join('\n') || '• Functional stability bounds',
          (report.weaknesses || []).map((w: string) => `• ${w}`).join('\n') || '• Kinetic chain compensations'
        ]
      ],
      theme: 'grid',
      headStyles: { fillColor: darkColor, textColor: [255, 255, 255], fontSize: 6.8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 6.6, textColor: darkColor },
      columnStyles: {
        0: { textColor: [0, 110, 50], fontStyle: 'bold' },
        1: { textColor: [180, 0, 0], fontStyle: 'bold' }
      },
      margin: { left: 12, right: 12 },
      tableWidth: 186
    });

    currentY = (doc as any).lastAutoTable.finalY + 4;

    // AI Clinician Diagnostic Findings Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text('CHIEF COACH ANALYTICAL DIAGNOSTICS & CLIENT PROFILE FINDINGS', 12, currentY + 3);
    currentY += 4.5;

    autoTable(doc, {
      startY: currentY,
      head: [['TRANSFORMATION DIMENSION ASSESSMENT', 'EXPERT DIAGNOSTIC REMARKS & ASSIGNED GUIDELINES']],
      body: [
        ['Postural & Kinetic Chain Evaluation', report.postureFindings || 'Physical postural analysis checked and logged.'],
        ['Lifestyle, Circadian Sleep & Stressors', report.lifestyleFindings || 'Coaching evaluation of sleep latency, sleep cycles and daily stress bounds.'],
        ['Nutritional & Basal Metabolic Profile', report.nutritionFindings || 'Undergone active nutritional preference evaluations.'],
        ['Athlete Potential Assessment Rating', report.potential || 'Superior physical potential mapped under coordinated coaching protocols.']
      ],
      theme: 'grid',
      headStyles: { fillColor: darkColor, textColor: [255, 255, 255], fontSize: 6.8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 6.6, textColor: darkColor, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: primaryColor, cellWidth: 45 },
        1: { cellWidth: 141 }
      },
      margin: { left: 12, right: 12 },
      tableWidth: 186
    });

    currentY = (doc as any).lastAutoTable.finalY + 4;

    // Posture Rehab correctives
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text('POSTURAL OBSERVATIONS & TARGETED REHAB ACTION SCHEMES', 12, currentY + 3);
    currentY += 4.5;

    autoTable(doc, {
      startY: currentY,
      head: [['POSTURE ANALYSIS AREA', 'SEVERITY RATING', 'SUPPORT EXERCISES REHAB']],
      body: (posture.findings || []).map((f: any) => [
        clean(f.issue),
        clean(f.severity),
        (f.rehabExercises || []).join(', ')
      ]) || [['Neuromuscular structural alignments', 'Optimal', 'Routine EMS core stabilization']],
      theme: 'striped',
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontSize: 6.5 },
      bodyStyles: { fontSize: 6.8, textColor: darkColor, cellPadding: 1.5 },
      margin: { left: 12, right: 12 },
      tableWidth: 186
    });

    // PAGE 2: Nutrition/Diet Guide & Caloric Calculation Table
    doc.addPage();
    setupPage('2. NUTRITIONAL BLUEPRINT & MEAL SCHEDULES', 'Section B', 2);

    // Calories split header cards
    currentY = 34;
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.rect(12, currentY, 186, 16, 'F');
    doc.setDrawColor(220, 220, 220);
    doc.rect(12, currentY, 186, 16, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`${diet.calories || '—'} kCal`, 18, currentY + 10);
    doc.setFontSize(6.5);
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.text('DAILY CALORIC TARGET', 18, currentY + 13);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text(`${diet.protein || '—'}g`, 64, currentY + 10);
    doc.setFontSize(6.5);
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.text('PROTEIN REQUIREMENT', 64, currentY + 13);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`${diet.carbs || '—'}g`, 110, currentY + 10);
    doc.setFontSize(6.5);
    doc.text('CARBOHYDRATE LIMIT', 110, currentY + 13);

    doc.setFont('helvetica', 'bold');
    doc.text(`${diet.fats || '—'}g`, 156, currentY + 10);
    doc.setFontSize(6.5);
    doc.text('LIPIDS / FATS CAP', 156, currentY + 13);

    currentY += 21;

    // MACRONUTRIENT CALORIC CONTRIBUTIONS (Proper calculation rows/columns)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text('DAILY ENERGY BUDGET CALCULATION SPLIT', 12, currentY + 3);
    currentY += 4.5;

    const calcCal = (g: any, factor: number) => {
      const parsed = parseInt(g);
      return isNaN(parsed) ? 0 : parsed * factor;
    };
    const pC = calcCal(diet.protein, 4);
    const cC = calcCal(diet.carbs, 4);
    const fC = calcCal(diet.fats, 9);
    const sumCal = pC + cC + fC;
    const targetCalNum = parseInt(diet.calories) || sumCal || 1;
    
    autoTable(doc, {
      startY: currentY,
      head: [['MACRONUTRIENT UNIT', 'DAILY TARGET GRAMS', 'CALORIC MULTIPLIER', 'TOTAL Kcal CONTRIBUTION', 'CALORIC TOTAL RATIO %']],
      body: [
        ['Protein Core', diet.protein ? `${diet.protein} g` : '—', '4 kcal / g', `${pC} kcal`, targetCalNum > 0 ? `${Math.round((pC / targetCalNum) * 100)} %` : '—'],
        ['Active Carbohydrates', diet.carbs ? `${diet.carbs} g` : '—', '4 kcal / g', `${cC} kcal`, targetCalNum > 0 ? `${Math.round((cC / targetCalNum) * 100)} %` : '—'],
        ['Healthy Fats / Lipids', diet.fats ? `${diet.fats} g` : '—', '9 kcal / g', `${fC} kcal`, targetCalNum > 0 ? `${Math.round((fC / targetCalNum) * 100)} %` : '—'],
        ['Balanced Yield Summary', '—', 'Compound Factor', `${sumCal} kcal`, `Target: ${diet.calories || '—'} kcal`]
      ],
      theme: 'grid',
      headStyles: { fillColor: darkColor, textColor: [255, 255, 255], fontSize: 6.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 6.8, textColor: darkColor },
      columnStyles: {
        3: { fontStyle: 'bold', textColor: primaryColor, halign: 'right' },
        4: { fontStyle: 'bold', halign: 'center' }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.row.index === 3) {
          data.cell.styles.fillColor = [240, 240, 240];
          data.cell.styles.fontStyle = 'bold';
        }
      },
      margin: { left: 12, right: 12 },
      tableWidth: 186
    });

    currentY = (doc as any).lastAutoTable.finalY + 5;

    // Daily meal composition
    const meals = diet.meals || {};
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('DAILY DIETARY MEAL COMPOSITION SCHEDULE', 12, currentY + 3);
    currentY += 4.5;

    autoTable(doc, {
      startY: currentY,
      head: [['MEAL DESIGNATION', 'PRESCRIBED MEAL COMPOSITION', 'PRACTICAL ALTERNATIVE ACCENTS']],
      body: [
        ['Breakfast Protocol', clean(meals.breakfast?.content), clean(meals.breakfast?.alternatives)],
        ['Lunch Protocol', clean(meals.lunch?.content), clean(meals.lunch?.alternatives)],
        ['Dinner Protocol', clean(meals.dinner?.content), clean(meals.dinner?.alternatives)],
        ['Snacks & Mid-Day', clean(meals.snacks?.content), clean(meals.snacks?.alternatives)]
      ],
      theme: 'grid',
      headStyles: { fillColor: darkColor, textColor: [255, 255, 255], fontSize: 6.8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 6.8, textColor: darkColor, cellPadding: 2.5 },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: primaryColor, cellWidth: 32 },
        1: { cellWidth: 77 },
        2: { cellWidth: 77 }
      },
      margin: { left: 12, right: 12 },
      tableWidth: 186
    });

    currentY = (doc as any).lastAutoTable.finalY + 4;

    // Supplement recommendations
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('REQUISITE SUPPLEMENTATION STRATEGY MAP', 12, currentY + 3);
    currentY += 4.5;

    autoTable(doc, {
      startY: currentY,
      head: [['ALLOWED SUPPLEMENT UNIT', 'DAILY DOSAGE', 'SUPPORT PURPOSE & RECOVERY BENEFITS']],
      body: (supplements.items || []).map((item: any) => [
        clean(item.name),
        clean(item.dosage),
        clean(item.purpose)
      ]) || [['Whey Protein Hydrate', '1 scoop post-training', 'Quick absorption peptide for tissue recovery support']],
      theme: 'striped',
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontSize: 6.5 },
      bodyStyles: { fontSize: 6.8, textColor: darkColor, cellPadding: 1.8 },
      margin: { left: 12, right: 12 },
      tableWidth: 186
    });

    // PAGE 3: Workout Program, Risk Assessment, Timeline
    doc.addPage();
    setupPage('3. TACTICAL TRAINING WORKOUT BLUEPRINT', 'Section C', 3);

    currentY = 34;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('PRESCRIBED TRAINING PROGRAM PROTOCOLS & PHASE SETUPS', 12, currentY + 3);
    currentY += 4.5;

    autoTable(doc, {
      startY: currentY,
      head: [['PROGRAM TRAINING PHASE', 'PRESCRIBED EMS WORKOUT FOCUS']],
      body: (workout.sections || []).map((sec: any) => [
        clean(sec.title),
        clean(sec.content)
      ]) || [['EMS functional split', 'Detailed high tension recruitment with customized frequencies']],
      theme: 'grid',
      headStyles: { fillColor: darkColor, textColor: [255, 255, 255], fontSize: 6.8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 6.8, textColor: darkColor, cellPadding: 3.5 },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: primaryColor, cellWidth: 35 },
        1: { cellWidth: 151 }
      },
      margin: { left: 12, right: 12 },
      tableWidth: 186
    });

    currentY = (doc as any).lastAutoTable.finalY + 4;

    // Risk Assessment Highlight Banner
    doc.setFillColor(255, 235, 235);
    doc.rect(12, currentY, 186, 20, 'F');
    doc.setDrawColor(220, 50, 50);
    doc.rect(12, currentY, 186, 20, 'S');
    doc.setFillColor(220, 50, 50);
    doc.rect(12, currentY, 2.5, 20, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(190, 0, 0);
    doc.text(`CONFIDENTIAL CLINICAL RISK RATING: ${risk.riskLevel || 'LOW'}`, 18, currentY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(30, 30, 30);
    const precautionsText = `Assessed bounds: ${(risk.identifiedHazards || []).join(', ') || 'No cardiovascular anomalies detected.'}. Essential precautions: ${(risk.precautions || []).join(', ') || 'Perform baseline warm-up and hydrate regularly.'}`;
    doc.text(precautionsText, 18, currentY + 8.5, { maxWidth: 175 });

    currentY += 24;

    // Timeline milestones
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text('WEEKLY TRANSFORMATION SCHEDULE & ROADMAP MILESTONES', 12, currentY + 3);
    currentY += 4.5;

    const timeline = report.timeline || {};
    autoTable(doc, {
      startY: currentY,
      head: [['TIMELINE PERIOD', 'PREDICTIVE ADAPTATION TARGET & ACTION PLAN MARKERS']],
      body: (timeline.milestones || []).map((m: any) => [
        clean(m.week),
        clean(m.milestone)
      ]) || [['Week 1-4', 'Establish cardiovascular adaptations and motor unit activation thresholds.']],
      theme: 'striped',
      headStyles: { fillColor: darkColor, textColor: [255, 255, 255], fontSize: 6.5 },
      bodyStyles: { fontSize: 6.8, textColor: darkColor, cellPadding: 1.5 },
      margin: { left: 12, right: 12 },
      tableWidth: 186
    });

    // PAGE 4: Completely performance activities journal of the client
    doc.addPage();
    setupPage('4. COMPREHENSIVE RECRUIT PERFORMANCE JOURNAL & LOGS', 'Section D', 4);

    currentY = 34;

    // Journal Statistics and Calculations KPI card
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.rect(12, currentY, 186, 16, 'F');
    doc.setDrawColor(220, 220, 220);
    doc.rect(12, currentY, 186, 16, 'S');

    const totalLogsCount = recentLogs.length;
    const latestLogDate = recentLogs[0] ? format(new Date(recentLogs[0].date), 'yyyy-MM-dd') : '—';
    const oldestLogDate = recentLogs[recentLogs.length - 1] ? format(new Date(recentLogs[recentLogs.length - 1].date), 'yyyy-MM-dd') : '—';
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`${totalLogsCount}`, 18, currentY + 10);
    doc.setFontSize(6.5);
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.text('TOTAL COMPLETED DIARY LOGS', 18, currentY + 13);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text(latestLogDate, 64, currentY + 10);
    doc.setFontSize(6.5);
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.text('LATEST COMPLETED WORKOUT', 64, currentY + 13);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(oldestLogDate, 120, currentY + 10);
    doc.setFontSize(6.5);
    doc.text('INITIAL JOURNAL ENTRY', 120, currentY + 13);

    currentY += 21;

    // Chronological Logs Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text('CHRONOLOGICAL RECRUIT COMPLIANCE LOGS & DRILLS HISTORY', 12, currentY + 3);
    currentY += 4.5;

    const journalRows = recentLogs.map(log => {
      const dateStr = log.date ? format(new Date(log.date), 'yyyy-MM-dd') : '—';
      const parsedNotes = log.notes || 'No workout session comments recorded by trainee.';
      let finishedDrills = '—';
      if (log.entries && Array.isArray(log.entries) && log.entries.length > 0) {
        finishedDrills = log.entries.map((ent: any) => {
          const exName = ent.exercise || 'Exercise';
          const setStr = ent.sets ? `${ent.sets} sets` : '';
          const repStr = ent.reps ? `x ${ent.reps} reps` : '';
          const wtStr = ent.weight ? `@ ${ent.weight} kg` : '';
          const segmentStr = [setStr, repStr, wtStr].filter(Boolean).join(' ');
          return `• ${exName}: ${segmentStr || 'Completed'}`;
        }).join('\n');
      } else {
        finishedDrills = 'General conditioning & metabolic adaptation drills compiled.';
      }
      return [
        dateStr,
        finishedDrills,
        parsedNotes
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['COMPLETED DATE', 'SECTOR WORKOUTS & DRILLS LOADS', 'COACH ADVISORY / RECRUIT REMARKS']],
      body: journalRows.length > 0 ? journalRows : [['—', 'Tectonic performance adapting levels active.', 'No history diaries recorded.']],
      theme: 'grid',
      headStyles: { fillColor: darkColor, textColor: [255, 255, 255], fontSize: 6.8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 6.8, textColor: darkColor },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 26, halign: 'center' },
        1: { cellWidth: 80 },
        2: { cellWidth: 80 }
      },
      didDrawPage: (data) => {
        if (data.pageNumber > 4) {
          // Top accent line
          doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          doc.rect(0, 0, 210, 4, 'F');

          // Header branding
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(20);
          doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          doc.text('SPEED FIT', 12, 13);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
          doc.text(`ATHLETIC TRANSFORMATION REPORT • COMPREHENSIVE PERFORMANCE MAP`, 12, 17);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7);
          doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
          doc.text(`CONFIDENTIAL CLIENT DOSSIER`, 198, 11, { align: 'right' });
          
          const footerY = 286;
          doc.setDrawColor(220, 220, 220);
          doc.setLineWidth(0.3);
          doc.line(12, footerY - 2.5, 198, footerY - 2.5);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.5);
          doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
          doc.text('SPEED FIT BIOMETRIC ENGINE • COMPREHENSIVE DRILLS REGISTER', 12, footerY + 1.2);
          doc.text(`PAGE ${data.pageNumber}`, 198, footerY + 1.2, { align: 'right' });
        }
      },
      margin: { left: 12, right: 12, bottom: 20 },
      tableWidth: 186
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;
    
    // Add page safety bounds
    if (currentY > 240) {
      doc.addPage();
      setupPage('CO-AUTHORED COMPLIANCE SEALS & ADVISORY STATEMENTS', 'Section E', doc.getNumberOfPages());
      currentY = 40;
    }

    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.4);
    doc.line(12, currentY, 198, currentY);

    // Advisory notice
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6);
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.text('ADVISORY NOTICE: Calculated bio-ratios represent simulated metabolic adaptability bounds mapped via EMS motor unit thresholds. Direct feedback and training comments compiled under strict officiating review rules.', 12, currentY + 3.5, { maxWidth: 186 });

    // Signature lines
    const signatureY = currentY + 12;
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.25);

    // Left Coach sign
    doc.line(12, signatureY + 6, 82, signatureY + 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text('CHIEF BIOMETRIC COACH STAMP', 12, signatureY + 9.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.text('SPEED FIT OFFICIATING TEAM', 12, signatureY + 12.5);

    // Right Member sign
    doc.line(128, signatureY + 6, 198, signatureY + 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text('ATHLETE ACKNOWLEDGEMENT', 128, signatureY + 9.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.text('VERIFIED & PUBLISHED ACTION PROTOCOL CO-SIGN', 128, signatureY + 12.5);

    const clientNameSanitized = client.name?.toLowerCase().replace(/\s+/g, '_') || 'recruit';
    const filename = `speedfit_transformation_report_${clientNameSanitized}.pdf`;

    try {
      doc.save(filename);
    } catch (saveError) {
      console.warn("Direct save failed in sandboxed context:", saveError);
    }

    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);

    return {
      success: true,
      filename,
      blobUrl
    };

  } catch (error) {
    console.error("Failed to generate transformation PDF report:", error);
    alert("An error occurred during multi-page PDF compilation. Check formatting rules.");
    return null;
  }
};

export const exportAllClientsBookletToPDF = async (clients: User[]) => {
  try {
    if (!clients || clients.length === 0) {
      alert("No clients have been loaded in the system to compile.");
      return null;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const primaryColor: [number, number, number] = [220, 0, 0]; // brand red
    const darkColor: [number, number, number] = [20, 20, 20];
    const grayColor: [number, number, number] = [100, 100, 100];
    const lightBg: [number, number, number] = [248, 248, 248];

    // --- PAGE 1: TITLE & EXECUTIVE SUMMARY PAGE ---
    // Background decoration decoration bounds
    doc.setFillColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.rect(0, 0, 210, 297, 'F');

    // Accent slash
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 8, 297, 'F');

    // Main branding
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(36);
    doc.setTextColor(255, 255, 255);
    doc.text('SPEED FIT', 20, 70);

    doc.setFontSize(14);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('EMS ATHLETIC PERFORMANCE REGISTER', 20, 80);

    doc.setDrawColor(80, 80, 80);
    doc.setLineWidth(0.5);
    doc.line(20, 90, 190, 90);

    // Metadata
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(180, 180, 180);
    doc.text('A comprehensive compendium of athlete demographics, physical measurements, postural assessments, performance metrics, and financial records compiled from core databases.', 20, 102, { maxWidth: 160 });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('EXECUTIVE LEDGER AUDIT:', 20, 134);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(220, 220, 220);
    doc.text(`• Total Athletes Monitored: ${clients.length}`, 20, 144);
    doc.text(`• Target Platform System: Speed Fit EMS Control Station`, 20, 151);
    doc.text(`• Date Generated: ${format(new Date(), 'MMMM dd, yyyy HH:mm')} UTC`, 20, 158);
    doc.text(`• Authenticated Authority: Officiating Trainer Desk`, 20, 165);

    // Standard seal
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.8);
    doc.rect(20, 220, 65, 24);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('OFFICIATING OFFICIAL', 24, 229);
    doc.setFontSize(11);
    doc.text('★ GENERAL SEAL', 24, 238);

    doc.setFontSize(7.5);
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.text('SPEED FIT CORE SYSTEMS INC. ALL CLIENT INTEL SECURED.', 20, 280);

    // --- CORE PROCESS INTEGRATION ---
    for (let cIdx = 0; cIdx < clients.length; cIdx++) {
      const client = clients[cIdx];
      
      // Fetch matching data for this client
      let healthDoc: any = null;
      let fitnessDoc: any = null;
      let workoutPlans: any[] = [];
      let paymentRecords: any[] = [];

      try {
        const healthQ = query(collection(db, 'healthAssessments'), where('clientId', '==', client.id));
        const healthSnap = await getDocs(healthQ);
        if (healthSnap.docs.length > 0) {
          healthDoc = { id: healthSnap.docs[0].id, ...healthSnap.docs[0].data() };
        }

        const fitnessQ = query(collection(db, 'fitnessAssessments'), where('clientId', '==', client.id));
        const fitnessSnap = await getDocs(fitnessQ);
        if (fitnessSnap.docs.length > 0) {
          fitnessDoc = { id: fitnessSnap.docs[0].id, ...fitnessSnap.docs[0].data() };
        }

        const workoutQ = query(collection(db, 'workoutPlans'), where('clientId', '==', client.id));
        const workoutSnap = await getDocs(workoutQ);
        workoutPlans = workoutSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const paymentQ = query(collection(db, 'paymentRecords'), where('clientId', '==', client.id));
        const paymentSnap = await getDocs(paymentQ);
        paymentRecords = paymentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (fErr) {
        console.warn(`Failed fetching records for pupil ${client.id}:`, fErr);
      }

      doc.addPage();

      // Top margin accent bar
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 4, 'F');

      // Header branding
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('SPEED FIT', 12, 13);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
      doc.text(`COMPLETE ATHLETE PROFILE & STATUS FILE`, 12, 17);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text(`DOSSIER ${cIdx + 1} OF ${clients.length}`, 198, 12, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.text(`STATUS: ACTIVE ROSTER RECORD`, 198, 16, { align: 'right' });

      // Separator
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.line(12, 20, 198, 20);

      // Section A: Demographics
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(12, 24, 2.5, 4, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text('I. BASIC IDENTITY', 16, 27.2);

      const cleanVal = (val: any) => (val === undefined || val === null || val === '') ? '—' : val;

      autoTable(doc, {
        startY: 30,
        head: [['IDENTIFICATION ELEMENT', 'REGISTERED VALUE MATCH']],
        body: [
          ['Full Athlete Name', cleanVal(client.name).toUpperCase()],
          ['Electronic Mail Address', cleanVal(client.email)],
          ['Assigned Portal Role', cleanVal(client.role).toUpperCase()],
          ['Roster Unique ID', cleanVal(client.id)],
          ['Contact Telephone', cleanVal(client.phoneNumber)]
        ],
        theme: 'striped',
        margin: { left: 12 },
        tableWidth: 186,
        headStyles: { fillColor: darkColor, fontSize: 7, fontStyle: 'bold' },
        bodyStyles: { fontSize: 7.2, textColor: darkColor, cellPadding: 1.8 }
      });

      let currentY = (doc as any).lastAutoTable.finalY + 4;

      // Section B: Anthropometrics & Physical Vitals
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(12, currentY, 2.5, 4, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('II. BIOMETRICS & TAPE MEASUREMENTS', 16, currentY + 3.2);
      currentY += 5;

      const circ = fitnessDoc?.circumference || {};
      const bodyFat = fitnessDoc?.bodyFat || {};

      autoTable(doc, {
        startY: currentY,
        head: [['ANTHROPOMETRIC METRIC', 'RECORDED VALUE', 'CALIPER SKINFOLDS', 'MEASUREMENT']],
        body: [
          ['Weight', `${cleanVal(healthDoc?.weight || client.healthAssessment?.weight)} kg`, 'Triceps Skinfold', `${cleanVal(bodyFat.triceps)} mm`],
          ['Height', `${cleanVal(healthDoc?.height || client.healthAssessment?.height)} cm`, 'Chest Skinfold', `${cleanVal(bodyFat.chest)} mm`],
          ['Neck tape size', `${cleanVal(circ.neck)} cm`, 'Sub-scapular skinfold', `${cleanVal(bodyFat.subScapular)} mm`],
          ['Shoulders tape size', `${cleanVal(circ.shoulders)} cm`, 'Abdomen skinfold', `${cleanVal(bodyFat.abdomen)} mm`],
          ['Chest circumference', `${cleanVal(circ.chest)} cm`, 'Supra-iliac skinfold', `${cleanVal(bodyFat.supraIliac)} mm`],
          ['Waist line', `${cleanVal(circ.waist)} cm`, 'Thigh skinfold', `${cleanVal(bodyFat.thigh)} mm`],
          ['Hips girth', `${cleanVal(circ.hips)} cm`, 'Bodyfat Percentage', `${fitnessDoc?.bodyFatResult || '—'}% Estimate`]
        ],
        theme: 'grid',
        margin: { left: 12 },
        tableWidth: 186,
        headStyles: { fillColor: primaryColor, fontSize: 6.8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 7, textColor: darkColor, cellPadding: 1.5 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 4;

      // Section C: Goals & Training state
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(12, currentY, 2.5, 4, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('III. TRAINING GOALS & PRESCRIBED REGIMENS', 16, currentY + 3.2);
      currentY += 5;

      const latestWorkoutPlan = workoutPlans?.[0];
      const routineName = latestWorkoutPlan ? latestWorkoutPlan.name : '—';
      const routineDesc = latestWorkoutPlan ? latestWorkoutPlan.description : 'Under active metabolic preparation cycle.';

      autoTable(doc, {
        startY: currentY,
        head: [['TARGET FITNESS FOCUSES & GOALS', 'SPECIFIED PROGRAM / PROTOCOLS']],
        body: [
          [
            (healthDoc?.goals || client.healthAssessment?.goals || []).map((g: string) => `• ${g}`).join('\n') || '• Full body EMS conditioning\n• Aerobic base development',
            `Assigned Plan: ${routineName}\n\nDescription:\n${routineDesc}`
          ]
        ],
        theme: 'grid',
        margin: { left: 12 },
        tableWidth: 186,
        headStyles: { fillColor: darkColor, fontSize: 7, fontStyle: 'bold' },
        bodyStyles: { fontSize: 7, textColor: darkColor, cellPadding: 2.2 },
        columnStyles: {
          0: { cellWidth: 70 },
          1: { cellWidth: 116 }
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 4;

      // Section D: Membership & Billing Status
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(12, currentY, 2.5, 4, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('IV. FINANCIAL REGISTRY SUMMARY', 16, currentY + 3.2);
      currentY += 5;

      const paymentsRows = paymentRecords.slice(0, 3).map(p => {
        const amtStr = `Rs. ${p.amount || '0'}`;
        const issueDate = p.startDate ? format(new Date(p.startDate), 'yyyy-MM-dd') : '—';
        const renewalDate = p.dueDate ? format(new Date(p.dueDate), 'yyyy-MM-dd') : '—';
        return [
          p.package ? p.package.toUpperCase() : 'SPEEDFIT PREMIUM ACCESS UNLIMITED',
          amtStr,
          issueDate,
          renewalDate,
          p.status ? p.status.toUpperCase() : 'PENDING'
        ];
      });

      autoTable(doc, {
        startY: currentY,
        head: [['PACKAGE PLANS', 'AMOUNT', 'START DATE', 'RENEWAL DUE DATE', 'LEDGER STATUS']],
        body: paymentsRows.length > 0 ? paymentsRows : [['No billing rosters registered in the database for this athlete.', '—', '—', '—', 'CURRENT']],
        theme: 'grid',
        margin: { left: 12 },
        tableWidth: 186,
        headStyles: { fillColor: primaryColor, fontSize: 6.8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 7, textColor: darkColor, cellPadding: 1.5 },
        columnStyles: {
          1: { halign: 'right', fontStyle: 'bold' },
          4: { fontStyle: 'bold', halign: 'center' }
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 4) {
            const val = String(data.cell.raw).toUpperCase();
            if (val.includes('PAID')) {
              data.cell.styles.textColor = [0, 110, 50];
            } else if (val.includes('OVERDUE')) {
              data.cell.styles.textColor = [190, 0, 0];
            }
          }
        }
      });

      // Bottom footer text per item page
      const footerY = 286;
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.line(12, footerY - 2.5, 198, footerY - 2.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
      doc.text(`SPEED FIT CONTROL ENGINE • CONFIDENTIAL DOSSIER SYSTEM`, 12, footerY + 1.2);
      doc.text(`PAGE ${doc.getNumberOfPages()}`, 198, footerY + 1.2, { align: 'right' });
    }

    const filename = `speedfit_all_athletes_profiles_booklet.pdf`;
    try {
      doc.save(filename);
    } catch (saveError) {
      console.warn("Direct save failed in sandboxed context:", saveError);
    }

    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);

    alert("Successfully compiled all athlete dossiers! Your multi-page PDF booklet is generating now.");

    return {
      success: true,
      filename,
      blobUrl
    };

  } catch (error: any) {
    console.error("Failed to compile all client profiles:", error);
    alert("An error occurred during multi-page PDF workbook generation: " + error.message);
    return null;
  }
};

export const exportAttendanceReportToPDF = (attendanceRecords: any[], clients: User[], filterDate?: string) => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const primaryColor: [number, number, number] = [220, 0, 0]; // brand red
    const darkColor: [number, number, number] = [20, 20, 20];
    const grayColor: [number, number, number] = [100, 100, 100];
    const lightBg: [number, number, number] = [248, 248, 248];

    // Header
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 4, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('SPEED FIT', 12, 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.text(`OFFICIAL ATTENDANCE REPORT • TIMINGS & LOGS`, 12, 17);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text(`GENERATED: ${format(new Date(), 'yyyy-MM-dd')} UTC`, 198, 11, { align: 'right' });

    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(12, 19, 198, 19);

    // Section Title
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(12, 22, 2.5, 4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text(filterDate ? `DAILY RUN LOG - ${filterDate}` : 'ALL-TIME ATHLETES ATTENDANCE JOURNAL', 16, 25.2);

    // Filtered records
    const filteredRecords = filterDate 
      ? attendanceRecords.filter(a => a.date === filterDate)
      : attendanceRecords;

    const presentCount = filteredRecords.filter(a => a.status === 'Present').length;
    const missedCount = filteredRecords.filter(a => a.status === 'Missed').length;

    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.rect(12, 28, 186, 12, 'F');
    doc.setDrawColor(220, 220, 220);
    doc.rect(12, 28, 186, 12, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`TOTAL LOGGED SESSIONS: ${filteredRecords.length}`, 16, 33);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.text(`PRESENT LOGS: ${presentCount} CHECK-INS • MISSED SESSION MARKS: ${missedCount}`, 16, 37);

    // Attendance Table data
    const tableBody = filteredRecords.map(rec => {
      const clientObj = clients.find(c => c.id === rec.clientId);
      const cName = clientObj ? (clientObj.name || clientObj.email) : 'Unnamed Recruit';
      const cEmail = clientObj ? clientObj.email : 'No Email';
      const dateVal = rec.date || '—';
      const timingVal = rec.status === 'Present' ? (rec.timing || 'Regular Slots') : '—';
      const statusVal = rec.status ? rec.status.toUpperCase() : 'NOT LOGGED';
      
      return [
        cName.toUpperCase(),
        cEmail,
        dateVal,
        timingVal,
        statusVal
      ];
    });

    autoTable(doc, {
      startY: 44,
      head: [['ATHLETE RECRUIT', 'EMAIL ADDRESS', 'CALENDAR DATE', 'SLOT TIMINGS', 'REGULARITY STATUS']],
      body: tableBody.length > 0 ? tableBody : [['—', '—', '—', '—', '—']],
      theme: 'grid',
      styles: { cellPadding: 3.2, fontSize: 8.5, textColor: darkColor },
      headStyles: { 
        fillColor: primaryColor, 
        textColor: [255, 255, 255], 
        fontSize: 8, 
        fontStyle: 'bold', 
        cellPadding: 2.8 
      },
      columnStyles: {
        0: { fontStyle: 'bold' },
        2: { halign: 'center' },
        3: { halign: 'center', fontStyle: 'bold' },
        4: { fontStyle: 'bold', halign: 'center' }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          const val = String(data.cell.raw).toUpperCase();
          if (val.includes('PRESENT')) {
            data.cell.styles.fillColor = [235, 255, 240];
            data.cell.styles.textColor = [0, 110, 40];
          } else if (val.includes('MISSED')) {
            data.cell.styles.fillColor = [255, 235, 235];
            data.cell.styles.textColor = [190, 0, 0];
          }
        }
      },
      margin: { left: 12, right: 12 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // Stamps & Seals
    const signatureY = Math.max(finalY, 190);
    doc.line(12, signatureY + 6, 82, signatureY + 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text('CERTIFIED SPEED FIT ATHLETIC RECORD COUNTERMINDER', 12, signatureY + 9.5);
    doc.setFont('helvetica', 'normal');
    doc.text('ATTENDANCE TIMINGS AUDITED DATABASE EXTRACT', 12, signatureY + 12.5);

    // Footer
    const footerY = 286;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(12, footerY - 2.5, 198, footerY - 2.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.text('SPEED FIT EMS • OFFICIAL ATTENDANCE DOSSIER', 12, footerY + 1.2);
    doc.text('PAGE 1 OF 1', 198, footerY + 1.2, { align: 'right' });

    const filename = `speedfit_attendance_report_${filterDate || 'full'}.pdf`;
    try {
      doc.save(filename);
    } catch (saveError) {
      console.warn("Direct save failed in sandboxed context", saveError);
    }

    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);

    return {
      success: true,
      filename,
      blobUrl
    };
  } catch (err) {
    console.error("Attendance report generation crash", err);
    return null;
  }
};


