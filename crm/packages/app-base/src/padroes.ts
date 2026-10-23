import type { ProdutorInicial, TipoCatalogo } from '@portella/core';

/**
 * Produtores cadastrados no primeiro acesso (senha 1234, troca obrigatória): os da conversa com a
 * Portella e os que aparecem na planilha de comissões. O % é o repasse padrão, editável em Usuários.
 */
export const PRODUTORES_INICIAIS: ProdutorInicial[] = [
  { nome: 'Deliziane', percentualRepasse: 40 },
  { nome: 'Mary', percentualRepasse: 15 },
  { nome: 'Gisele', percentualRepasse: 50 },
  { nome: 'Gabriel' },
  { nome: 'Danila', percentualRepasse: 50 },
  { nome: 'Luana', percentualRepasse: 50 },
  { nome: 'Renata' },
  { nome: 'Carla', percentualRepasse: 20 },
  { nome: 'Felippe' },
  { nome: 'Silvana' },
];

/** Listas iniciais de produtos e seguradoras da proposta; a administradora edita em Configurações. */
export const CATALOGOS_PADRAO: Record<TipoCatalogo, string[]> = {
  produtos: [
    'Automóvel',
    'Residencial',
    'Saúde',
    'Vida',
    'Dental',
    'Consórcio',
    'Rastreador',
    'Assinatura Mensal',
    'Celular',
    'Equipamentos Portáteis',
    'Empresarial',
    'Aluguel',
    'Responsabilidade Civil',
    'RC Profissional',
    'Fiança Locatícia',
  ],
  seguradoras: [
    'Aliro',
    'Allianz',
    'Azos',
    'Akad',
    'Azul',
    'Azul por Assinatura',
    'Bp Seguradora',
    'Bradesco',
    'Darwin',
    'Excelsior',
    'Ezze',
    'GNDI',
    'HDI',
    'Itaú',
    'Ituran',
    'Justos',
    'Justos Mensal',
    'Liberty',
    'Loovi',
    'Mapfre',
    'Mitsui',
    'Novo Seguros',
    'Novo Seguros Mensal',
    'Pier',
    'Porto Seguro',
    'Servopa',
    'Sompo',
    'Suhai',
    'Sul América',
    'Tokio Marine',
    'Yelum',
    'Youse',
    'Zurich',
  ],
};
