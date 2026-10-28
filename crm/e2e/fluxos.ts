import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

export const ADMIN = { nome: 'Administradora Teste', login: 'admteste', senha: 'senha-admin-1' };
export const CORRETOR = { nome: 'Corretor Teste', login: 'corretor', senha: 'senha-corretor-1' };

/** Título do painel inicial: "Olá, Nome" no Consórcio; "Bom dia/Boa tarde/Boa noite, Nome" no Seguros. */
export const saudacao = (nome = '') => new RegExp(`^(Olá|Bom dia|Boa tarde|Boa noite), ${nome}`);

export async function primeiroAcesso(page: Page, url: string) {
  await page.goto(url);
  await expect(page.getByRole('heading', { name: 'Primeiro acesso' })).toBeVisible();
  await page.getByLabel('Nome').fill(ADMIN.nome);
  await page.getByLabel('Usuário').fill(ADMIN.login);
  await page.getByLabel('Senha', { exact: true }).fill(ADMIN.senha);
  await page.getByLabel('Confirme a senha').fill(ADMIN.senha);
  await page.getByRole('button', { name: 'Criar administrador' }).click();
  await expect(page.getByRole('heading', { name: saudacao() })).toBeVisible();
}

export async function entrar(page: Page, url: string, u: { login: string; senha: string }) {
  await page.goto(`${url}/entrar`);
  await page.getByLabel('Usuário').fill(u.login);
  await page.getByLabel('Senha', { exact: true }).fill(u.senha);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

/** Primeiro login de um usuário cadastrado com a senha 1234: troca obrigatória antes de entrar. */
export async function entrarPelaPrimeiraVez(page: Page, url: string, u: { login: string; senha: string }) {
  await entrar(page, url, { login: u.login, senha: '1234' });
  await expect(page.getByRole('heading', { name: 'Crie sua senha' })).toBeVisible();
  await page.getByLabel('Nova senha', { exact: true }).fill(u.senha);
  await page.getByLabel('Confirme a nova senha').fill(u.senha);
  await page.getByRole('button', { name: 'Salvar nova senha' }).click();
  await expect(page.getByRole('heading', { name: saudacao() })).toBeVisible();
}

/**
 * Menu no topo (Seguros no computador largo): os itens que não estão na cápsula ficam em "Mais".
 * Devolve a cápsula, ou null quando o app usa o menu lateral.
 */
export async function abrirMais(page: Page) {
  const capsula = page.getByRole('navigation', { name: 'Menu principal' });
  if (!(await capsula.isVisible())) return null;
  const mais = capsula.getByRole('button', { name: 'Mais' });
  if ((await mais.getAttribute('aria-expanded')) !== 'true') await mais.click();
  return capsula;
}

/** Abre um item do menu, inclusive no celular, onde o menu fica escondido atrás do botão. */
export async function irPara(page: Page, rotulo: string) {
  // O item pode ter um contador ("Aprovações 2 pendente(s)").
  const nome = new RegExp(`^${rotulo}( \\d+ pendente\\(s\\))?$`);
  const capsula = page.getByRole('navigation', { name: 'Menu principal' });
  const lateral = page.getByRole('complementary', { name: 'Menu principal' });
  // Logo depois de entrar, o menu ainda pode não ter aparecido.
  await capsula.or(lateral).first().waitFor({ state: 'attached' });
  if (await capsula.isVisible()) {
    if (!(await capsula.getByRole('link', { name: nome }).isVisible())) await abrirMais(page);
    await capsula.getByRole('link', { name: nome }).click();
    return;
  }
  const abrir = page.getByRole('button', { name: 'Abrir menu' });
  const movel = await abrir.isVisible();
  if (movel) await abrir.click();
  await lateral.getByRole('link', { name: nome }).click();
  if (movel) await expect(lateral).not.toBeInViewport();
}

export async function sair(page: Page) {
  const abrir = page.getByRole('button', { name: 'Abrir menu' });
  if (await abrir.isVisible()) await abrir.click();
  await abrirMais(page);
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
}

/** Cadastra com a senha provisória 1234. */
export async function cadastrarUsuario(
  page: Page,
  u: { nome: string; login: string; percentual?: string },
  perfil: string,
) {
  await irPara(page, 'Usuários');
  await page.getByRole('button', { name: 'Novo usuário' }).click();
  const dialogo = page.getByRole('dialog', { name: 'Novo usuário' });
  await dialogo.getByLabel('Nome').fill(u.nome);
  await dialogo.getByLabel('Usuário (para entrar)').fill(u.login);
  await escolher(dialogo.getByLabel('Perfil'), { label: perfil });
  if (u.percentual) await dialogo.getByLabel('Repasse padrão (%)').fill(u.percentual);
  await page.getByRole('button', { name: 'Cadastrar' }).click();
  await expect(page.getByText(`${u.nome} foi cadastrado.`, { exact: false })).toBeVisible();
}

export async function importar(page: Page, arquivo: string, esperado: RegExp) {
  await irPara(page, 'Importar');
  await page.getByLabel(/Planilha da corretora/).setInputFiles(arquivo);
  await expect(page.getByText(esperado).first()).toBeVisible();
  await page.getByRole('button', { name: 'Importar agora' }).click();
  // No Seguros (interface refinada) a importação pede confirmação; no Consórcio, não.
  const confirmar = page.getByRole('alertdialog', { name: 'Importar os dados?' });
  const concluida = page.getByText('Importação concluída.').first();
  await expect(confirmar.or(concluida)).toBeVisible();
  if (await confirmar.isVisible())
    await confirmar.getByRole('button', { name: 'Importar', exact: true }).click();
  await expect(concluida).toBeVisible();
}

/**
 * Escolhe uma opção de uma lista: a do navegador (<select>, Consórcio) ou a do painel do app
 * (botão "combobox" da interface refinada, Seguros).
 */
export async function escolher(campo: Locator, opcao: { label: string } | { index: number }) {
  if (await campo.evaluate((e) => e.tagName === 'SELECT')) {
    await campo.selectOption(opcao);
    return;
  }
  await campo.click();
  const lista = campo.page().getByRole('listbox');
  await lista.waitFor();
  const item =
    'label' in opcao
      ? lista.getByRole('option', { name: opcao.label, exact: true })
      : lista.getByRole('option').nth(opcao.index);
  await item.click();
}
