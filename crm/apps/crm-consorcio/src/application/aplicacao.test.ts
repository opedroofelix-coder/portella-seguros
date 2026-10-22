import type { Cliente, Oportunidade, Usuario } from '@portella/core';
import { AutenticacaoMemoria, RepositorioMemoria } from '@portella/core';
import { describe, expect, it } from 'vitest';
import type { Cota } from '../domain/cota';
import type { Lance } from '../domain/lance';
import { criarImportacao, identificarStatus, identificarTipoBem } from './importacao';
import { registrarResultado } from './lances';
import { montarServicos } from './servicos';

const admin: Usuario = { id: 'adm', nome: 'Ana Admin', email: 'a@x.com', perfil: 'admin', ativo: true, criadoEm: '' };
const corretor: Usuario = { ...admin, id: 'c1', nome: 'Carlos Souza', perfil: 'corretor' };

const servicos = () =>
  montarServicos({
    auth: new AutenticacaoMemoria(),
    usuarios: new RepositorioMemoria<Usuario>([admin, corretor]),
    clientes: new RepositorioMemoria<Cliente>(),
    oportunidades: new RepositorioMemoria<Oportunidade>(),
    cotas: new RepositorioMemoria<Cota>(),
    lances: new RepositorioMemoria<Lance>(),
  });

describe('lances', () => {
  it('lance contemplado contempla a cota', async () => {
    const s = servicos();
    const cota = await s.cotas.salvar(corretor, {
      clienteId: 'x', administradora: 'Adm', grupo: '10', cota: '5', tipoBem: 'automovel', valorCredito: 8000000, prazoMeses: 80, dataAdesao: '2026-01-01', status: 'ativa',
    });
    const lance = await s.lances.salvar(corretor, { cotaId: cota.id, assembleia: '2026-11-15', tipo: 'livre', percentual: 30, resultado: 'aguardando' });
    await registrarResultado(s.lances, s.cotas, corretor, lance, 'contemplado');
    expect(await s.cotas.obter(corretor, cota.id)).toMatchObject({ status: 'contemplada', contemplacao: { data: '2026-11-15', forma: 'lance' } });
    expect((await s.lances.obter(corretor, lance.id)).resultado).toBe('contemplado');
  });
});

describe('importação de consórcio', () => {
  it('interpreta tipo de bem e situação escritos livremente', () => {
    expect(identificarTipoBem('IMÓVEL')).toBe('imovel');
    expect(identificarTipoBem('Veículo leve')).toBe('automovel');
    expect(identificarTipoBem('Motocicleta')).toBe('moto');
    expect(identificarTipoBem('Caminhão')).toBe('pesados');
    expect(identificarStatus('CONTEMPLADA')).toBe('contemplada');
    expect(identificarStatus('Em andamento', true)).toBe('contemplada');
    expect(identificarStatus('Desistente')).toBe('cancelada');
    expect(identificarStatus('')).toBe('ativa');
  });

  it('importa cotas ligadas aos clientes e avisa as inválidas', async () => {
    const s = servicos();
    const arquivo = {
      versao: 1, sistema: 'consorcio', origem: 'x', geradoEm: '',
      clientes: [{ chave: 'k1', nome: 'Maria', responsavel: 'Carlos Souza' }],
      cotas: [
        { chave: 'q1', clienteChave: 'k1', administradora: 'Adm X', grupo: 1020, cota: 33, tipoBem: 'Imóvel', valorCredito: 250000, prazoMeses: 180, valorParcela: 1650.4, dataAdesao: '2025-03-10', parcelasPagas: 19, status: 'Contemplada', dataContemplacao: '2026-02-15', formaContemplacao: 'Lance livre', responsavel: 'Carlos Souza' },
        { chave: 'q2', clienteChave: 'k1', administradora: 'Adm X', grupo: '1020', cota: '34', valorCredito: 0, prazoMeses: 180, dataAdesao: '2025-03-10' },
      ],
    };
    const previa = await criarImportacao(s).analisar(arquivo, admin, [admin, corretor]);
    expect(previa.resumo).toEqual([['Clientes', 1], ['Cotas', 1]]);
    expect(previa.avisos[0]).toMatch(/1020\/34/);
    await previa.confirmar();
    const [cota] = await s.cotas.listar(corretor);
    expect(cota).toMatchObject({ grupo: '1020', cota: '33', valorCredito: 25000000, valorParcela: 165040, status: 'contemplada', contemplacao: { forma: 'lance' }, responsavelId: 'c1' });
  });

  it('recusa arquivo do CRM de seguros', async () => {
    await expect(criarImportacao(servicos()).analisar({ versao: 1, sistema: 'seguros', clientes: [] }, admin, [admin])).rejects.toThrow(/seguros/);
  });
});
