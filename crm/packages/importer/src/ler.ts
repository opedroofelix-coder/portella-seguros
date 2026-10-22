import ExcelJS from 'exceljs';
import { readFile } from 'node:fs/promises';
import officeCrypto from 'officecrypto-tool';
import type { Aba } from './converter';
import type { Celula } from './valores';

/** Lê todas as abas visíveis da planilha. Planilhas protegidas por senha são abertas só em memória. */
export async function lerPlanilha(caminho: string, senha?: string): Promise<Aba[]> {
  let conteudo = await readFile(caminho);
  if (officeCrypto.isEncrypted(conteudo)) {
    if (!senha) throw new Error('A planilha está protegida por senha. Informe-a em PLANILHA_SENHA.');
    try {
      conteudo = await officeCrypto.decrypt(conteudo, { password: senha });
    } catch {
      throw new Error('Senha da planilha incorreta.');
    }
  }
  const livro = new ExcelJS.Workbook();
  await livro.xlsx.load(conteudo as unknown as ArrayBuffer);
  return livro.worksheets
    .filter((aba) => aba.state === 'visible')
    .map((aba) => {
      const linhas: Celula[][] = [];
      aba.eachRow({ includeEmpty: true }, (linha, numero) => {
        const valores = (linha.values as Celula[]).slice(1); // exceljs começa as colunas em 1
        linhas[numero - 1] = valores;
      });
      return { nome: aba.name, linhas: Array.from(linhas, (l) => l ?? []) };
    });
}
