import { describe, expect, it } from 'vitest';
import { lerDinheiro, textoDinheiro } from './dinheiro';
import { mascararCep, mascararDocumento, mascararTelefone } from './documento';

describe('valores digitados', () => {
  it('lê o ponto de milhar sem vírgula', () => {
    expect(lerDinheiro('1.500')).toBe(150000);
    expect(lerDinheiro('1.234.567')).toBe(123456700);
    expect(lerDinheiro('R$ 1.500,50')).toBe(150050);
    expect(lerDinheiro('1500')).toBe(150000);
    expect(lerDinheiro('1.5')).toBe(150);
    expect(lerDinheiro('12,3')).toBe(1230);
    expect(lerDinheiro('')).toBeNull();
    expect(lerDinheiro('abc')).toBeNull();
  });

  it('formata com separador de milhar', () => {
    expect(textoDinheiro(150000)).toBe('1.500,00');
    expect(textoDinheiro(5)).toBe('0,05');
    expect(textoDinheiro(undefined)).toBe('');
  });

  it('mascara CPF, CNPJ, telefone e CEP enquanto se digita', () => {
    expect(mascararDocumento('123')).toBe('123');
    expect(mascararDocumento('1234567')).toBe('123.456.7');
    expect(mascararDocumento('12345678901')).toBe('123.456.789-01');
    expect(mascararDocumento('12345678000199')).toBe('12.345.678/0001-99');
    expect(mascararTelefone('11')).toBe('(11');
    expect(mascararTelefone('1198888')).toBe('(11) 9888-8');
    expect(mascararTelefone('11988887777')).toBe('(11) 98888-7777');
    expect(mascararTelefone('1135925216')).toBe('(11) 3592-5216');
    expect(mascararCep('06023080')).toBe('06023-080');
  });
});
