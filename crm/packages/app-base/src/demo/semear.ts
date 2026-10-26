import type { ArquivoImportacao, Etapa, Usuario } from '@portella/core';
import { paraCentavos, SENHA_PADRAO } from '@portella/core';
import type { Importacao } from '../config';
import { PRODUTORES_INICIAIS } from '../padroes';
import type { ServicosBase } from '../servicos';
import { isoData, somarMeses, sorteador } from './gerador';

/** Contas da demonstração (só existem no banco da demo, no navegador de quem abre). */
export const ADMIN_DEMO = { nome: 'Administradora (demo)', login: 'admin', senha: 'demo1234' };
export const PRODUTORA_DEMO = { nome: 'Gisele Costa', login: 'gisele', senha: 'demo1234' };

export interface OpcoesSemear {
  importacao: Importacao;
  arquivo: ArquivoImportacao;
  hoje: Date;
  /** Produtos usados nas oportunidades do funil e nas propostas pendentes. */
  produtos: string[];
  companhias: string[];
  /** Dados próprios do app (ex.: lances do consórcio), depois da importação. */
  extras?: (admin: Usuario, equipe: Usuario[]) => Promise<void>;
}

/**
 * Prepara a demonstração na primeira abertura: administradora, produtores, dados fictícios
 * importados pelo mesmo caminho da planilha, propostas aguardando aprovação, vales e funil.
 * Termina com a administradora conectada. Se o banco já tem usuários, não faz nada.
 */
export async function prepararDemo(servicos: ServicosBase, o: OpcoesSemear): Promise<boolean> {
  if (await servicos.usuarios.existeAlgum()) return false;
  const r = sorteador(77);
  const admin = await servicos.usuarios.configurarAdministrador(ADMIN_DEMO);
  await servicos.usuarios.criarProdutoresIniciais(admin, PRODUTORES_INICIAIS);
  let equipe = await servicos.usuarios.listar();
  const porLogin = (login: string) => equipe.find((u) => u.login === login)!;
  await servicos.usuarios.alterarPropriaSenha(
    porLogin(PRODUTORA_DEMO.login),
    SENHA_PADRAO,
    PRODUTORA_DEMO.senha,
  );
  equipe = await servicos.usuarios.listar();

  await (await o.importacao.analisar(o.arquivo, admin, equipe)).confirmar();

  // Propostas lançadas pelas produtoras nesta semana: aguardam a aprovação da administradora.
  const hoje = isoData(o.hoje);
  for (const [i, login] of ['gisele', 'deliziane', 'luana'].entries()) {
    const produtora = porLogin(login);
    const premio = Math.round(r.entre(1800, 5200) * 100) / 100;
    await servicos.propostas.salvar(produtora, {
      clienteNome: `Cliente Teste ${['Moreira', 'Prado', 'Seixas'][i]}`,
      numero: String(8_200_000 + i * 11),
      data: hoje,
      companhia: r.item(o.companhias),
      produto: o.produtos[i % o.produtos.length]!,
      tipoNegocio: i === 1 ? 'renovacao' : 'novo',
      premioLiquido: paraCentavos(premio) ?? 0,
      comissaoPercentual: 15,
      comissaoReceber: paraCentavos(premio * 0.15) ?? 0,
      produtores: [{ produtorId: produtora.id, percentual: produtora.percentualRepasse ?? 0 }],
      recebimentos: [],
      status: 'pendente',
      responsavelId: produtora.id,
    });
  }

  // Vales do mês, descontados no pagamento.
  for (const [login, valor, motivo] of [
    ['deliziane', 300, 'Adiantamento'],
    ['jessica', 150, 'Combustível'],
  ] as const) {
    await servicos.vales.salvar(admin, {
      responsavelId: porLogin(login).id,
      data: isoData(somarMeses(o.hoje, 0, 5)),
      valor: paraCentavos(valor) ?? 0,
      motivo,
    });
  }

  // Funil de vendas com oportunidades em todas as etapas.
  const etapas: Etapa[] = ['novo', 'novo', 'contato', 'contato', 'proposta', 'proposta', 'ganho', 'perdido'];
  for (const [i, etapa] of etapas.entries()) {
    const dono = porLogin(['gisele', 'deliziane', 'jessica', 'marielly'][i % 4]!);
    await servicos.oportunidades.salvar(admin, {
      nomeContato: `Contato Teste ${['Aguiar', 'Brito', 'Costa', 'Dias', 'Fontes', 'Garcia', 'Lima', 'Neves'][i]}`,
      telefone: `(11) 9${8000 + i * 111}-${4000 + i * 37}`,
      produto: o.produtos[i % o.produtos.length]!,
      etapa,
      valorEstimado: paraCentavos(Math.round(r.entre(900, 6000))) ?? undefined,
      motivoPerda: etapa === 'perdido' ? 'Preço' : undefined,
      responsavelId: dono.id,
    });
  }

  await o.extras?.(admin, equipe);
  await servicos.autenticacao.entrar(ADMIN_DEMO.login, ADMIN_DEMO.senha);
  return true;
}
