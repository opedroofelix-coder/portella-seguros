import { describe, expect, it } from 'vitest';
import { ErroPermissao } from '../domain/erros';
import type { Usuario } from '../domain/usuario';
import { RepositorioMemoria } from '../testes/memoria';
import type { Catalogo } from './catalogos';
import { limparItens, ServicoCatalogos } from './catalogos';

const u = (perfil: Usuario['perfil']): Usuario => ({
  id: perfil,
  nome: perfil,
  login: perfil,
  perfil,
  ativo: true,
  criadoEm: '',
});

describe('catálogos', () => {
  it('limpa, ordena e remove repetidos ignorando acentos', () => {
    expect(limparItens([' Saúde ', 'Auto', 'Saude', '', 'Vida  em  grupo'])).toEqual([
      'Auto',
      'Saúde',
      'Vida em grupo',
    ]);
  });

  it('usa a lista padrão até alguém salvar; só a gestão altera', async () => {
    const s = new ServicoCatalogos(new RepositorioMemoria<Catalogo>(), {
      produtos: ['Vida', 'Auto'],
      seguradoras: ['HDI'],
    });
    expect(await s.obter('produtos')).toEqual(['Auto', 'Vida']);
    await expect(s.salvar(u('corretor'), 'produtos', ['X'])).rejects.toThrow(ErroPermissao);
    await s.incluir(u('admin'), 'seguradoras', ['Yelum', 'hdi']);
    expect(await s.obter('seguradoras')).toEqual(['HDI', 'Yelum']);
  });
});
