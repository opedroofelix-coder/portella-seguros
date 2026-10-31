import { describe, expect, it } from 'vitest';
import { ErroNaoEncontrado, ErroPermissao, ErroValidacao } from '../domain/erros';
import type { ItemChecklist, Recado } from '../domain/notas';
import { PARA_TODOS, recadoFeitoPor } from '../domain/notas';
import type { Usuario } from '../domain/usuario';
import { RepositorioMemoria } from '../testes/memoria';
import { ServicoChecklist, ServicoRecados } from './notas';

let seq = 0;
const ambiente = { agora: () => new Date('2026-10-31T12:00:00Z'), gerarId: () => `n${++seq}` };
const usuario = (id: string, perfil: Usuario['perfil']): Usuario => ({
  id,
  nome: id,
  login: id,
  perfil,
  ativo: true,
  criadoEm: '',
});
const ADMIN = usuario('deliziane', 'admin');
const GISELE = usuario('gisele', 'corretor');
const MARY = usuario('mary', 'corretor');

describe('checklist pessoal', () => {
  it('cada um vê e mexe só nos próprios itens, nem a administração vê os dos outros', async () => {
    const s = new ServicoChecklist(new RepositorioMemoria<ItemChecklist>(), ambiente);
    const item = await s.adicionar(GISELE, '  Ligar para a Ana Paula ');
    expect(item.texto).toBe('Ligar para a Ana Paula');
    await s.adicionar(ADMIN, 'Fechar pagamento dos produtores');
    expect((await s.listar(GISELE)).map((i) => i.texto)).toEqual(['Ligar para a Ana Paula']);
    expect((await s.listar(ADMIN)).map((i) => i.texto)).toEqual(['Fechar pagamento dos produtores']);
    await expect(s.marcar(ADMIN, item.id, true)).rejects.toThrow(ErroNaoEncontrado);
    await expect(s.remover(MARY, item.id)).rejects.toThrow(ErroNaoEncontrado);
    await expect(s.adicionar(GISELE, '   ')).rejects.toThrow(ErroValidacao);

    const feito = await s.marcar(GISELE, item.id, true);
    expect(feito).toMatchObject({ feito: true, feitoEm: '2026-10-31T12:00:00.000Z' });
    expect((await s.marcar(GISELE, item.id, false)).feitoEm).toBeUndefined();
    await s.marcar(GISELE, item.id, true);
    expect(await s.limparFeitos(GISELE)).toBe(1);
    expect(await s.listar(GISELE)).toEqual([]);
  });
});

describe('recados da equipe', () => {
  it('a administração escreve; o produtor vê os dele e os de todos e marca o próprio feito', async () => {
    const s = new ServicoRecados(new RepositorioMemoria<Recado>(), ambiente);
    const paraGisele = await s.enviar(ADMIN, {
      texto: 'Ligar para a Ana Paula',
      para: 'gisele',
      prazo: '2026-11-03',
    });
    const paraTodos = await s.enviar(ADMIN, { texto: 'Assembleia dia 12', para: PARA_TODOS });
    await expect(s.enviar(GISELE, { texto: 'Oi', para: 'mary' })).rejects.toThrow(ErroPermissao);
    await expect(s.enviar(ADMIN, { texto: '', para: 'gisele' })).rejects.toThrow(ErroValidacao);

    expect((await s.listar(GISELE)).map((r) => r.texto).sort()).toEqual([
      'Assembleia dia 12',
      'Ligar para a Ana Paula',
    ]);
    expect((await s.listar(MARY)).map((r) => r.texto)).toEqual(['Assembleia dia 12']);
    expect(await s.listar(ADMIN)).toHaveLength(2);

    // Mary não vê nem marca o recado da Gisele; num recado para todos, cada um tem o seu "feito".
    await expect(s.marcarFeito(MARY, paraGisele.id, true)).rejects.toThrow(ErroNaoEncontrado);
    const daGisele = await s.marcarFeito(GISELE, paraTodos.id, true);
    expect(recadoFeitoPor(daGisele, 'gisele')).toBe(true);
    expect(recadoFeitoPor(daGisele, 'mary')).toBe(false);
    expect(recadoFeitoPor(await s.marcarFeito(GISELE, paraTodos.id, false), 'gisele')).toBe(false);
    // A administração vê tudo, mas não marca o feito no lugar de quem recebeu.
    await expect(s.marcarFeito(ADMIN, paraGisele.id, true)).rejects.toThrow(ErroPermissao);

    await expect(s.remover(GISELE, paraGisele.id)).rejects.toThrow(ErroPermissao);
    await s.remover(ADMIN, paraGisele.id);
    expect((await s.listar(GISELE)).map((r) => r.texto)).toEqual(['Assembleia dia 12']);
  });
});
