import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generatePDF = async (
    title: string,
    columns: string[],
    data: any[][],
    fileName: string = 'relatorio.pdf'
) => {
    const doc = new jsPDF() as any;
    const timestamp = new Date().toLocaleString('pt-BR');

    // Header
    doc.setFontSize(20);
    doc.setTextColor(26, 29, 30); // #1A1D1E
    doc.text('Estância Tordilha', 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${timestamp}`, 14, 30);

    doc.setDrawColor(234, 179, 8); // #EAB308
    doc.setLineWidth(0.5);
    doc.line(14, 35, 196, 35);

    // Title
    doc.setFontSize(16);
    doc.setTextColor(26, 29, 30);
    doc.text(title, 14, 45);

    // Table
    autoTable(doc, {
        startY: 52,
        head: [columns],
        body: data,
        theme: 'striped',
        headStyles: {
            fillColor: [234, 179, 8],
            textColor: [255, 255, 255],
            fontSize: 12,
            fontStyle: 'bold',
        },
        alternateRowStyles: {
            fillColor: [250, 250, 250],
        },
        margin: { top: 52 },
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
            `Página ${i} de ${pageCount}`,
            doc.internal.pageSize.getWidth() / 2,
            doc.internal.pageSize.getHeight() - 10,
            { align: 'center' }
        );
    }

    doc.save(fileName);
};
