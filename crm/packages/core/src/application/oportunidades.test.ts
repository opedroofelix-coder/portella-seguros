import { describe, expect, it } from 'vitest';
import { ErroPermissao } from '../domain/erros';
import type { Oportunidade } from '../domain/oportunidade';
import { validarOportunidade } from '../domain/oportunidade';
import type { Usuario } from '../domain/usuario';
import { RepositorioMemoria } from '../testes/memoria';
import { responsavelDoProduto, ServicoOportunidades } from './oportunidades';

let seq = 0;
let relogio = new Date('2026-10-29T18:00:00Z');
const ambiente = { agora: () => relogio, gerarId: () => `o${++seq}` };
const usuario = (id: string, perfil: Usuario['perfil'], extra: Partial<Usuario> = {}): Usuario => ({
  id,
  nome: id,
  login: id,
  perfil,
  ativo: true,
  criadoEm: '',
  ...extra,
});
const ADMIN = usuario('deliziane', 'admin');
const MARY = usuario('mary', 'corretor');
const GABRIEL = usuario('gabriel', 'corretor', { produtosAtendidos: ['Consórcio'] });

function servico(equipe: Usuario[] = [ADMIN, MARY, GABRIEL]) {
  const repo = new RepositorioMemoria<Oportunidade>();
  return { repo, s: new ServicoOportunidades(repo, validarOportunidade, async () => equipe, ambiente) };
}
const lead = { nomeContato: 'João Lima', produto: 'Consórcio', etapa: 'novo' as const };

describe('cotações (oportunidades)', () => {
  it('encaminha a cotação nova ao responsável pelo produto, mesmo quando um produtor cadastra', async () => {
    const { s } = servico();
    expect(responsavelDoProduto([GABRIEL], 'consorcio')?.id).toBe('gabriel');
    const criada = await s.salvar(MARY, { ...lead, responsavelId: MARY.id });
    expect(criada.responsavelId).toBe('gabriel');
    expect(criada.historico).toEqual([
      { em: '2026-10-29T18:00:00.000Z', usuarioId: 'mary', acao: 'criada', para: 'novo' },
    ]);
    // Produto sem responsável: fica com quem cadastrou.
    expect((await s.salvar(MARY, { ...lead, produto: 'Automóvel' })).responsavelId).toBe('mary');
    // Produtor continua sem poder escolher outra pessoa à mão.
    await expect(s.salvar(MARY, { ...lead, produto: 'Vida', responsavelId: 'gabriel' })).rejects.toThrow(
      ErroPermissao,
    );
    // A gestão que escolhe o responsável decide; usuário desativado não recebe.
    expect((await s.salvar(ADMIN, { ...lead, responsavelId: 'mary' })).responsavelId).toBe('mary');
    const semGabriel = servico([ADMIN, MARY, { ...GABRIEL, ativo: false }]).s;
    expect((await semGabriel.salvar(MARY, lead)).responsavelId).toBe('mary');
  });

  it('registra no histórico as mudanças de etapa e de responsável', async () => {
    const { s } = servico();
    const criada = await s.salvar(ADMIN, { ...lead, produto: 'Vida' });
    relogio = new Date('2026-10-30T10:00:00Z');
    const movida = await s.salvar(ADMIN, { ...criada, etapa: 'contato' });
    const transferida = await s.salvar(ADMIN, { ...movida, responsavelId: 'mary', observacoes: 'ok' });
    const igual = await s.salvar(ADMIN, { ...transferida, observacoes: 'só texto' });
    expect(igual.historico?.map((m) => [m.acao, m.de, m.para])).toEqual([
      ['criada', undefined, 'novo'],
      ['etapa', 'novo', 'contato'],
      ['responsavel', 'deliziane', 'mary'],
    ]);
  });
});
