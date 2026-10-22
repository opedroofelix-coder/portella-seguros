import type { Cliente } from '@portella/core';
import { Botao, EstadoVazio } from '@portella/ui';
import { useState } from 'react';
import type { Apolice } from '../../domain/apolice';
import { useApolices } from '../hooks';
import { FormularioApolice } from './FormularioApolice';
import { TabelaApolices } from './TabelaApolices';

/** Seção "Apólices" na ficha do cliente. */
export function ApolicesDoCliente({ cliente }: { cliente: Cliente }) {
  const { data = [] } = useApolices();
  const [editando, setEditando] = useState<Apolice | 'nova' | null>(null);
  const doCliente = data.filter((a) => a.clienteId === cliente.id).sort((a, b) => b.fimVigencia.localeCompare(a.fimVigencia));

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Botao pequeno icone="mais" onClick={() => setEditando('nova')}>Nova apólice</Botao>
      </div>
      <TabelaApolices
        apolices={doCliente}
        mostrarCliente={false}
        aoClicar={setEditando}
        vazio={<EstadoVazio titulo="Nenhuma apólice">Cadastre a primeira apólice deste cliente.</EstadoVazio>}
      />
      {editando && (
        <FormularioApolice
          apolice={editando === 'nova' ? undefined : editando}
          inicial={{ clienteId: cliente.id, responsavelId: cliente.responsavelId }}
          aoFechar={() => setEditando(null)}
        />
      )}
    </>
  );
}
