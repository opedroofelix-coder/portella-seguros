import type { Importacao } from '@portella/app-base';
import { prepararComissoesImportadas } from '@portella/app-base';
import type {
  ApoliceImportada,
  DespesaImportada,
  FechamentoImportado,
  MovimentoImportado,
  Usuario,
} from '@portella/core';
import {
  idImportado,
  lerArquivoImportacao,
  normalizar,
  paraCentavos,
  prepararClientes,
  resolverResponsavel,
} from '@portella/core';
import type { Apolice } from '../domain/apolice';
import { validarApolice } from '../domain/apolice';
import { RAMOS, SEGURADORAS } from '../domain/catalogo';
import type { Despesa, Fechamento, Movimento } from '../domain/financeiro';
import type { ServicosSeguros } from './servicos';

const letras = (s: string) => normalizar(s).replace(/[^a-z]/g, '');
const centavos = (reais?: number) => (reais == null ? undefined : (paraCentavos(reais) ?? undefined));

/** "PORTO SEGURO CIA" → "porto"; desconhecida fica com o nome original. */
export function identificarSeguradora(nome: string): string {
  const n = letras(nome);
  const achada = SEGURADORAS.find(
    (s) => n.includes(letras(s.nome)) || n.startsWith(s.id) || s.apelidos?.some((a) => n.includes(letras(a))),
  );
  return achada?.id ?? nome.trim();
}

export function identificarRamo(nome: string): Apolice['ramo'] {
  const n = normalizar(nome);
  // O id só vale como palavra inteira: "Comércio" e "Consórcio" contêm "rc", mas não são RC.
  const achado = RAMOS.find((r) => n.includes(normalizar(r.nome)) || new RegExp(`\\b${r.id}\\b`).test(n));
  if (achado) return achado.id;
  if (/automovel|veiculo|carro|moto/.test(n)) return 'auto';
  if (/resid|casa|apartamento/.test(n)) return 'residencial';
  if (/empres|condominio|comercial/.test(n)) return 'empresarial';
  if (/aluguel|fianca/.test(n)) return 'fianca';
  if (/respons|^rc\b/.test(n)) return 'rc';
  if (/transporte/.test(n)) return 'transportes';
  if (/bike|celular|portat|camera|notebook/.test(n)) return 'equipamentos';
  if (/pet/.test(n)) return 'pet';
  return 'outros';
}

const motivo = (e: unknown) =>
  Object.values((e as { campos?: Record<string, string> }).campos ?? {}).join(' ') || (e as Error).message;

export function criarImportacao(servicos: ServicosSeguros): Importacao {
  return {
    parte: 'seguros',
    descricao:
      'Clientes, apólices, propostas com os recebimentos, estornos, pagamentos aos produtores e financeiro da planilha da Portella. Reimportar o mesmo arquivo atualiza os registros, sem duplicar.',
    async analisar(dados: unknown, ator: Usuario, equipe: Usuario[]) {
      const arquivo = lerArquivoImportacao(dados, 'seguros');
      const agora = new Date().toISOString();
      const { resolver, naoEncontrados } = resolverResponsavel(equipe, ator);
      const { clientes, idPorChave } = prepararClientes(arquivo, ator, resolver, agora);
      const avisos: string[] = [];
      const registro = { criadoEm: agora, atualizadoEm: agora, responsavelId: ator.id };

      const apolices: Apolice[] = [];
      const idApolice = new Map<string, string>();
      for (const a of (arquivo.apolices as ApoliceImportada[] | undefined) ?? []) {
        const item: Apolice = {
          id: idImportado('apolice', a.chave),
          clienteId: idPorChave.get(a.clienteChave) ?? '',
          seguradora: identificarSeguradora(a.seguradora),
          ramo: identificarRamo(a.ramo),
          numero: a.numero,
          item: a.item,
          inicioVigencia: a.inicioVigencia,
          fimVigencia: a.fimVigencia,
          vigenciaEstimada: a.vigenciaEstimada,
          premioLiquido: centavos(a.premioLiquido),
          premioTotal: centavos(a.premioTotal),
          comissaoPercentual: a.comissaoPercentual,
          formaPagamento: a.formaPagamento,
          observacoes: a.observacoes,
          renovacao: 'pendente',
          responsavelId: resolver(a.responsavel),
          criadoEm: agora,
          atualizadoEm: agora,
        };
        try {
          validarApolice(item);
          apolices.push(item);
          idApolice.set(a.chave, item.id);
        } catch (e) {
          avisos.push(`Apólice ${a.numero ?? a.chave} ignorada: ${motivo(e)}`);
        }
      }

      const comissoes = prepararComissoesImportadas(arquivo, ator, equipe, resolver, idPorChave, agora);

      const movimentos: Movimento[] = ((arquivo.movimentos as MovimentoImportado[] | undefined) ?? []).map(
        ({ chave, valor, ...m }) => ({
          ...m,
          ...registro,
          id: idImportado('movimento', chave),
          valor: centavos(valor) ?? 0,
        }),
      );
      const despesas: Despesa[] = ((arquivo.despesas as DespesaImportada[] | undefined) ?? []).map(
        ({ chave, valor, pago, ...d }) => ({
          ...d,
          ...registro,
          id: idImportado('despesa', chave),
          valor: centavos(valor) ?? 0,
          pago: centavos(pago) ?? 0,
        }),
      );
      const fechamentos: Fechamento[] = (
        (arquivo.fechamentos as FechamentoImportado[] | undefined) ?? []
      ).map((f) => ({
        ...registro,
        id: f.mes,
        mes: f.mes,
        faturamento: centavos(f.faturamento),
        creditoConsorcio: centavos(f.creditoConsorcio),
      }));

      const estimadas = apolices.filter((a) => a.vigenciaEstimada).length;
      if (estimadas)
        avisos.push(
          `${estimadas} apólice(s) com fim de vigência estimado (proposta + 12 meses): confirme na tela de apólices.`,
        );
      for (const nome of naoEncontrados)
        avisos.push(`Corretor "${nome}" não cadastrado: os registros ficaram com ${ator.nome}.`);

      return {
        resumo: [
          ['Clientes', clientes.length],
          ['Apólices', apolices.length],
          ...comissoes.resumo,
          ['Movimentos de conta', movimentos.length],
          ['Despesas', despesas.length],
          ['Meses de faturamento', fechamentos.length],
        ],
        avisos,
        confirmar: async () => {
          await servicos.clientes.importar(ator, clientes);
          await servicos.apolices.importar(ator, apolices);
          await comissoes.confirmar(servicos);
          await servicos.movimentos.importar(ator, movimentos);
          await servicos.despesas.importar(ator, despesas);
          await servicos.fechamentos.importar(ator, fechamentos);
        },
      };
    },
  };
}
