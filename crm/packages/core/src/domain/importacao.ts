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

/** Parcela de comissão (abas "A Receber" e "Comissões <corretor>"); valores em reais. */
export interface ComissaoImportada {
  chave: string;
  clienteChave: string;
  /** Chave da apólice ou cota a que a parcela pertence. */
  vendaChave?: string;
  clienteNome: string;
  produto: string;
  companhia: string;
  numeroProposta?: string;
  dataProposta?: string;
  parcela?: string;
  dataRecebimento?: string;
  premio?: number;
  comissaoReceber: number;
  comissaoRecebida: number;
  percentualRepasse?: number;
  repasse?: number;
  repassePago?: number;
  estorno?: boolean;
  vendaDaCorretora?: boolean;
  observacoes?: string;
  responsavel?: string;
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
