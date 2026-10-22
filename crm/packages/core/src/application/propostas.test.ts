import { beforeEach, describe, expect, it } from 'vitest';
import { ErroNaoEncontrado, ErroPermissao, ErroValidacao } from '../domain/erros';
import type { Estorno, PagamentoProdutor, Proposta, Vale } from '../domain/proposta';
import { recebidoTotal, saldoReceber, valorVitalicio } from '../domain/proposta';
import type { Usuario } from '../domain/usuario';
import { RepositorioMemoria } from '../testes/memoria';
import { ServicoLancamentosGestao, ServicoPropostas } from './propostas';

let seq = 0;
const ambiente = { agora: () => new Date('2026-10-22T12:00:00Z'), gerarId: () => `id${++seq}` };
const usuario = (id: string, perfil: Usuario['perfil']): Usuario => ({
  id,
  nome: id,
  login: id,
  perfil,
  ativo: true,
  criadoEm: '',
});
const admin = usuario('admin', 'admin');
const gisele = usuario('gisele', 'corretor');
const mary = usuario('mary', 'corretor');
const luana = usuario('luana', 'corretor');

const nova = (p: Partial<Proposta> = {}) => ({
  clienteNome: 'Cliente Teste',
  numero: '123',
  data: '2026-10-01',
  companhia: 'Porto Seguro',
  produto: 'Automóvel',
  tipoNegocio: 'novo' as const,
  premioLiquido: 100000,
  comissaoPercentual: 10,
  comissaoReceber: 10000,
  produtores: [{ produtorId: 'gisele', percentual: 50 }],
  recebimentos: [],
  status: 'pendente' as const,
  ...p,
});

describe('propostas', () => {
  let servico: ServicoPropostas;
  beforeEach(() => {
    servico = new ServicoPropostas(new RepositorioMemoria(), ambiente);
  });

  it('produtor lança como pendente, sem recebimentos; edita e exclui só enquanto pendente', async () => {
    const p = await servico.salvar(
      gisele,
      nova({ recebimentos: [{ id: 'x', data: '2026-10-05', valor: 999 }], status: 'aprovada' }),
    );
    expect(p).toMatchObject({ status: 'pendente', recebimentos: [], responsavelId: 'gisele' });
    await expect(servico.salvar(mary, { ...p, clienteNome: 'Outro' })).rejects.toThrow();
    const editada = await servico.salvar(gisele, { ...p, premioLiquido: 120000 });
    expect(editada.premioLiquido).toBe(120000);

    await expect(servico.aprovar(gisele, p.id)).rejects.toThrow(ErroPermissao);
    const aprovada = await servico.aprovar(admin, p.id);
    expect(aprovada).toMatchObject({ status: 'aprovada', aprovadaPor: 'admin' });
    await expect(servico.salvar(gisele, { ...aprovada, premioLiquido: 1 })).rejects.toThrow(/aprovada/);
    await expect(servico.remover(gisele, p.id)).rejects.toThrow(ErroPermissao);

    const outra = await servico.salvar(gisele, nova());
    await servico.remover(gisele, outra.id);
    await expect(servico.obter(admin, outra.id)).rejects.toThrow(ErroNaoEncontrado);
  });

  it('administração lança já aprovada e edita comissões depois de aprovada', async () => {
    const p = await servico.salvar(admin, nova());
    expect(p.status).toBe('aprovada');
    const pendente = await servico.salvar(gisele, nova());
    expect((await servico.salvar(admin, { ...pendente, premioLiquido: 1 })).status).toBe('pendente');
    const ajustada = await servico.salvar(admin, { ...p, comissaoReceber: 12000 });
    expect(ajustada.comissaoReceber).toBe(12000);
  });

  it('cada produtor vê as propostas que lançou e aquelas em que participa', async () => {
    await servico.salvar(
      admin,
      nova({
        produtores: [
          { produtorId: 'mary', percentual: 15 },
          { produtorId: 'gisele', percentual: 50 },
        ],
      }),
    );
    await servico.salvar(admin, nova({ produtores: [{ produtorId: 'luana', percentual: 50 }] }));
    expect(await servico.listar(mary)).toHaveLength(1);
    expect(await servico.listar(gisele)).toHaveLength(1);
    expect(await servico.listar(luana)).toHaveLength(1);
    expect(await servico.listar(admin)).toHaveLength(2);
  });

  it('controla por saldo: recebimentos em qualquer quantidade e ordem; depois de quitado, o resto é vitalício', async () => {
    const p = await servico.salvar(admin, nova({ status: 'aprovada', percentualVitalicio: 2 }));
    await servico.registrarRecebimento(admin, p.id, { data: '2026-10-10', valor: 8000, parcela: '1ª' });
    await servico.registrarRecebimento(admin, p.id, { data: '2026-11-10', valor: 1000, parcela: '2ª' });
    let atual = await servico.registrarRecebimento(admin, p.id, {
      data: '2027-03-10',
      valor: 1000,
      parcela: '4ª',
    });
    expect(saldoReceber(atual)).toBe(0);
    atual = await servico.registrarRecebimento(admin, p.id, {
      data: '2027-04-10',
      valor: 2000,
      parcela: 'vitalício',
    });
    expect(atual.recebimentos.at(-1)?.vitalicio).toBe(true);
    expect(saldoReceber(atual)).toBe(0);
    expect(recebidoTotal(atual)).toBe(12000);
    expect(valorVitalicio(atual)).toBe(2000);
    await expect(
      servico.registrarRecebimento(gisele, p.id, { data: '2026-10-10', valor: 1 }),
    ).rejects.toThrow(ErroPermissao);
  });

  it('valida comissão acima de 100% (saúde) e soma de repasses', async () => {
    await expect(
      servico.salvar(admin, nova({ comissaoPercentual: 300, comissaoReceber: 300000 })),
    ).resolves.toBeTruthy();
    await expect(
      servico.salvar(
        admin,
        nova({
          produtores: [
            { produtorId: 'a', percentual: 60 },
            { produtorId: 'b', percentual: 50 },
          ],
        }),
      ),
    ).rejects.toThrow(ErroValidacao);
    await expect(servico.salvar(admin, nova({ clienteNome: '' }))).rejects.toThrow(ErroValidacao);
  });
});

