import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export const LARGURAS = [
  { nome: 'celular', width: 360, height: 780 },
  { nome: 'tablet', width: 768, height: 1024 },
  { nome: 'desktop', width: 1280, height: 860 },
] as const;

/** A página não pode rolar na horizontal (componentes com rolagem própria, como o quadro, são permitidos). */
export async function semRolagemHorizontal(page: Page) {
  const { scroll, cliente } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    cliente: document.documentElement.clientWidth,
  }));
  expect(scroll, 'a página está rolando na horizontal').toBeLessThanOrEqual(cliente);
}

/** No celular, todo botão visível precisa ter pelo menos 44 × 44 px. */
export async function alvosDeToque(page: Page) {
  const pequenos = await page.evaluate(() =>
    [
      ...document.querySelectorAll<HTMLElement>(
        'button, select, input:not([type=checkbox]):not([type=radio])',
      ),
    ]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        const naTela = r.right > 0 && r.left < innerWidth; // ignora o menu fechado, fora da tela
        return (
          r.width > 0 &&
          r.height > 0 &&
          naTela &&
          s.visibility !== 'hidden' &&
          !el.closest('[aria-hidden=true]')
        );
      })
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.height < 43.5 || r.width < 43.5;
      })
      .map((el) => el.getAttribute('aria-label') || el.textContent?.trim() || el.tagName),
  );
  expect(pequenos, 'alvos de toque menores que 44px').toEqual([]);
}

export async function conferirLayout(page: Page, largura: number) {
  await semRolagemHorizontal(page);
  if (largura < 720) await alvosDeToque(page);
}
