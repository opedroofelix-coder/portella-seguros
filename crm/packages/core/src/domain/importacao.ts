import type { Endereco, TipoPessoa } from './cliente';

/**
 * Contrato do arquivo JSON gerado pelo importador da planilha (packages/importer) e lido
 * pela tela "Importar" de cada CRM. Os registros se ligam pela `chave` do cliente.
 */
export interface ArquivoImportacao {
  versao: 1;
  sistema: 'seguros' | 'consorcio';
  origem: string;
  geradoEm: string;
  clientes: ClienteImportado[];
  [colecao: string]: unknown;
}

export interface ClienteImportado {
  /** Identificador estável: CPF/CNPJ quando houver, senão nome + telefone normalizados. */
  chave: string;
  nome: string;
  tipoPessoa?: TipoPessoa;
  documento?: string;
  telefone?: string;
  email?: string;
  dataNascimento?: string;
  endereco?: Endereco;
  observacoes?: string;
  /** Nome do corretor responsável, como aparece na planilha. */
  responsavel?: string;
}

/** Apólice no arquivo de seguros; valores em reais (número) e datas AAAA-MM-DD. */
export interface ApoliceImportada {
  chave: string;
  clienteChave: string;
  seguradora: string;
  ramo: string;
  numero?: string;
  item?: string;
  inicioVigencia: string;
  fimVigencia?: string;
  vigenciaEstimada?: boolean;
  premioLiquido?: number;
  premioTotal?: number;
  comissaoPercentual?: number;
  formaPagamento?: string;
  observacoes?: string;
  responsavel?: string;
}

/** Cota no arquivo de consórcio; valores em reais (número) e datas AAAA-MM-DD. */
export interface CotaImportada {
  chave: string;
  clienteChave: string;
  administradora: string;
  numeroProposta?: string;
  grupo?: string;
  cota?: string;
  tipoBem?: string;
  valorCredito: number;
  prazoMeses?: number;
  valorParcela?: number;
  dataAdesao: string;
  parcelasPagas?: number;
  status?: string;
  dataContemplacao?: string;
  formaContemplacao?: string;
  observacoes?: string;
  responsavel?: string;
}

/** Proposta com a comissão controlada por saldo (abas "A Receber" e "Comissões <produtor>"); valores em reais. */
export interface PropostaImportada {
  chave: string;
  clienteChave: string;
  /** Chave da apólice ou cota criada para a mesma venda. */
  vendaChave?: string;
  clienteNome: string;
  numero?: string;
  data: string;
  companhia: string;
  produto: string;
  tipoNegocio?: 'novo' | 'renovacao';
  premioLiquido?: number;
  comissaoPercentual?: number;
  comissaoReceber: number;
  percentualVitalicio?: number;
  /** Produtores pelo nome que aparece na planilha, com o % de repasse. */
  produtores: Array<{ nome: string; percentual: number }>;
  recebimentos: Array<{
    chave: string;
    data: string;
    valor: number;
    parcela?: string;
    repasses?: Record<string, number>;
  }>;
  observacoes?: string;
}

/** Estorno (seção "Controle de Estornos" das abas de produtor); valores em reais, positivos. */
export interface EstornoImportado {
  chave: string;
  produtor?: string;
  segurado: string;
  numeroApolice?: string;
  companhia: string;
  produto: string;
  data: string;
  valor: number;
  descontoProdutor: number;
}

/** Pagamento já feito ao produtor no mês ("Comissão Paga"); valor em reais. */
export interface PagamentoImportado {
  chave: string;
  produtor: string;
  mes: string;
  data: string;
  valor: number;
}

/** Movimento de conta (extrato bancário, poupança); valor em reais, sempre positivo. */
export interface MovimentoImportado {
  chave: string;
  conta: string;
  data: string;
  descricao: string;
  tipo: 'entrada' | 'saida' | 'saldo_inicial';
  valor: number;
  documento?: string;
}

/** Despesa da empresa (contas a pagar); valores em reais. */
export interface DespesaImportada {
  chave: string;
  descricao: string;
  vencimento?: string;
  pagamento?: string;
  valor: number;
  pago: number;
  categoria?: string;
}

/** Totais mensais da aba "Faturamento"; valores em reais. */
export interface FechamentoImportado {
  mes: string;
  faturamento?: number;
  creditoConsorcio?: number;
}

/** Id determinístico: reimportar a mesma planilha atualiza os registros em vez de duplicar. */
export const idImportado = (tipo: string, chave: string) => `imp:${tipo}:${chave}`;
