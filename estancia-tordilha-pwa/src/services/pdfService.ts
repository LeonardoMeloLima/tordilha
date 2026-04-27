import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const BRAND: [number, number, number] = [78, 89, 63];      // #4E593F
const DARK:  [number, number, number] = [26, 29, 30];      // #1A1D1E
const GRAY:  [number, number, number] = [120, 120, 120];
const ALT_ROW: [number, number, number] = [247, 249, 246]; // very light green-tinted

// ─── Logo loader ──────────────────────────────────────────────────────────────
const loadLogoBase64 = async (): Promise<string | null> => {
    try {
        const response = await fetch('/logo-marrom.png');
        if (!response.ok) return null;
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
};

// ─── Shared header ────────────────────────────────────────────────────────────
// Returns the Y position where body content should start.
const addHeader = (
    doc: any,
    title: string,
    subtitle: string,
    logo: string | null
): number => {
    const W = doc.internal.pageSize.getWidth();

    // ── Narrow top green band (text only, no logo) ──────────────────────────
    doc.setFillColor(...BRAND);
    doc.rect(0, 0, W, 18, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('ESTÂNCIA TORDILHA', 14, 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(195, 210, 185);
    doc.text('Sistema de Gestão Equoterapêutica', 14, 14.5);

    // ── White zone: title left + logo right ─────────────────────────────────
    // Logo on the right side of white area (logo-marrom is brown, perfect on white)
    const LOGO_W = 38;
    const LOGO_H = 16;
    const LOGO_X = W - 14 - LOGO_W;
    const LOGO_Y = 22;

    if (logo) {
        doc.addImage(logo, 'PNG', LOGO_X, LOGO_Y, LOGO_W, LOGO_H, undefined, 'FAST');
    }

    // Report title — stays left, doesn't overlap logo
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.setTextColor(...DARK);
    doc.text(title, 14, 34);

    // Subtitle / date range
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    doc.text(subtitle, 14, 42);

    // Separator line
    doc.setDrawColor(...BRAND);
    doc.setLineWidth(0.4);
    doc.line(14, 46, W - 14, 46);

    return 54; // first content Y
};

// ─── Shared footer ────────────────────────────────────────────────────────────
const addFooter = (doc: any) => {
    const pageCount = doc.internal.getNumberOfPages();
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const generatedAt = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.line(14, H - 16, W - 14, H - 16);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(160, 160, 160);
        doc.text(`Gerado em ${generatedAt} — Estância Tordilha`, 14, H - 9);
        doc.text(`Página ${i} de ${pageCount}`, W - 14, H - 9, { align: 'right' });
    }
};

// ─── Shared table options ─────────────────────────────────────────────────────
const tableDefaults = {
    theme: 'grid' as const,
    headStyles: {
        fillColor: BRAND,
        textColor: [255, 255, 255] as [number, number, number],
        fontSize: 9,
        fontStyle: 'bold' as const,
        cellPadding: 4,
    },
    styles: {
        fontSize: 9,
        cellPadding: 3,
        lineColor: [230, 230, 230] as [number, number, number],
        lineWidth: 0.1,
    },
    alternateRowStyles: {
        fillColor: ALT_ROW,
    },
    margin: { left: 14, right: 14 },
};

// ─── Section title helper ─────────────────────────────────────────────────────
const addSectionTitle = (doc: any, text: string, y: number): number => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...DARK);
    doc.text(text, 14, y);

    // Accent underline
    const textWidth = doc.getTextWidth(text);
    doc.setDrawColor(...BRAND);
    doc.setLineWidth(1.2);
    doc.line(14, y + 2, 14 + textWidth, y + 2);

    return y + 8;
};

// ─── Public: simple single-table PDF ─────────────────────────────────────────
export const generatePDF = async (
    title: string,
    columns: string[],
    data: any[][],
    fileName: string = 'relatorio.pdf',
    subtitle?: string
) => {
    const doc = new jsPDF() as any;
    const logo = await loadLogoBase64();
    const now = new Date();
    const sub = subtitle ?? `Emitido em ${format(now, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`;

    const startY = addHeader(doc, title, sub, logo);

    autoTable(doc, {
        startY,
        head: [columns],
        body: data,
        ...tableDefaults,
    });

    addFooter(doc);
    doc.save(fileName);
};

// ─── Public: multi-section social impact PDF ──────────────────────────────────
export const generateSocialImpactPDF = async (
    sections: { title: string; columns: string[]; data: any[][] }[],
    fileName: string = 'impacto_social.pdf'
) => {
    const doc = new jsPDF() as any;
    const logo = await loadLogoBase64();
    const now = new Date();

    const periodoInicio = format(startOfMonth(subMonths(now, 5)), "dd/MM/yyyy");
    const periodoFim = format(endOfMonth(now), "dd/MM/yyyy");
    const subtitle = `Período: ${periodoInicio} a ${periodoFim}`;

    let currentY = addHeader(doc, 'Relatório de Impacto Social', subtitle, logo);

    sections.forEach((section, idx) => {
        // New page if this section won't fit
        if (idx > 0 && currentY > doc.internal.pageSize.getHeight() - 70) {
            doc.addPage();
            currentY = 20;
        }

        currentY = addSectionTitle(doc, section.title, currentY);

        autoTable(doc, {
            startY: currentY,
            head: [section.columns],
            body: section.data,
            ...tableDefaults,
        });

        currentY = (doc as any).lastAutoTable.finalY + 14;
    });

    addFooter(doc);
    doc.save(fileName);
};

