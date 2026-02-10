import jsPDF from 'jspdf';

interface AggregatedMetrics {
  model: string;
  avgResponseTime: number;
  avgTtft: number;
  totalRequests: number;
  avgTokens: number;
  wordsPerSecond: number;
}

interface BestModels {
  fastest: AggregatedMetrics;
  lowestTtft: AggregatedMetrics;
  highestSpeed: AggregatedMetrics;
}

export const exportModelComparisonPDF = (
  aggregatedMetrics: AggregatedMetrics[],
  bestModels: BestModels | null
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('MagVerse AI', 14, y);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('Model Performance Report', 14, y + 8);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, y + 15);
  
  // Divider
  y += 22;
  doc.setDrawColor(200);
  doc.line(14, y, pageWidth - 14, y);
  y += 10;

  // Top Performers Section
  if (bestModels) {
    doc.setTextColor(0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Top Performers', 14, y);
    y += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const performers = [
      { label: 'Fastest Response', model: bestModels.fastest.model, value: `${bestModels.fastest.avgResponseTime}ms` },
      { label: 'Lowest TTFT', model: bestModels.lowestTtft.model, value: `${bestModels.lowestTtft.avgTtft}ms` },
      { label: 'Fastest Generation', model: bestModels.highestSpeed.model, value: `${bestModels.highestSpeed.wordsPerSecond} w/s` },
    ];

    performers.forEach((p) => {
      doc.setFont('helvetica', 'bold');
      doc.text(`${p.label}:`, 18, y);
      doc.setFont('helvetica', 'normal');
      doc.text(`${p.model} — ${p.value}`, 70, y);
      y += 7;
    });

    y += 5;
    doc.setDrawColor(200);
    doc.line(14, y, pageWidth - 14, y);
    y += 10;
  }

  // Leaderboard Table
  doc.setTextColor(0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Performance Leaderboard', 14, y);
  y += 10;

  // Table header
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(240, 240, 240);
  doc.rect(14, y - 4, pageWidth - 28, 8, 'F');
  
  const cols = [14, 28, 70, 105, 135, 160];
  doc.text('Rank', cols[0] + 2, y);
  doc.text('Model', cols[1] + 2, y);
  doc.text('Avg Response', cols[2] + 2, y);
  doc.text('TTFT', cols[3] + 2, y);
  doc.text('Words/sec', cols[4] + 2, y);
  doc.text('Requests', cols[5] + 2, y);
  y += 8;

  // Table rows
  doc.setFont('helvetica', 'normal');
  const sorted = [...aggregatedMetrics].sort((a, b) => a.avgResponseTime - b.avgResponseTime);
  
  sorted.forEach((model, index) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    
    if (index % 2 === 0) {
      doc.setFillColor(248, 248, 248);
      doc.rect(14, y - 4, pageWidth - 28, 7, 'F');
    }
    
    doc.text(`#${index + 1}`, cols[0] + 2, y);
    doc.text(model.model, cols[1] + 2, y);
    doc.text(`${model.avgResponseTime}ms`, cols[2] + 2, y);
    doc.text(`${model.avgTtft}ms`, cols[3] + 2, y);
    doc.text(`${model.wordsPerSecond} w/s`, cols[4] + 2, y);
    doc.text(`${model.totalRequests}`, cols[5] + 2, y);
    y += 7;
  });

  // Summary
  y += 8;
  doc.setDrawColor(200);
  doc.line(14, y, pageWidth - 14, y);
  y += 8;
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Total models: ${aggregatedMetrics.length} | Total requests: ${aggregatedMetrics.reduce((s, m) => s + m.totalRequests, 0)}`, 14, y);

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 10;
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('MagVerse AI — magverse-chat-realm.lovable.app', 14, footerY);

  doc.save(`magverse-model-comparison-${new Date().toISOString().slice(0, 10)}.pdf`);
};
