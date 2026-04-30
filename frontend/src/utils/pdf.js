import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const HEX_TO_RGB = {
  '#FF6B35': [255, 107, 53],
  '#4ECDC4': [78, 205, 196],
  '#A855F7': [168, 85, 247],
  '#EC4899': [236, 72, 153],
  '#3B82F6': [59, 130, 246],
  '#10B981': [16, 185, 129],
  '#F59E0B': [245, 158, 11],
  '#EF4444': [239, 68, 68]
};

function rgb(hex) {
  return HEX_TO_RGB[hex] || [100, 100, 200];
}

export function downloadAuctionPDF(state) {
  const doc = new jsPDF();
  const W = doc.internal.pageSize.getWidth();

  // ── Dark header band ──────────────────────────────────────────────────────
  doc.setFillColor(10, 10, 30);
  doc.rect(0, 0, W, 48, 'F');

  doc.setFontSize(26);
  doc.setTextColor(255, 215, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('DPL LEAGUE', W / 2, 18, { align: 'center' });

  doc.setFontSize(9);
  doc.setTextColor(180, 180, 180);
  doc.setFont('helvetica', 'normal');
  doc.text('DOWNTOWN PREMIER LEAGUE — AUCTION RESULTS', W / 2, 27, { align: 'center' });

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  const dateStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  doc.text(`Generated: ${dateStr}`, W / 2, 38, { align: 'center' });

  // ── Summary row ───────────────────────────────────────────────────────────
  let y = 58;
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(
    `Total Players: ${state.players.length}   |   Sold: ${state.soldPlayers.length}   |   Unsold: ${state.unsoldPlayers.length}   |   Teams: ${state.teams.length}`,
    W / 2, y, { align: 'center' }
  );

  doc.setDrawColor(210, 210, 210);
  doc.line(14, y + 5, W - 14, y + 5);
  y += 14;

  // ── Per-team tables ───────────────────────────────────────────────────────
  state.teams.forEach(team => {
    const teamRgb = rgb(team.color);
    const spent = state.budget - team.points;
    const neededHeight = 16 + (team.players.length > 0 ? team.players.length * 8 + 20 : 14);

    if (y + neededHeight > 272) {
      doc.addPage();
      y = 20;
    }

    // Team header bar
    doc.setFillColor(...teamRgb);
    doc.roundedRect(14, y, W - 28, 11, 2, 2, 'F');

    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(team.name.toUpperCase(), 20, y + 7.5);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `${team.players.length} player${team.players.length !== 1 ? 's' : ''}  ·  Spent: ${spent} pts  ·  Remaining: ${team.points} pts`,
      W - 20, y + 7.5, { align: 'right' }
    );
    y += 15;

    if (team.players.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [['#', 'Player', 'Bid (pts)']],
        body: team.players.map((p, i) => [i + 1, p.name, `${p.price} pts`]),
        theme: 'striped',
        headStyles: { fillColor: teamRgb, textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
        bodyStyles: { fontSize: 9, textColor: [40, 40, 40] },
        alternateRowStyles: { fillColor: [248, 248, 255] },
        columnStyles: { 0: { cellWidth: 12 }, 2: { halign: 'center', cellWidth: 30 } },
        margin: { left: 14, right: 14 }
      });
      y = doc.lastAutoTable.finalY + 14;
    } else {
      doc.setFontSize(9);
      doc.setTextColor(160, 160, 160);
      doc.setFont('helvetica', 'italic');
      doc.text('No players purchased.', 20, y + 5);
      y += 14;
    }
  });

  // ── Unsold players ────────────────────────────────────────────────────────
  if (state.unsoldPlayers.length > 0) {
    if (y + 40 > 272) { doc.addPage(); y = 20; }

    doc.setFillColor(180, 50, 50);
    doc.roundedRect(14, y, W - 28, 11, 2, 2, 'F');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('UNSOLD PLAYERS', 20, y + 7.5);
    y += 15;

    autoTable(doc, {
      startY: y,
      head: [['#', 'Player', 'Status']],
      body: state.unsoldPlayers.map((p, i) => [i + 1, p, 'Unsold']),
      theme: 'striped',
      headStyles: { fillColor: [180, 50, 50], textColor: [255, 255, 255], fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: [80, 80, 80] },
      columnStyles: { 2: { halign: 'center', textColor: [180, 50, 50], fontStyle: 'bold' } },
      margin: { left: 14, right: 14 }
    });
  }

  // ── Footer on every page ──────────────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(180, 180, 180);
    doc.text(
      `DPL League · Downtown Premier League   |   Page ${i} of ${pageCount}`,
      W / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }

  doc.save(`DPL-Auction-Results-${new Date().toISOString().slice(0, 10)}.pdf`);
}
