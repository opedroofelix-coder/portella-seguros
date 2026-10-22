import type { ServicoCarteira, Usuario } from '@portella/core';
import type { Cota } from '../domain/cota';
import type { Lance, ResultadoLance } from '../domain/lance';

/** Registra o resultado da assembleia; lance vencedor marca a cota como contemplada por lance. */
export async function registrarResultado(
  lances: ServicoCarteira<Lance>,
  cotas: ServicoCarteira<Cota>,
  usuario: Usuario,
  lance: Lance,
  resultado: ResultadoLance,
): Promise<void> {
  if (resultado === 'contemplado') {
    const cota = await cotas.obter(usuario, lance.cotaId);
    await cotas.salvar(usuario, {
      ...cota,
      status: 'contemplada',
      contemplacao: { data: lance.assembleia, forma: 'lance' },
    });
  }
  await lances.salvar(usuario, { ...lance, resultado });
}
