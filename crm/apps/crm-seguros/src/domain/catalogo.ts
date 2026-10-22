/** Seguradoras parceiras da Portella e ramos atendidos (os mesmos do site). */
export const SEGURADORAS = [
  { id: 'porto', nome: 'Porto Seguro' },
  { id: 'hdi', nome: 'HDI' },
  { id: 'ituran', nome: 'Ituran' },
  { id: 'azul', nome: 'Azul' },
  { id: 'suhai', nome: 'Suhai' },
  { id: 'tokio', nome: 'Tokio Marine' },
  { id: 'sulamerica', nome: 'SulAmérica' },
  { id: 'liberty', nome: 'Liberty' },
  { id: 'bradesco', nome: 'Bradesco Seguros' },
  { id: 'mapfre', nome: 'Mapfre' },
  { id: 'allianz', nome: 'Allianz' },
  { id: 'sompo', nome: 'Sompo' },
] as const;

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
