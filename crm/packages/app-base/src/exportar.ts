import type { Centavos } from '@portella/core';
import { formatarDinheiro } from '@portella/core';

/** Célula de relatório: texto, valor em centavos ou percentual. Cada formato de saída a apresenta do seu jeito. */
export type CelulaRelatorio = string | { dinheiro: Centavos } | { percentual: number };

export interface SecaoRelatorio {
  titulo: string;
  colunas: string[];
  linhas: CelulaRelatorio[][];
  total?: CelulaRelatorio[];
  /** Altura mínima das linhas no PDF (pt): linhas em branco para preencher à mão, como no checklist. */
  alturaLinha?: number;
}

export interface DocumentoRelatorio {
  titulo: string;
  subtitulo?: string;
  /** Pares rótulo/valor mostrados antes das tabelas (ex.: líquido a pagar). */
  resumo?: Array<[string, CelulaRelatorio]>;
  /** No PDF, o resumo em dois pares por linha na largura toda (fichas com muitos dados, como o checklist). */
  resumoEmColunas?: boolean;
  secoes: SecaoRelatorio[];
  /** Nome do arquivo, sem extensão. */
  arquivo: string;
}

const texto = (c: CelulaRelatorio): string =>
  typeof c === 'string'
    ? c
    : 'dinheiro' in c
      ? formatarDinheiro(c.dinheiro)
      : `${String(c.percentual).replace('.', ',')}%`;
const numerico = (c: CelulaRelatorio) => typeof c !== 'string';

export function nomeArquivo(...partes: string[]): string {
  return partes
    .join('-')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function baixar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const MARINHO: [number, number, number] = [26, 43, 75];
const DOURADO: [number, number, number] = [201, 168, 94];

/** PDF A4 com cabeçalho da corretora, resumo e uma tabela por seção. Devolve o Blob gerado. */
export async function exportarPdf(doc: DocumentoRelatorio, baixarArquivo = true): Promise<Blob> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const largura = pdf.internal.pageSize.getWidth();
  pdf.setFillColor(...MARINHO);
  pdf.rect(0, 0, largura, 70, 'F');
  pdf.setTextColor(...DOURADO);
  pdf.setFont('times', 'normal');
  pdf.setFontSize(20);
  pdf.text('Portella Corretora de Seguros', 40, 34);
  pdf.setFontSize(11);
  pdf.setTextColor(244, 238, 226);
  pdf.text(doc.titulo, 40, 54);
  let y = 96;
  pdf.setTextColor(30, 30, 30);
  if (doc.subtitulo) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text(doc.subtitulo, 40, y);
    y += 18;
  }
  if (doc.resumo?.length && doc.resumoEmColunas) {
    const pares = doc.resumo.map(([rotulo, valor]) => [rotulo, texto(valor)]);
    const linhas: string[][] = [];
    for (let i = 0; i < pares.length; i += 2) linhas.push([...pares[i]!, ...(pares[i + 1] ?? ['', ''])]);
    autoTable(pdf, {
      startY: y,
      body: linhas,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 110 },
        2: { fontStyle: 'bold', cellWidth: 110 },
      },
      margin: { left: 40, right: 40 },
    });
    y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16;
  } else if (doc.resumo?.length) {
    autoTable(pdf, {
      startY: y,
      body: doc.resumo.map(([rotulo, valor]) => [rotulo, texto(valor)]),
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 200 }, 1: { halign: 'right' } },
      margin: { left: 40, right: largura / 2 },
    });
    y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16;
  }
  const altura = pdf.internal.pageSize.getHeight();
  for (const secao of doc.secoes) {
    // O título não fica sozinho no pé da página: sem espaço para ele e algumas linhas, começa na próxima.
    if (y > altura - 120) {
      pdf.addPage();
      y = 48;
    }
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text(secao.titulo, 40, y);
    const numericas = new Set(
      secao.colunas.map((_, i) => i).filter((i) => secao.linhas.some((l) => l[i] != null && numerico(l[i]!))),
    );
    autoTable(pdf, {
      startY: y + 6,
      head: [secao.colunas],
      body: secao.linhas.length
        ? secao.linhas.map((l) => l.map(texto))
        : [[{ content: 'Nenhum lançamento.', colSpan: secao.colunas.length }]],
      foot: secao.total ? [secao.total.map(texto)] : undefined,
      styles: { fontSize: 8, cellPadding: 3, minCellHeight: secao.alturaLinha },
      headStyles: { fillColor: MARINHO, textColor: [244, 238, 226] },
      footStyles: { fillColor: [242, 236, 225], textColor: [26, 43, 75], fontStyle: 'bold' },
      columnStyles: Object.fromEntries([...numericas].map((i) => [i, { halign: 'right' as const }])),
      margin: { left: 40, right: 40 },
    });
    y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;
  }
  const blob = pdf.output('blob');
  if (baixarArquivo) baixar(blob, `${doc.arquivo}.pdf`);
  return blob;
}

/** Planilha Excel (.xlsx) com as mesmas seções; valores em reais ficam numéricos para somar. */
export async function exportarExcel(doc: DocumentoRelatorio, baixarArquivo = true): Promise<Blob> {
  const { default: ExcelJS } = await import('exceljs');
  const livro = new ExcelJS.Workbook();
  const aba = livro.addWorksheet('Relatório');
  const valor = (c: CelulaRelatorio) =>
    typeof c === 'string' ? c : 'dinheiro' in c ? c.dinheiro / 100 : c.percentual / 100;
  const formato = (c: CelulaRelatorio) =>
    typeof c === 'string' ? undefined : 'dinheiro' in c ? '"R$" #,##0.00' : '0.##%';
  const escrever = (celulas: CelulaRelatorio[], negrito = false) => {
    const linha = aba.addRow(celulas.map(valor));
    celulas.forEach((c, i) => {
      const celula = linha.getCell(i + 1);
      const f = formato(c);
      if (f) celula.numFmt = f;
      if (negrito) celula.font = { bold: true };
    });
  };
  aba.addRow([`Portella Corretora de Seguros — ${doc.titulo}`]).font = { bold: true, size: 14 };
  if (doc.subtitulo) aba.addRow([doc.subtitulo]);
  aba.addRow([]);
  for (const [rotulo, v] of doc.resumo ?? []) escrever([rotulo, v], true);
  for (const secao of doc.secoes) {
    aba.addRow([]);
    aba.addRow([secao.titulo]).font = { bold: true, size: 12 };
    const cab = aba.addRow(secao.colunas);
    cab.font = { bold: true, color: { argb: 'FFF4EEE2' } };
    cab.eachCell((c) => (c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A2B4B' } }));
    for (const l of secao.linhas) escrever(l);
    if (secao.total) escrever(secao.total, true);
  }
  aba.columns.forEach((col) => (col.width = 18));
  const buffer = await livro.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  if (baixarArquivo) baixar(blob, `${doc.arquivo}.xlsx`);
  return blob;
}
