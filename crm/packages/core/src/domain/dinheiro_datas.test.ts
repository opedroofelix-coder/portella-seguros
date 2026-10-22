import { describe, expect, it } from 'vitest';
import { dataValida, diasEntre, formatarData, hojeISO, somarDias, somarMeses } from './datas';
import { centavosParaTexto, formatarDinheiro, paraCentavos, porcentagem } from './dinheiro';

describe('dinheiro', () => {
  it('converte textos em centavos', () => {
    expect(paraCentavos('R$ 1.234,56')).toBe(123456);
    expect(paraCentavos('1234.5')).toBe(123450);
    expect(paraCentavos('99')).toBe(9900);
    expect(paraCentavos(10.1)).toBe(1010);
    expect(paraCentavos('abc')).toBeNull();
    expect(paraCentavos('')).toBeNull();
  });

  it('formata em reais', () => {
    expect(formatarDinheiro(123456).replace(/\s/g, ' ')).toBe('R$ 1.234,56');
    expect(formatarDinheiro(null)).toBe('—');
    expect(centavosParaTexto(123456)).toBe('1234,56');
  });

  it('calcula porcentagem arredondando', () => {
    expect(porcentagem(100000, 15)).toBe(15000);
    expect(porcentagem(333, 10)).toBe(33);
  });
});

describe('datas', () => {
  it('calcula dias e soma períodos', () => {
    expect(diasEntre('2026-10-22', '2026-11-21')).toBe(30);
    expect(diasEntre('2026-10-22', '2026-10-01')).toBe(-21);
    expect(somarDias('2026-12-30', 3)).toBe('2027-01-02');
    expect(somarMeses('2026-01-31', 1)).toBe('2026-02-28');
    expect(somarMeses('2026-10-22', 12)).toBe('2027-10-22');
  });

  it('formata e valida', () => {
    expect(formatarData('2026-10-22')).toBe('22/10/2026');
    expect(formatarData(undefined)).toBe('—');
    expect(dataValida('2026-02-30')).toBe(false);
    expect(dataValida('2026-02-28')).toBe(true);
    expect(hojeISO(new Date(2026, 9, 5))).toBe('2026-10-05');
  });
});
