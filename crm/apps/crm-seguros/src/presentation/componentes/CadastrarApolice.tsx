import type { Proposta } from '@portella/core';
import { Botao } from '@portella/ui';
import { useState } from 'react';
import { apoliceDaProposta } from '../../application/checklist';
import { FormularioApolice } from './FormularioApolice';

/** Na proposta aprovada: abre a apólice nova já preenchida com os dados da proposta. */
export function CadastrarApolice({ proposta }: { proposta: Proposta }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <Botao variante="secundario" icone="documento" onClick={() => setAberto(true)}>
        Cadastrar apólice
      </Botao>
      {aberto && (
        <FormularioApolice inicial={apoliceDaProposta(proposta)} aoFechar={() => setAberto(false)} />
      )}
    </>
  );
}
