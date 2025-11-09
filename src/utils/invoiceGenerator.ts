import jsPDF from 'jspdf';

interface InvoiceData {
  invoice_number: string;
  issue_date: string;
  amount: number;
  plan_type: string;
  status: string;
  user: {
    name: string;
    email: string;
    username: string;
  };
}

export const generateInvoicePDF = (invoice: InvoiceData) => {
  const doc = new jsPDF();
  
  // Set colors
  const primaryColor: [number, number, number] = [147, 51, 234]; // Purple
  const textColor: [number, number, number] = [51, 51, 51];
  const lightGray: [number, number, number] = [240, 240, 240];
  
  // Header
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('MAGVERSE AI', 20, 25);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Your AI Companion Platform', 20, 32);
  
  // Invoice title
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', 150, 25);
  
  // Invoice details box
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.rect(140, 35, 60, 25, 'F');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice Number:', 145, 43);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.invoice_number, 145, 49);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Date:', 145, 55);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(invoice.issue_date).toLocaleDateString(), 145, 61);
  
  // Bill to section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('BILL TO:', 20, 70);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(invoice.user.name, 20, 78);
  doc.text(`@${invoice.user.username}`, 20, 84);
  doc.text(invoice.user.email, 20, 90);
  
  // Items table
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(20, 105, 170, 10, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.text('DESCRIPTION', 25, 111);
  doc.text('AMOUNT', 160, 111);
  
  // Table content
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFont('helvetica', 'normal');
  const planName = invoice.plan_type === 'monthly' ? 'Yearly Pro Subscription' : 'Lifetime Pro Access';
  doc.text(planName, 25, 121);
  doc.text(`₹${invoice.amount.toFixed(2)}`, 160, 121);
  
  // Horizontal line
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 126, 190, 126);
  
  // Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL:', 130, 136);
  doc.setFontSize(14);
  doc.text(`₹${invoice.amount.toFixed(2)}`, 160, 136);
  
  // Payment status
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const statusColor: [number, number, number] = invoice.status === 'paid' ? [34, 197, 94] : [234, 179, 8];
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.text(`STATUS: ${invoice.status.toUpperCase()}`, 25, 136);
  
  // Footer
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  doc.text('Thank you for choosing MagVerse AI!', 20, 160);
  doc.text('For support, contact us at: support@magverse.ai', 20, 166);
  
  // Payment details
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Details:', 20, 180);
  doc.setFont('helvetica', 'normal');
  doc.text('This invoice has been generated automatically upon successful payment.', 20, 186);
  doc.text('All amounts are in Indian Rupees (INR).', 20, 192);
  
  // Terms
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text('This is a computer-generated invoice. No signature required.', 20, 270);
  doc.text('© 2025 MagVerse AI. All rights reserved.', 20, 276);
  
  // Border
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.5);
  doc.rect(10, 10, 190, 277);
  
  // Save the PDF
  doc.save(`Invoice-${invoice.invoice_number}.pdf`);
};
