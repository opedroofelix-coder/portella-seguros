import { readFile } from 'node:fs/promises';
import type { Aba } from './converter';
import { ErroSenhaPlanilha, lerAbas } from './planilha';

/** Lê todas as abas visíveis da planilha. Planilhas protegidas por senha são abertas só em memória. */
export async function lerPlanilha(caminho: string, senha?: string): Promise<Aba[]> {
  try {
    return await lerAbas(new Uint8Array(await readFile(caminho)), senha);
  } catch (e) {
    if (e instanceof ErroSenhaPlanilha && e.motivo === 'falta')
      throw new Error('A planilha está protegida por senha. Informe-a em PLANILHA_SENHA.');
    throw e;
  }
}
