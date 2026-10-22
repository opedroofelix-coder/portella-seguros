import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export const ADMIN = { nome: 'Administradora Teste', email: 'admin@teste.com', senha: 'senha-admin-1' };
export const CORRETOR = { nome: 'Corretor Teste', email: 'corretor@teste.com', senha: 'senha-corretor-1' };

export async function primeiroAcesso(page: Page, url: string) {
  await page.goto(url);
  await expect(page.getByRole('heading', { name: 'Primeiro acesso' })).toBeVisible();
  await page.getByLabel('Nome').fill(ADMIN.nome);
  await page.getByLabel('E-mail').fill(ADMIN.email);
  await page.getByLabel('Senha', { exact: true }).fill(ADMIN.senha);
  await page.getByLabel('Confirme a senha').fill(ADMIN.senha);
  await page.getByRole('button', { name: 'Criar administrador' }).click();
  await expect(page.getByRole('heading', { name: /Olá/ })).toBeVisible();
}

export async function entrar(page: Page, url: string, u: { email: string; senha: string }) {
  await page.goto(`${url}/entrar`);
  await page.getByLabel('E-mail').fill(u.email);
  await page.getByLabel('Senha').fill(u.senha);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: /Olá/ })).toBeVisible();
}

/** Abre um item do menu, inclusive no celular, onde o menu fica escondido atrás do botão. */
export async function irPara(page: Page, rotulo: string) {
  const abrir = page.getByRole('button', { name: 'Abrir menu' });
  const movel = await abrir.isVisible();
  if (movel) await abrir.click();
  const menu = page.getByRole('complementary', { name: 'Menu principal' });
  await menu.getByRole('link', { name: rotulo, exact: true }).click();
  if (movel) await expect(menu).not.toBeInViewport();
}

export async function sair(page: Page) {
  const abrir = page.getByRole('button', { name: 'Abrir menu' });
  if (await abrir.isVisible()) await abrir.click();
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
}

export async function cadastrarUsuario(page: Page, u: { nome: string; email: string; senha: string }, perfil: string) {
  await irPara(page, 'Usuários');
  await page.getByRole('button', { name: 'Novo usuário' }).click();
  const dialogo = page.getByRole('dialog', { name: 'Novo usuário' });
  await dialogo.getByLabel('Nome').fill(u.nome);
  await dialogo.getByLabel('E-mail').fill(u.email);
  await dialogo.getByLabel('Perfil').selectOption({ label: perfil });
  await dialogo.getByLabel('Senha inicial').fill(u.senha);
  await page.getByRole('button', { name: 'Cadastrar' }).click();
  await expect(page.getByText(`${u.nome} foi cadastrado.`)).toBeVisible();
}

export async function importar(page: Page, arquivo: string, esperado: RegExp) {
  await irPara(page, 'Importar');
  await page.getByLabel(/Arquivo gerado/).setInputFiles(arquivo);
  await expect(page.getByText(esperado).first()).toBeVisible();
  await page.getByRole('button', { name: 'Importar agora' }).click();
  await expect(page.getByText('Importação concluída.')).toBeVisible();
}