// ─── Public: clinical evolution PDF with legend ───────────────────────────────
export const generateEvolucaoClinicaPDF = async (
    studentName: string,
    data: any[][],
    subtitle: string,
    fileName: string
) => {
    const doc = new jsPDF() as any;
    const logo = await loadLogoBase64();

    let currentY = addHeader(doc, `Evolução Clínica: ${studentName}`, subtitle, logo);
    const W = doc.internal.pageSize.getWidth();

    // ── Legend (compact, one line, above the table) ───────────────────────────
    const items = [
        { key: 'C', label: 'Cognitivo' },
        { key: 'P', label: 'Pedagógico' },
        { key: 'S', label: 'Social' },
        { key: 'E', label: 'Emocional' },
        { key: 'A', label: 'Agitação' },
        { key: 'I', label: 'Interação' },
        { key: 'F', label: 'Físico' },
    ];

    doc.setFontSize(6.5);
    // Build a single-line string to measure total width
    let legendLine = '';
    items.forEach((item, i) => { legendLine += `${item.key} ${item.label}${i < items.length - 1 ? '   ' : ''}`; });

    // Render each item inline, key in brand color, label in gray
    let cx = 14;
    items.forEach((item, i) => {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BRAND);
        doc.text(item.key, cx, currentY);
        cx += doc.getTextWidth(item.key) + 1;

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...GRAY);
        const label = item.label + (i < items.length - 1 ? '     ' : '');
        doc.text(label, cx, currentY);
        cx += doc.getTextWidth(label);
    });

    // Scale note — right-aligned on same line
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...GRAY);
    doc.text('Escala: 1 a 5', W - 14, currentY, { align: 'right' });

    currentY += 6;

    autoTable(doc, {
        startY: currentY,
        head: [["Data", "C", "P", "S", "E", "A", "I", "F", "Observações"]],
        body: data,
        ...tableDefaults,
        columnStyles: {
            0: { cellWidth: 22 },
            1: { cellWidth: 10, halign: 'center' as const },
            2: { cellWidth: 10, halign: 'center' as const },
            3: { cellWidth: 10, halign: 'center' as const },
            4: { cellWidth: 10, halign: 'center' as const },
            5: { cellWidth: 10, halign: 'center' as const },
            6: { cellWidth: 10, halign: 'center' as const },
            7: { cellWidth: 10, halign: 'center' as const },
            8: { cellWidth: 'auto' as any },
        },
    });

    addFooter(doc);
    doc.save(fileName);
};

// ─── Public: image rights term PDF (unchanged logic, styled header) ───────────
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
    const logo = await loadLogoBase64();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - margin * 2;

    let y = addHeader(
        doc,
        'Termo de Autorização de Uso de Imagem',
        `Emitido em ${data.date}`,
        logo
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);

    const text1 = `Eu, ${data.responsibleName}, portador(a) do RG nº ${data.rg}, CPF nº ${data.cpf}, residente e domiciliado(a) à ${data.address}, cidade de ${data.city} no estado ${data.state}.`;
    const lines1 = doc.splitTextToSize(text1, contentWidth);
    doc.text(lines1, margin, y);
    y += lines1.length * 7 + 10;

    doc.setFont('helvetica', 'bold');
    doc.text(
        data.authorized
            ? 'AUTORIZO ( X )    NÃO AUTORIZO (   )'
            : 'AUTORIZO (   )    NÃO AUTORIZO ( X )',
        margin, y
    );
    doc.setFont('helvetica', 'normal');
    y += 10;

    const text2 = `a Estância Tordilha, empresa com sede na Estrada João Cecom, 2200 Altos da Bela Vista Indaiatuba SP inscrita no CNPJ sob o nº 21.601.404/0001-00 e suas empresas coligadas, a utilizar, de forma gratuita e por tempo indeterminado, a minha imagem e do meu filho (${data.studentNames}), para a utilização em materiais gráficos, mídia impressa, eletrônica (internet), que serão da Estância Tordilha e de suas empresas coligadas.`;
    const lines2 = doc.splitTextToSize(text2, contentWidth);
    doc.text(lines2, margin, y);
    y += lines2.length * 7 + 10;

    const text3 = `A presente autorização é concedida a título gratuito, abrangendo o uso da imagem acima mencionada em todo território nacional e no exterior, das seguintes formas: (I) out door; (II) bus door; folhetos em geral (encartes, mala direta, catálogo, etc.); (III) anúncio em revistas e jornais em geral; (IV) postais; (V) cartões; (VI) back-light; (VII) mídia eletrônica (painéis, vídeo-posts, televisão, cinema, rede mundial de computadores, internet, site da empresa, redes sociais, facebook, instagram, youtube entre outros).`;
    const lines3 = doc.splitTextToSize(text3, contentWidth);
    doc.text(lines3, margin, y);
    y += lines3.length * 7 + 10;

    const text4 = `Por esta ser a expressão da minha vontade declaro que autorizo o uso acima descrito sem que nada haja a ser reclamado a título de direitos conexos à minha imagem ou a qualquer outro, e assino a presente autorização.`;
    const lines4 = doc.splitTextToSize(text4, contentWidth);
    doc.text(lines4, margin, y);
    y += lines4.length * 7 + 20;

    doc.text(`Indaiatuba, SP ${data.date}`, margin, y);
    y += 30;

    doc.setDrawColor(200);
    doc.line(margin + 20, y, pageWidth - margin - 20, y);
    y += 7;

    doc.setFont('helvetica', 'bold');
    doc.text(data.responsibleName, pageWidth / 2, y, { align: 'center' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150);
    doc.text(
        'Documento aceito digitalmente através da plataforma Estância Tordilha',
        pageWidth / 2, y + 5, { align: 'center' }
    );

    addFooter(doc);
    doc.save(`autorizacao_imagem_${data.responsibleName.toLowerCase().replace(/\s+/g, '_')}.pdf`);
};