describe('alteração do % do produtor', () => {
  it('vale para as propostas em aberto, sem mudar o repasse do que já foi recebido', async () => {
    const servico = new ServicoPropostas(new RepositorioMemoria(), ambiente);
    const aberta = await servico.salvar(
      admin,
      nova({ recebimentos: [{ id: 'r1', data: '2026-10-05', valor: 4000 }] }),
    );
    const quitada = await servico.salvar(
      admin,
      nova({ numero: '2', recebimentos: [{ id: 'r2', data: '2026-10-05', valor: 10000 }] }),
    );
    const estouraria = await servico.salvar(
      admin,
      nova({
        numero: '3',
        produtores: [
          { produtorId: 'gisele', percentual: 50 },
          { produtorId: 'mary', percentual: 45 },
        ],
      }),
    );
    const outra = await servico.salvar(
      admin,
      nova({ numero: '4', produtores: [{ produtorId: 'mary', percentual: 15 }] }),
    );

    await expect(servico.aplicarPercentualProdutor(gisele, 'gisele', 60)).rejects.toThrow(ErroPermissao);
    await expect(servico.aplicarPercentualProdutor(admin, 'gisele', 120)).rejects.toThrow(ErroValidacao);
    expect(await servico.aplicarPercentualProdutor(admin, 'gisele', 60)).toEqual({
      alteradas: 1,
      ignoradas: 1,
    });

    const depois = await servico.obter(admin, aberta.id);
    expect(depois.produtores).toEqual([{ produtorId: 'gisele', percentual: 60 }]);
    // R$ 40,00 já recebidos ficam com o repasse de 50% (R$ 20,00)
    expect(depois.recebimentos[0]?.repasses).toEqual({ gisele: 2000 });
    expect((await servico.obter(admin, quitada.id)).produtores[0]?.percentual).toBe(50);
    expect((await servico.obter(admin, estouraria.id)).produtores[0]?.percentual).toBe(50);
    expect(await servico.obter(admin, outra.id)).toEqual(outra);
  });
});

describe('estornos, vales e pagamentos', () => {
  it('só a administração lança; o produtor consulta os seus', async () => {
    const vales = new ServicoLancamentosGestao<Vale>(new RepositorioMemoria(), undefined, ambiente);
    await expect(
      vales.salvar(gisele, { data: '2026-10-05', valor: 50000, motivo: 'Adiantamento' }),
    ).rejects.toThrow(ErroPermissao);
    await vales.salvar(admin, { data: '2026-10-05', valor: 50000, responsavelId: 'gisele' });
    await vales.salvar(admin, { data: '2026-10-05', valor: 10000, responsavelId: 'mary' });
    expect(await vales.listar(gisele)).toHaveLength(1);
    const estornos = new ServicoLancamentosGestao<Estorno>(new RepositorioMemoria(), undefined, ambiente);
    expect(estornos).toBeTruthy();
    const pagamentos = new ServicoLancamentosGestao<PagamentoProdutor>(
      new RepositorioMemoria(),
      undefined,
      ambiente,
    );
    expect(pagamentos).toBeTruthy();
  });
});
