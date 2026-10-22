import type { Importacao } from '@portella/app-base';
import type { Usuario } from '@portella/core';
import { idImportado, lerArquivoImportacao, paraCentavos, prepararClientes, resolverResponsavel } from '@portella/core';
import type { Apolice } from '../domain/apolice';
import { validarApolice } from '../domain/apolice';
import { RAMOS, SEGURADORAS } from '../domain/catalogo';
import type { ServicosSeguros } from './servicos';

/** Apólice como vem do importador; valores em reais (número) e datas AAAA-MM-DD. */
export interface ApoliceImportada {
  chave: string;
  clienteChave: string;
  seguradora: string;
  ramo: string;
  numero?: string;
  item?: string;
  inicioVigencia: string;
  fimVigencia: string;
  premioLiquido?: number;
  premioTotal?: number;
  comissaoPercentual?: number;
  formaPagamento?: string;
  observacoes?: string;
  responsavel?: string;
}

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** "PORTO SEGURO CIA" → "porto"; desconhecida fica com o nome original. */
export function identificarSeguradora(nome: string): string {
  const n = semAcento(nome).replace(/[^a-z]/g, '');
  const achada = SEGURADORAS.find((s) => n.includes(semAcento(s.nome).replace(/[^a-z]/g, '')) || n.startsWith(s.id));
  return achada?.id ?? nome.trim();
}

export function identificarRamo(nome: string): Apolice['ramo'] {
  const n = semAcento(nome);
  const achado = RAMOS.find((r) => n.includes(semAcento(r.nome)) || n.includes(r.id));
  if (achado) return achado.id;
  if (/automovel|veiculo|carro|moto/.test(n)) return 'auto';
  if (/resid|casa|apartamento/.test(n)) return 'residencial';
  if (/empres|condominio|comercial/.test(n)) return 'empresarial';
  return 'outros';
}

export function criarImportacao(servicos: ServicosSeguros): Importacao {
  return {
    descricao: 'Clientes e apólices da planilha da Portella. Reimportar o mesmo arquivo atualiza os registros, sem duplicar.',
    async analisar(dados: unknown, ator: Usuario, equipe: Usuario[]) {
      const arquivo = lerArquivoImportacao(dados, 'seguros');
      const agora = new Date().toISOString();
      const { resolver, naoEncontrados } = resolverResponsavel(equipe, ator);
      const { clientes, idPorChave } = prepararClientes(arquivo, ator, resolver, agora);
      const avisos: string[] = [];

      const apolices: Apolice[] = [];
      for (const a of (arquivo.apolices as ApoliceImportada[] | undefined) ?? []) {
        const clienteId = idPorChave.get(a.clienteChave);
        const item: Apolice = {
          id: idImportado('apolice', a.chave),
          clienteId: clienteId ?? '',
          seguradora: identificarSeguradora(a.seguradora),
          ramo: identificarRamo(a.ramo),
          numero: a.numero,
          item: a.item,
          inicioVigencia: a.inicioVigencia,
          fimVigencia: a.fimVigencia,
          premioLiquido: a.premioLiquido == null ? undefined : (paraCentavos(a.premioLiquido) ?? undefined),
          premioTotal: a.premioTotal == null ? undefined : (paraCentavos(a.premioTotal) ?? undefined),
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
        } catch (e) {
          const campos = Object.values((e as { campos?: Record<string, string> }).campos ?? {}).join(' ');
          avisos.push(`Apólice ${a.numero ?? a.chave} ignorada: ${campos || (e as Error).message}`);
        }
      }
      for (const nome of naoEncontrados) avisos.push(`Corretor "${nome}" não cadastrado: os registros ficaram com ${ator.nome}.`);

      return {
        resumo: [
          ['Clientes', clientes.length],
          ['Apólices', apolices.length],
        ],
        avisos,
        confirmar: async () => {
          await servicos.clientes.importar(ator, clientes);
          await servicos.apolices.importar(ator, apolices);
        },
      };
    },
  };
}
