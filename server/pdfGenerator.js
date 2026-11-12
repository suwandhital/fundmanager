const PDFDocument = require('pdfkit');

/**
 * Generates an executive-grade PDF financial statement
 * @param {Object} options
 * @param {Object} options.user - { name, email }
 * @param {Object} options.filterSummary - { type, search, range }
 * @param {Array} options.transactions - array of { date, type, category, note, amount }
 * @returns {Promise<Buffer>}
 */
function generateTransactionPDF({ user = {}, filterSummary = {}, transactions = [] }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => {
      // Add page numbering across all pages
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.fillColor('#94a3b8').fontSize(8).font('Helvetica').text(
          `Page ${i + 1} of ${range.count}  •  Confidential  •  FundManager Financial Engine`,
          40,
          doc.page.height - 28,
          { width: doc.page.width - 80, align: 'center' }
        );
      }
      resolve(Buffer.concat(chunks));
    });
    doc.on('error', reject);

    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - 80;

    // ── 1. Header & Brand Banner ──
    doc.rect(40, 40, contentWidth, 54).fill('#0f172a');
    doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold').text('FUNDMANAGER', 55, 52);
    doc.fillColor('#94a3b8').fontSize(8.5).font('Helvetica').text('FINANCIAL STATEMENT & AUDIT REPORT', 55, 73);

    const nowFormatted = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    doc.fillColor('#38bdf8').fontSize(9).font('Helvetica-Bold').text('EXPORT STATEMENT', pageWidth - 165, 52, { width: 110, align: 'right' });
    doc.fillColor('#94a3b8').fontSize(8).font('Helvetica').text(nowFormatted, pageWidth - 165, 68, { width: 110, align: 'right' });

    let y = 106;

    // ── 2. Account & Filter Details Box ──
    doc.rect(40, y, contentWidth, 58).fill('#f8fafc');
    doc.rect(40, y, contentWidth, 58).stroke('#e2e8f0');

    // Account block
    doc.fillColor('#64748b').fontSize(7.5).font('Helvetica-Bold').text('ACCOUNT RECIPIENT', 55, y + 9);
    doc.fillColor('#0f172a').fontSize(9.5).font('Helvetica-Bold').text(user.name || 'FundManager User', 55, y + 21, { width: 160, lineBreak: false });
    doc.fillColor('#64748b').fontSize(8).font('Helvetica').text(user.email || 'N/A', 55, y + 36, { width: 160, lineBreak: false });

    // Filter block
    doc.fillColor('#64748b').fontSize(7.5).font('Helvetica-Bold').text('ACTIVE FILTER STATUS', 225, y + 9);
    const filterType = (filterSummary.type || 'All').toUpperCase();
    const filterSearch = filterSummary.search ? `"${filterSummary.search}"` : 'None';
    doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica').text(`Type: ${filterType}   |   Search: ${filterSearch}`, 225, y + 21, { width: 200, lineBreak: false });
    doc.fillColor('#64748b').fontSize(8).font('Helvetica').text(`Date Range: ${filterSummary.range || 'All Recorded Dates'}`, 225, y + 36, { width: 200, lineBreak: false });

    // Records count
    doc.fillColor('#64748b').fontSize(7.5).font('Helvetica-Bold').text('TOTAL ENTRIES', pageWidth - 130, y + 9, { width: 75, align: 'right' });
    doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text(String(transactions.length), pageWidth - 130, y + 23, { width: 75, align: 'right' });

    y += 72;

    // ── 3. Summary KPIs ──
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const netBalance = totalIncome - totalExpense;

    const cardW = (contentWidth - 16) / 3;

    // Total Inflow
    doc.rect(40, y, cardW, 46).fill('#f0fdf4').stroke('#bbf7d0');
    doc.fillColor('#166534').fontSize(7.5).font('Helvetica-Bold').text('TOTAL INFLOW', 50, y + 8);
    doc.fillColor('#15803d').fontSize(11).font('Helvetica-Bold').text(`+ NRS ${totalIncome.toLocaleString()}`, 50, y + 22);

    // Total Outflow
    doc.rect(40 + cardW + 8, y, cardW, 46).fill('#fef2f2').stroke('#fecaca');
    doc.fillColor('#991b1b').fontSize(7.5).font('Helvetica-Bold').text('TOTAL OUTFLOW', 50 + cardW + 8, y + 8);
    doc.fillColor('#b91c1c').fontSize(11).font('Helvetica-Bold').text(`- NRS ${totalExpense.toLocaleString()}`, 50 + cardW + 8, y + 22);

    // Net Movement
    doc.rect(40 + (cardW + 8) * 2, y, cardW, 46).fill('#f8fafc').stroke('#cbd5e1');
    doc.fillColor('#334155').fontSize(7.5).font('Helvetica-Bold').text('NET MOVEMENT', 50 + (cardW + 8) * 2, y + 8);
    doc.fillColor(netBalance >= 0 ? '#0f172a' : '#b91c1c').fontSize(11).font('Helvetica-Bold').text(
      `${netBalance >= 0 ? '+' : '-'} NRS ${Math.abs(netBalance).toLocaleString()}`,
      50 + (cardW + 8) * 2,
      y + 22
    );

    y += 60;

    // ── 4. Table Layout ──
    const cols = [
      { label: '#', x: 45, w: 25, align: 'left' },
      { label: 'Date', x: 74, w: 68, align: 'left' },
      { label: 'Type', x: 146, w: 56, align: 'left' },
      { label: 'Category', x: 206, w: 80, align: 'left' },
      { label: 'Note / Description', x: 290, w: 140, align: 'left' },
      { label: 'Amount (NRS)', x: 435, w: contentWidth - 395, align: 'right' },
    ];

    function drawTableHeader(curY) {
      doc.rect(40, curY, contentWidth, 20).fill('#0f172a');
      cols.forEach(c => {
        doc.fillColor('#f8fafc').fontSize(8).font('Helvetica-Bold').text(c.label, c.x, curY + 6, { width: c.w, align: c.align });
      });
      return curY + 22;
    }

    y = drawTableHeader(y);

    if (transactions.length === 0) {
      doc.rect(40, y, contentWidth, 40).fill('#f8fafc');
      doc.fillColor('#94a3b8').fontSize(9).font('Helvetica').text('No transactions found matching the applied filter.', 40, y + 14, { width: contentWidth, align: 'center' });
      y += 40;
    } else {
      transactions.forEach((tx, idx) => {
        if (y > doc.page.height - 65) {
          doc.addPage();
          y = drawTableHeader(40);
        }

        const rowH = 19;
        if (idx % 2 === 1) {
          doc.rect(40, y, contentWidth, rowH).fill('#f8fafc');
        }

        doc.fillColor('#64748b').fontSize(7.5).font('Helvetica').text(String(idx + 1), cols[0].x, y + 5, { width: cols[0].w });
        doc.fillColor('#334155').fontSize(8).font('Helvetica').text(tx.date || '—', cols[1].x, y + 5, { width: cols[1].w });

        const isInc = tx.type === 'income';
        doc.fillColor(isInc ? '#16a34a' : '#dc2626').fontSize(7.5).font('Helvetica-Bold').text(
          isInc ? 'INFLOW' : 'OUTFLOW',
          cols[2].x,
          y + 5,
          { width: cols[2].w }
        );

        doc.fillColor('#0f172a').fontSize(8).font('Helvetica').text(tx.category || 'Other', cols[3].x, y + 5, { width: cols[3].w, lineBreak: false });
        doc.fillColor('#334155').fontSize(8).font('Helvetica').text(tx.note || '—', cols[4].x, y + 5, { width: cols[4].w, lineBreak: false });

        doc.fillColor(isInc ? '#16a34a' : '#dc2626').fontSize(8).font('Helvetica-Bold').text(
          `${isInc ? '+' : '-'} ${Number(tx.amount || 0).toLocaleString()}`,
          cols[5].x,
          y + 5,
          { width: cols[5].w, align: 'right' }
        );

        y += rowH;
      });
    }

    doc.rect(40, y, contentWidth, 1).fill('#cbd5e1');

    doc.end();
  });
}

module.exports = { generateTransactionPDF };

