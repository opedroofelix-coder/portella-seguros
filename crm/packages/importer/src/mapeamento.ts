import { normalizarCabecalho } from './valores';

/**
 * Sinônimos de cabeçalho para cada campo do CRM. Ajuste aqui quando a planilha usar outro nome.
 * A comparação ignora acentos, maiúsculas e pontuação.
 */
export const CAMPOS = {
  // Cliente
  nome: [
    'nome',
    'cliente',
    'segurado',
    'nome do cliente',
    'nome cliente',
    'nome do segurado',
    'razao social',
    'consorciado',
    'proponente',
  ],
  documento: ['cpf', 'cnpj', 'cpf cnpj', 'cpf ou cnpj', 'documento', 'doc'],
  telefone: ['telefone', 'celular', 'whatsapp', 'fone', 'tel', 'telefone celular', 'contato'],
  email: ['email', 'e mail'],
  dataNascimento: ['nascimento', 'data de nascimento', 'data nascimento', 'dt nascimento', 'dt nasc'],
  cep: ['cep'],
  logradouro: ['endereco', 'logradouro', 'rua'],
  numeroEndereco: ['numero endereco', 'n endereco'],
  bairro: ['bairro'],
  cidade: ['cidade', 'municipio'],
  uf: ['uf', 'estado'],
  responsavel: ['corretor', 'vendedor', 'responsavel', 'produtor', 'consultor', 'atendente'],
  observacoes: ['observacoes', 'observacao', 'obs', 'anotacoes'],

  // Seguro
  seguradora: ['seguradora', 'cia', 'companhia', 'cia seguradora'],
  ramo: ['ramo', 'produto', 'tipo de seguro', 'seguro', 'tipo seguro', 'modalidade'],
  numeroApolice: [
    'apolice',
    'n apolice',
    'numero apolice',
    'numero da apolice',
    'no apolice',
    'proposta',
    'n proposta',
  ],
  item: ['placa', 'veiculo', 'modelo', 'bem segurado', 'item segurado', 'objeto', 'risco'],
  vigencia: ['vigencia'],
  inicioVigencia: [
    'inicio vigencia',
    'inicio da vigencia',
    'vigencia inicial',
    'inicio',
    'data inicio',
    'ini vigencia',
  ],
  fimVigencia: [
    'fim vigencia',
    'fim da vigencia',
    'vigencia final',
    'final vigencia',
    'vencimento',
    'termino',
    'fim',
    'data fim',
    'renovacao',
  ],
  premioLiquido: ['premio liquido', 'premio liq', 'liquido'],
  premioTotal: ['premio total', 'premio', 'valor premio', 'premio bruto', 'valor total'],
  comissao: [
    'comissao',
    'comissao %',
    '% comissao',
    'percentual comissao',
    'comissao percentual',
    'perc comissao',
  ],
  formaPagamento: ['forma de pagamento', 'forma pagamento', 'pagamento', 'parcelamento'],

  // Consórcio
  administradora: ['administradora', 'adm', 'administradora consorcio'],
  grupo: ['grupo'],
  cota: ['cota', 'n cota', 'numero cota'],
  tipoBem: ['tipo de bem', 'bem', 'tipo bem', 'segmento', 'categoria'],
  valorCredito: [
    'credito',
    'valor do credito',
    'valor credito',
    'carta de credito',
    'valor da carta',
    'carta',
  ],
  prazoMeses: ['prazo', 'prazo meses', 'meses', 'prazo em meses', 'plano'],
  valorParcela: ['parcela', 'valor parcela', 'valor da parcela'],
  dataAdesao: ['adesao', 'data adesao', 'data de adesao', 'data da venda', 'data venda', 'venda'],
  parcelasPagas: ['parcelas pagas', 'pagas', 'qtd parcelas pagas'],
  status: ['status', 'situacao'],
  dataContemplacao: ['contemplacao', 'data contemplacao', 'data da contemplacao', 'contemplada em'],
  formaContemplacao: ['forma contemplacao', 'tipo contemplacao', 'contemplada por'],
} as const;

export type Campo = keyof typeof CAMPOS;

const ALIAS = new Map<string, Campo>();
for (const [campo, nomes] of Object.entries(CAMPOS) as Array<[Campo, readonly string[]]>) {
  for (const n of nomes) if (!ALIAS.has(normalizarCabecalho(n))) ALIAS.set(normalizarCabecalho(n), campo);
}

/** Identifica o campo de um cabeçalho; devolve undefined se não reconhecer. */
export function identificarCampo(cabecalho: string): Campo | undefined {
  const n = normalizarCabecalho(cabecalho);
  if (!n) return undefined;
  const exato = ALIAS.get(n);
  if (exato) return exato;
  // Coluna compartilhada ("Seguradora / Administradora"): vale como seguradora; a linha decide o sistema.
  if (/(^| )seguradora( |$)/.test(n) && /(^| )administradora( |$)/.test(n)) return 'seguradora';
  // "Data de início da vigência (dd/mm)" → procura o sinônimo mais longo contido no cabeçalho.
  let melhor: { campo: Campo; tamanho: number } | undefined;
  for (const [alias, campo] of ALIAS) {
    if (
      alias.length >= 4 &&
      new RegExp(`(^| )${alias}( |$)`).test(n) &&
      (!melhor || alias.length > melhor.tamanho)
    ) {
      melhor = { campo, tamanho: alias.length };
    }
  }
  return melhor?.campo;
}

/** Mapa coluna → campo. Um campo pode vir de várias colunas; vale o primeiro valor preenchido da linha. */
export function mapearCabecalhos(cabecalhos: string[]): Map<number, Campo> {
  const mapa = new Map<number, Campo>();
  cabecalhos.forEach((c, i) => {
    const campo = identificarCampo(c ?? '');
    if (campo) mapa.set(i, campo);
  });
  return mapa;
}

/** Quantos campos diferentes uma linha de cabeçalho reconhece. */
export const camposDistintos = (mapa: Map<number, Campo>) => new Set(mapa.values()).size;
