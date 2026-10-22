import type { TomSelo } from '@portella/ui';
import { Selo } from '@portella/ui';
import type { StatusCota } from '../../domain/cota';
import { ROTULO_STATUS_COTA } from '../../domain/cota';
import type { ResultadoLance } from '../../domain/lance';
import { ROTULO_RESULTADO } from '../../domain/lance';

const TOM_COTA: Record<StatusCota, TomSelo> = {
  ativa: 'sucesso',
  contemplada: 'dourado',
  quitada: 'info',
  cancelada: 'neutro',
};
const TOM_LANCE: Record<ResultadoLance, TomSelo> = {
  aguardando: 'alerta',
  contemplado: 'dourado',
  nao_contemplado: 'neutro',
};

export const SeloCota = ({ status }: { status: StatusCota }) => (
  <Selo tom={TOM_COTA[status]}>{ROTULO_STATUS_COTA[status]}</Selo>
);
export const SeloLance = ({ resultado }: { resultado: ResultadoLance }) => (
  <Selo tom={TOM_LANCE[resultado]}>{ROTULO_RESULTADO[resultado]}</Selo>
);
