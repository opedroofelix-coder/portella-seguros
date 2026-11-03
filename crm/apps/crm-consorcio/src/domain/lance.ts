import type { Centavos, DataISO, Registro } from '@portella/core';
import { dataValida, ErroValidacao, formatarData, formatarDinheiro } from '@portella/core';
import type { Cota } from './cota';

export const TIPOS_LANCE = ['livre', 'fixo', 'embutido'] as const;
export type TipoLance = (typeof TIPOS_LANCE)[number];
export const ROTULO_TIPO_LANCE: Record<TipoLance, string> = {
  livre: 'Livre',
  fixo: 'Fixo',
  embutido: 'Embutido',
};

export const RESULTADOS_LANCE = ['aguardando', 'contemplado', 'nao_contemplado'] as const;
export type ResultadoLance = (typeof RESULTADOS_LANCE)[number];
export const ROTULO_RESULTADO: Record<ResultadoLance, string> = {
  aguardando: 'Aguardando assembleia',
  contemplado: 'Contemplado',
  nao_contemplado: 'Não contemplado',
};

export interface Lance extends Registro {
  cotaId: string;
  assembleia: DataISO;
  tipo: TipoLance;
  /** Percentual do crédito ofertado (ex.: 25 = 25%). */
  percentual?: number;
  valor?: Centavos;
  resultado: ResultadoLance;
  observacoes?: string;
}

export function validarLance(l: Partial<Lance>): void {
  const campos: Record<string, string> = {};
  if (!l.cotaId) campos.cotaId = 'Escolha a cota.';
  if (!l.assembleia || !dataValida(l.assembleia)) campos.assembleia = 'Data inválida.';
  if (l.percentual == null && l.valor == null) campos.percentual = 'Informe o percentual ou o valor.';
  if (l.percentual != null && (l.percentual <= 0 || l.percentual > 100))
    campos.percentual = 'Entre 0 e 100%.';
  if (Object.keys(campos).length) throw new ErroValidacao('Confira os dados do lance.', campos);
}

/** Lance coerente com a cota: valor até o crédito e assembleia depois da adesão. */
export function validarLanceNaCota(
  l: Pick<Lance, 'assembleia' | 'valor'>,
  cota: Pick<Cota, 'valorCredito' | 'dataAdesao'>,
): void {
  const campos: Record<string, string> = {};
  if (l.valor != null && l.valor > cota.valorCredito)
    campos.valor = `Maior que o crédito da cota (${formatarDinheiro(cota.valorCredito)}).`;
  if (l.assembleia && cota.dataAdesao && l.assembleia < cota.dataAdesao)
    campos.assembleia = `Antes da adesão da cota (${formatarData(cota.dataAdesao)}).`;
  if (Object.keys(campos).length) throw new ErroValidacao('Confira os dados do lance.', campos);
}
