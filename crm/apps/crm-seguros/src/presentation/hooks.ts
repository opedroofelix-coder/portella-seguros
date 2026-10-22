import { useColecao, useServicos } from '@portella/app-base';
import type { ServicosSeguros } from '../application/servicos';

export const useServicosSeguros = () => useServicos<ServicosSeguros>();

export function useApolices() {
  const { apolices } = useServicosSeguros();
  return useColecao('apolices', apolices);
}
