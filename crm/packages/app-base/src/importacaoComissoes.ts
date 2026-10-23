import type {
  ArquivoImportacao,
  EstornoImportado,
  PagamentoImportado,
  PropostaImportada,
  Usuario,
} from '@portella/core';
import { prepararEstornos, prepararPagamentos, prepararPropostas } from '@portella/core';
import type { ServicosBase } from './servicos';

/**
 * Parte da importação comum aos dois CRMs: propostas (com os recebimentos e o repasse de cada
 * produtor), estornos e pagamentos aos produtores. As seguradoras e os produtos novos entram nas listas.
 */
export function prepararComissoesImportadas(
  arquivo: ArquivoImportacao,
  ator: Usuario,
  equipe: Usuario[],
  resolver: (nome?: string) => string,
  idClientePorChave: Map<string, string>,
  agora: string,
) {
  const padrao = new Map(equipe.map((u) => [u.id, u.percentualRepasse]));
  const propostas = prepararPropostas(
    (arquivo.propostas as PropostaImportada[] | undefined) ?? [],
    ator,
    resolver,
    idClientePorChave,
    agora,
    (id) => padrao.get(id),
  );
  const estornos = prepararEstornos(
    (arquivo.estornos as EstornoImportado[] | undefined) ?? [],
    ator,
    resolver,
    agora,
  );
  const pagamentos = prepararPagamentos(
    (arquivo.pagamentos as PagamentoImportado[] | undefined) ?? [],
    ator,
    resolver,
    agora,
  );
  return {
    resumo: [
      ['Propostas', propostas.length],
      ['Recebimentos', propostas.reduce((t, p) => t + p.recebimentos.length, 0)],
      ['Estornos', estornos.length],
      ['Pagamentos a produtores', pagamentos.length],
    ] as Array<[string, number]>,
    async confirmar(servicos: ServicosBase) {
      await servicos.propostas.importar(ator, propostas);
      await servicos.estornos.importar(ator, estornos);
      await servicos.pagamentos.importar(ator, pagamentos);
      await servicos.catalogos.incluir(ator, 'seguradoras', [...new Set(propostas.map((p) => p.companhia))]);
      await servicos.catalogos.incluir(ator, 'produtos', [...new Set(propostas.map((p) => p.produto))]);
    },
  };
}
