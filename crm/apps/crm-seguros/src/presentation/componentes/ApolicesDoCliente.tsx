import type { Cliente } from '@portella/core';
import { Botao, Carregando, EstadoVazio } from '@portella/ui';
import { useState } from 'react';
import type { Apolice } from '../../domain/apolice';
import { useApolices } from '../hooks';
import { EstadoErro } from './EstadoErro';
import { FormularioApolice } from './FormularioApolice';
import { TabelaApolices } from './TabelaApolices';
import styles from './ApolicesDoCliente.module.css';

/** Seção "Apólices" na ficha do cliente, das mais recentes para as mais antigas. */
export function ApolicesDoCliente({ cliente }: { cliente: Cliente }) {
  const { data = [], isPending, isError, refetch } = useApolices();
  const [editando, setEditando] = useState<Apolice | 'nova' | null>(null);
  const doCliente = data.filter((a) => a.clienteId === cliente.id);

  return (
    <>
      <div className={styles.acoes}>
        <Botao pequeno icone="mais" onClick={() => setEditando('nova')}>
          Nova apólice
        </Botao>
      </div>
      {isError ? (
        <EstadoErro oque="as apólices" aoTentar={() => refetch()} />
      ) : isPending ? (
        <Carregando texto="Carregando as apólices…" />
      ) : (
        <TabelaApolices
          apolices={doCliente}
          mostrarCliente={false}
          aoClicar={setEditando}
          ordem="desc"
          vazio={
            <EstadoVazio titulo="Nenhuma apólice">Cadastre a primeira apólice deste cliente.</EstadoVazio>
          }
        />
      )}
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
