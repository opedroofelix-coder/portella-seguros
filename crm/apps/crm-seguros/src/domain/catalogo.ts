export interface Seguradora {
  id: string;
  nome: string;
  /** Outros nomes que aparecem na planilha ou nas apólices antigas. */
  apelidos?: readonly string[];
  /** Ramos que a seguradora não oferece mais. */
  semRamos?: readonly string[];
}

/** Seguradoras parceiras da Portella (as mesmas da faixa do site). */
export const SEGURADORAS: readonly Seguradora[] = [
  { id: 'porto', nome: 'Porto Seguro' },
  { id: 'allianz', nome: 'Allianz' },
  { id: 'bradesco', nome: 'Bradesco Seguros' },
  { id: 'sulamerica', nome: 'SulAmérica', apelidos: ['sul america'] },
  { id: 'tokio', nome: 'Tokio Marine' },
  { id: 'hdi', nome: 'HDI' },
  { id: 'mapfre', nome: 'Mapfre' },
  // A Liberty virou Yelum: o id antigo continua valendo para as apólices já cadastradas.
  { id: 'liberty', nome: 'Yelum (antiga Liberty)', apelidos: ['yelum', 'liberty'] },
  { id: 'azul', nome: 'Azul' },
  { id: 'suhai', nome: 'Suhai' },
  { id: 'ituran', nome: 'Ituran' },
  { id: 'justos', nome: 'Justos' },
  { id: 'youse', nome: 'Youse' },
  { id: 'pier', nome: 'Pier' },
  // A Sompo não faz mais seguro de automóvel.
  { id: 'sompo', nome: 'Sompo', semRamos: ['auto'] },
];

/** Seguradoras parceiras que oferecem o ramo. */
export const seguradorasDoRamo = (ramo: string) => SEGURADORAS.filter((s) => !s.semRamos?.includes(ramo));

export const RAMOS = [
  { id: 'auto', nome: 'Auto' },
  { id: 'vida', nome: 'Vida' },
  { id: 'previdencia', nome: 'Previdência' },
  { id: 'saude', nome: 'Saúde' },
  { id: 'residencial', nome: 'Residencial' },
  { id: 'fianca', nome: 'Fiança Locatícia' },
  { id: 'rc', nome: 'Responsabilidade Civil' },
  { id: 'empresarial', nome: 'Empresarial' },
  { id: 'dental', nome: 'Dental' },
  { id: 'transportes', nome: 'Transportes' },
  { id: 'equipamentos', nome: 'Equipamentos portáteis' },
  { id: 'pet', nome: 'Pet' },
  { id: 'outros', nome: 'Outros' },
] as const;

export type Ramo = (typeof RAMOS)[number]['id'];

/** Ramos com vigência anual (renovação todo ano). Os demais são contratos contínuos (vida, saúde…). */
export const RAMOS_ANUAIS: ReadonlySet<Ramo> = new Set<Ramo>([
  'auto',
  'residencial',
  'empresarial',
  'rc',
  'fianca',
  'transportes',
  'equipamentos',
]);

const nomesSeguradoras = new Map<string, string>(SEGURADORAS.map((s) => [s.id, s.nome]));
const nomesRamos = new Map<string, string>(RAMOS.map((r) => [r.id, r.nome]));

/** A seguradora é guardada pelo id quando é parceira; outras ficam pelo nome digitado. */
export const nomeSeguradora = (id: string) => nomesSeguradoras.get(id) ?? id;
export const nomeRamo = (id: string) => nomesRamos.get(id) ?? id;
