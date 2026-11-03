import type { Cliente } from '@portella/core';
import { Botao, EstadoVazio } from '@portella/ui';
import { useState } from 'react';
import type { Cota } from '../../domain/cota';
import { useCotas } from '../hooks';
import { FormularioCota } from './FormularioCota';
import { TabelaCotas } from './TabelaCotas';

export function CotasDoCliente({ cliente }: { cliente: Cliente }) {
  const { data = [] } = useCotas();
  const [editando, setEditando] = useState<Cota | 'nova' | null>(null);
  const doCliente = data.filter((c) => c.clienteId === cliente.id);
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Botao pequeno icone="mais" onClick={() => setEditando('nova')}>
          Nova cota
        </Botao>
      </div>
      <TabelaCotas
        cotas={doCliente}
        mostrarCliente={false}
        aoClicar={setEditando}
        vazio={<EstadoVazio titulo="Nenhuma cota">Cadastre a primeira cota deste cliente.</EstadoVazio>}
      />
      {editando && (
        <FormularioCota
          cota={editando === 'nova' ? undefined : editando}
          clienteId={cliente.id}
          aoFechar={() => setEditando(null)}
        />
      )}
    </>
  );
}

/** Cliente com cota ativa ou contemplada não pode ser excluído: a cota perderia o vínculo. */
export function useBloqueioExclusaoConsorcio(cliente: Cliente): string | null {
  const { data = [] } = useCotas();
  const ativas = data.filter(
    (c) => c.clienteId === cliente.id && (c.status === 'ativa' || c.status === 'contemplada'),
  ).length;
  if (!ativas) return null;
  return `${cliente.nome} tem ${ativas === 1 ? '1 cota ativa ou contemplada' : `${ativas} cotas ativas ou contempladas`}. Cancele ou quite ${ativas === 1 ? 'a cota' : 'as cotas'} antes de excluir o cadastro.`;
}
