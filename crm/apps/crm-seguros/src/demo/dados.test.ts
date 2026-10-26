import type { Apolice } from '../domain/apolice';
import type { Despesa, Fechamento, Movimento } from '../domain/financeiro';
import { ADMIN_DEMO, prepararDemo, PRODUTORA_DEMO } from '@portella/app-base';
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
import { criarImportacao } from '../application/importacao';
import { montarServicos } from '../application/servicos';
import { arquivoDemoSeguros, PRODUTOS_DEMO, SEGURADORAS_DEMO } from './dados';

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
  it('prepara usuários, dados fictícios e pendências, e entra como administradora', async () => {
    const s = servicos();
    const hoje = new Date('2026-10-22T12:00:00');
    const opcoes = {
      importacao: criarImportacao(s),
      arquivo: arquivoDemoSeguros(hoje),
      hoje,
      produtos: PRODUTOS_DEMO.map((p) => p.nome),
      companhias: SEGURADORAS_DEMO,
    };
    expect(await prepararDemo(s, opcoes)).toBe(true);
    // Já preparada: não repete
    expect(await prepararDemo(s, opcoes)).toBe(false);

    const admin = await s.autenticacao.usuarioAtual();
    expect(admin?.login).toBe(ADMIN_DEMO.login);
    expect(await s.usuarios.listar()).toHaveLength(10);
    const propostas = await s.propostas.listar(admin!);
    expect(propostas).toHaveLength(223);
    expect(propostas.filter((p) => p.status === 'pendente')).toHaveLength(3);
    expect(propostas.every((p) => p.clienteNome.startsWith('Cliente Teste'))).toBe(true);
    expect((await s.apolices.listar(admin!)).length).toBeGreaterThan(150);
    expect(await s.vales.listar(admin!)).toHaveLength(2);
    expect((await s.movimentos.listar(admin!)).length).toBeGreaterThan(20);

    // A produtora da demo entra com a senha da demo (sem a troca obrigatória) e vê só as suas propostas.
    const gisele = await s.autenticacao.entrar(PRODUTORA_DEMO.login, PRODUTORA_DEMO.senha);
    expect(gisele.trocarSenha).toBeUndefined();
    const dela = await s.propostas.listar(gisele);
    expect(dela.length).toBeGreaterThan(0);
    expect(dela.length).toBeLessThan(propostas.length);
  });
});
