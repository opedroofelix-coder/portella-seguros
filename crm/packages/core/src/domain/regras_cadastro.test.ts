import { describe, expect, it } from 'vitest';
import { RepositorioMemoria } from '../testes/memoria';
import { ServicoCarteira } from '../application/carteira';
import type { Cliente } from './cliente';
import { conferirClienteRepetido, validarCliente } from './cliente';
import { ErroValidacao } from './erros';
import { validarOportunidade } from './oportunidade';
import { conferirRecebimentos } from './proposta';
import type { Usuario } from './usuario';

const camposDoErro = (f: () => void): Record<string, string> => {
  try {
    f();
  } catch (e) {
    if (e instanceof ErroValidacao) return e.campos;
    throw e;
  }
  return {};
};

describe('cotação (oportunidade)', () => {
  const base = { nomeContato: 'Lead', produto: 'Vida', etapa: 'novo' as const };
  it('recusa telefone e e-mail inválidos, cada um no seu campo', () => {
    const campos = camposDoErro(() => validarOportunidade({ ...base, telefone: '12', email: 'x@' }));
    expect(campos).toEqual({ telefone: 'Telefone inválido.', email: 'E-mail inválido.' });
  });
  it('aceita sem telefone e sem e-mail', () => {
    expect(() => validarOportunidade(base)).not.toThrow();
  });
});

describe('cliente com CPF repetido', () => {
  const existentes = [
    { id: 'a', nome: 'Maria', documento: '52998224725' },
    { id: 'b', nome: 'Maria (cópia antiga)', documento: '52998224725' },
  ];
  it('recusa cliente novo com CPF já cadastrado, com ou sem máscara', () => {
    const campos = camposDoErro(() =>
      conferirClienteRepetido({ tipoPessoa: 'PF', documento: '529.982.247-25' }, existentes),
    );
    expect(campos.documento).toBe('CPF já cadastrado (Maria).');
  });
  it('deixa editar quem já estava repetido, enquanto o documento não muda', () => {
    expect(() =>
      conferirClienteRepetido({ id: 'b', tipoPessoa: 'PF', documento: '52998224725' }, existentes),
    ).not.toThrow();
  });
  it('ignora cliente sem documento', () => {
    expect(() => conferirClienteRepetido({ tipoPessoa: 'PF' }, existentes)).not.toThrow();
  });
  it('o serviço da carteira aplica a regra ao salvar', async () => {
    const admin: Usuario = {
      id: 'adm',
      nome: 'Ana',
      login: 'ana',
      perfil: 'admin',
      ativo: true,
      criadoEm: '',
    };
    const servico = new ServicoCarteira<Cliente>(
      new RepositorioMemoria<Cliente>(),
      validarCliente,
      undefined,
      conferirClienteRepetido,
    );
    await servico.salvar(admin, { nome: 'Maria', tipoPessoa: 'PF', documento: '52998224725' });
    await expect(
      servico.salvar(admin, { nome: 'Outra', tipoPessoa: 'PF', documento: '529.982.247-25' }),
    ).rejects.toBeInstanceOf(ErroValidacao);
  });
});

describe('recebimentos da proposta', () => {
  const r = (valor: number, vitalicio?: boolean) => ({
    id: String(valor),
    data: '2026-11-03',
    valor,
    vitalicio,
  });
  it('recusa recebimentos acima da comissão a receber', () => {
    const campos = camposDoErro(() =>
      conferirRecebimentos({ comissaoReceber: 15000, recebimentos: [r(500000)] }),
    );
    expect(campos.comissaoReceber).toMatch(/Os recebimentos somam R\$\s5\.000,00/);
  });
  it('aceita até a comissão e não conta o vitalício', () => {
    expect(() =>
      conferirRecebimentos({ comissaoReceber: 15000, recebimentos: [r(15000), r(9000, true)] }),
    ).not.toThrow();
  });
});
