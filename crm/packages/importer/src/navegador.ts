/**
 * O que a tela "Importar" usa no navegador: ler a planilha (com ou sem senha) e convertê-la nos
 * dados de cada CRM. Nada aqui depende do Node.
 */
import { converterComissoes, ehFormatoComissoes } from './comissoes';
import { converter } from './converter';
import { lerAbas } from './planilha';

export { ErroSenhaPlanilha, planilhaProtegida } from './planilha';

/** Planilha da corretora → dados dos dois CRMs e avisos da conversão. */
export async function converterPlanilha(bytes: Uint8Array, nome: string, senha?: string) {
  const abas = await lerAbas(bytes, senha);
  const { seguros, consorcio, relatorio } = ehFormatoComissoes(abas)
    ? converterComissoes(abas, nome)
    : converter(abas, nome);
  return { seguros, consorcio, avisos: relatorio.avisos };
}
