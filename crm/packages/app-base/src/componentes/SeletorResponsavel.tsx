import { Campo, Selecao } from '@portella/ui';
import type { SelectHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { useEquipe } from '../hooks/dados';
import { useSessao } from '../sessao/Sessao';

/** Só aparece para quem pode transferir registros entre corretores (admin e gestor). */
export const SeletorResponsavel = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function SeletorResponsavel(props, ref) {
    const { pode } = useSessao();
    const { equipe } = useEquipe();
    if (!pode('registro:transferir')) return null;
    return (
      <Campo rotulo="Responsável">
        <Selecao ref={ref} {...props}>
          {equipe
            .filter((u) => u.ativo)
            .map((u) => (
              <option key={u.id} value={u.id}>{u.nome}</option>
            ))}
        </Selecao>
      </Campo>
    );
  },
);
