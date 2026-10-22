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
  fimVigencia: string;
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
  grupo: string;
  cota: string;
  tipoBem?: string;
  valorCredito: number;
  prazoMeses: number;
  valorParcela?: number;
  dataAdesao: string;
  parcelasPagas?: number;
  status?: string;
  dataContemplacao?: string;
  formaContemplacao?: string;
  observacoes?: string;
  responsavel?: string;
}

/** Id determinístico: reimportar a mesma planilha atualiza os registros em vez de duplicar. */
export const idImportado = (tipo: string, chave: string) => `imp:${tipo}:${chave}`;
