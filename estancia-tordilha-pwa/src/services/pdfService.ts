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

export const generateImageRightsPDF = async (data: {
    responsibleName: string;
    rg: string;
    cpf: string;
    address: string;
    city: string;
    state: string;
    studentNames: string;
    authorized: boolean;
    date: string;
}) => {
    const doc = new jsPDF() as any;
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - (2 * margin);
    let y = 30;

    // Logo / Header
    doc.setFontSize(22);
    doc.setTextColor(234, 179, 8); // #EAB308
    doc.text('Estância Tordilha', pageWidth / 2, y, { align: 'center' });
    
    y += 15;
    doc.setFontSize(14);
    doc.setTextColor(26, 29, 30);
    doc.text('TERMO DE AUTORIZAÇÃO DE USO DE IMAGEM', pageWidth / 2, y, { align: 'center' });
    
    y += 15;
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    
    const text1 = `Eu, ${data.responsibleName}, portador(a) do RG nº ${data.rg}, CPF nº ${data.cpf}, residente e domiciliado(a) à ${data.address}, cidade de ${data.city} no estado ${data.state}.`;
    
    const lines1 = doc.splitTextToSize(text1, contentWidth);
    doc.text(lines1, margin, y);
    y += (lines1.length * 7) + 10;

    doc.setFont(undefined, 'bold');
    doc.text(data.authorized ? 'AUTORIZO ( X )    NÃO AUTORIZO (   )' : 'AUTORIZO (   )    NÃO AUTORIZO ( X )', margin, y);
    doc.setFont(undefined, 'normal');
    y += 10;

    const text2 = `a Estância Tordilha, empresa com sede na Estrada João Cecom, 2200 Altos da Bela Vista – Indaiatuba SP inscrita no CNPJ sob o nº 21.601.404/0001-00 e suas empresas coligadas, a utilizar, de forma gratuita e por tempo indeterminado, a minha imagem e do meu filho (${data.studentNames}), para a utilização em materiais gráficos, mídia impressa, eletrônica (internet), que serão da Estância Tordilha e de suas empresas coligadas.`;
    
    const lines2 = doc.splitTextToSize(text2, contentWidth);
    doc.text(lines2, margin, y);
    y += (lines2.length * 7) + 10;

    const text3 = `A presente autorização é concedida a título gratuito, abrangendo o uso da imagem acima mencionada em todo território nacional e no exterior, das seguintes formas: (I) out door; (II) bus door; folhetos em geral (encartes, mala direta, catálogo, etc.); (III) anúncio em revistas e jornais em geral; (IV) postais; (V) cartões; (VI) back-light; (VII) mídia eletrônica (painéis, vídeo-posts, televisão, cinema, rede mundial de computadores, internet, site da empresa, redes sociais, facebook, instagram, youtube entre outros).`;
    
    const lines3 = doc.splitTextToSize(text3, contentWidth);
    doc.text(lines3, margin, y);
    y += (lines3.length * 7) + 10;

    const text4 = `Por esta ser a expressão da minha vontade declaro que autorizo o uso acima descrito sem que nada haja a ser reclamado a título de direitos conexos à minha imagem ou a qualquer outro, e assino a presente autorização.`;
    
    const lines4 = doc.splitTextToSize(text4, contentWidth);
    doc.text(lines4, margin, y);
    y += (lines4.length * 7) + 20;

    const dateText = `Indaiatuba, SP ${data.date}`;
    doc.text(dateText, margin, y);
    
    y += 30;
    doc.setDrawColor(200);
    doc.line(margin + 20, y, pageWidth - margin - 20, y);
    y += 7;
    doc.setFont(undefined, 'bold');
    doc.text(data.responsibleName, pageWidth / 2, y, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(150);
    doc.text('Documento aceito digitalmente através da plataforma Estância Tordilha', pageWidth / 2, y + 5, { align: 'center' });

    doc.save(`autorizacao_imagem_${data.responsibleName.toLowerCase().replace(/\s+/g, '_')}.pdf`);
};
