import { describe, expect, it } from 'vitest';
import {
  cnpjValido,
  cpfValido,
  formatarDocumento,
  formatarTelefone,
  linkWhatsApp,
  telefoneValido,
} from './documento';

describe('documentos', () => {
  it('valida CPF', () => {
    expect(cpfValido('529.982.247-25')).toBe(true);
    expect(cpfValido('529.982.247-24')).toBe(false);
    expect(cpfValido('111.111.111-11')).toBe(false);
    expect(cpfValido('123')).toBe(false);
  });

  it('valida CNPJ', () => {
    expect(cnpjValido('11.222.333/0001-81')).toBe(true);
    expect(cnpjValido('11.222.333/0001-80')).toBe(false);
    expect(cnpjValido('00000000000000')).toBe(false);
  });

  it('formata CPF, CNPJ e telefone', () => {
    expect(formatarDocumento('52998224725')).toBe('529.982.247-25');
    expect(formatarDocumento('11222333000181')).toBe('11.222.333/0001-81');
    expect(formatarTelefone('11935925216')).toBe('(11) 93592-5216');
    expect(formatarTelefone('1135925216')).toBe('(11) 3592-5216');
  });

  it('valida telefone e monta link do WhatsApp', () => {
    expect(telefoneValido('(11) 3592-5216')).toBe(true);
    expect(telefoneValido('3592-5216')).toBe(false);
    expect(linkWhatsApp('(11) 93592-5216')).toBe('https://wa.me/5511935925216');
    expect(linkWhatsApp('123')).toBeNull();
  });
});
