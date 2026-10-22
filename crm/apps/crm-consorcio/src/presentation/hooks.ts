import { useColecao, useServicos } from '@portella/app-base';
import type { ServicosConsorcio } from '../application/servicos';

export const useServicosConsorcio = () => useServicos<ServicosConsorcio>();

export function useCotas() {
  const { cotas } = useServicosConsorcio();
  return useColecao('cotas', cotas);
}

export function useLances() {
  const { lances } = useServicosConsorcio();
  return useColecao('lances', lances);
}
