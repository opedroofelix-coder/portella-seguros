import type { Apolice } from '../domain/apolice';
import type { Despesa, Fechamento, Movimento } from '../domain/financeiro';
import { ADMIN_DEMO, prepararEquipeDemo, PRODUTORA_DEMO } from '@portella/app-base';
import type {
  Catalogo,
  Cliente,
  Estorno,
  Oportunidade,
  PagamentoProdutor,
  Proposta,
  Usuario,
  Vale,
} from '@portella/core';
import { AutenticacaoMemoria, RepositorioMemoria } from '@portella/core';
import { describe, expect, it } from 'vitest';
import { montarServicos } from '../application/servicos';

const servicos = () =>
  montarServicos({
    auth: new AutenticacaoMemoria(),
    usuarios: new RepositorioMemoria<Usuario>(),
    clientes: new RepositorioMemoria<Cliente>(),
    oportunidades: new RepositorioMemoria<Oportunidade>(),
    propostas: new RepositorioMemoria<Proposta>(),
    estornos: new RepositorioMemoria<Estorno>(),
    vales: new RepositorioMemoria<Vale>(),
    pagamentos: new RepositorioMemoria<PagamentoProdutor>(),
    catalogos: new RepositorioMemoria<Catalogo>(),
    apolices: new RepositorioMemoria<Apolice>(),
    movimentos: new RepositorioMemoria<Movimento>(),
    despesas: new RepositorioMemoria<Despesa>(),
    fechamentos: new RepositorioMemoria<Fechamento>(),
  });

describe('demonstração do CRM de Seguros', () => {
  it('prepara só a equipe, sem clientes de teste, e entra como administradora', async () => {
    const s = servicos();
    expect(await prepararEquipeDemo(s)).toBe(true);
    // Já preparada: não repete
    expect(await prepararEquipeDemo(s)).toBe(false);

    const admin = await s.autenticacao.usuarioAtual();
    expect(admin?.login).toBe(ADMIN_DEMO.login);
    expect((await s.usuarios.listar()).map((u) => u.nome).sort()).toEqual(
      [
        ADMIN_DEMO.nome,
        'Deliziane',
        'Marielly',
        'Gisele Costa',
        'Gabriel',
        'Berdum',
        'Luana',
        'Renata',
        'Danila',
        'Jessica Naiane',
      ].sort(),
    );
    expect(await s.clientes.listar(admin!)).toHaveLength(0);
    expect(await s.propostas.listar(admin!)).toHaveLength(0);
    expect(await s.apolices.listar(admin!)).toHaveLength(0);
    expect(await s.oportunidades.listar(admin!)).toHaveLength(0);
    expect(await s.vales.listar(admin!)).toHaveLength(0);
    expect(await s.movimentos.listar(admin!)).toHaveLength(0);

    // A produtora da demo entra com a senha da demo, sem a troca obrigatória.
    const gisele = await s.autenticacao.entrar(PRODUTORA_DEMO.login, PRODUTORA_DEMO.senha);
    expect(gisele.trocarSenha).toBeUndefined();
  });
});
