import { lerDinheiro, mascararCep, mascararDocumento, mascararTelefone, textoDinheiro } from '@portella/core';
import type { EntradaAfixadaProps } from '@portella/ui';
import { Entrada, EntradaAfixada } from '@portella/ui';
import type { ChangeEvent, FocusEvent, InputHTMLAttributes } from 'react';
import { forwardRef } from 'react';

/** Troca o valor do campo e avisa o formulário (react-hook-form lê o evento de change). */
function reescrever(
  e: FocusEvent<HTMLInputElement> | ChangeEvent<HTMLInputElement>,
  novo: string,
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void,
) {
  if (e.target.value === novo) return;
  e.target.value = novo;
  onChange?.(e as ChangeEvent<HTMLInputElement>);
}

/**
 * Valor em reais. Aceita "1500", "1.500" ou "1.500,00" e, ao sair do campo, mostra "1.500,00",
 * que o `paraCentavos` lê sem ambiguidade.
 */
export const EntradaDinheiro = forwardRef<HTMLInputElement, Omit<EntradaAfixadaProps, 'prefixo'>>(
  function EntradaDinheiro({ onBlur, onChange, ...props }, ref) {
    return (
      <EntradaAfixada
        ref={ref}
        prefixo="R$"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0,00"
        onChange={onChange}
        onBlur={(e) => {
          const centavos = lerDinheiro(e.target.value);
          if (centavos != null) reescrever(e, textoDinheiro(centavos), onChange);
          onBlur?.(e);
        }}
        {...props}
      />
    );
  },
);

/** Percentual com o "%" ao lado; aceita vírgula ou ponto. */
export const EntradaPercentual = forwardRef<HTMLInputElement, Omit<EntradaAfixadaProps, 'sufixo'>>(
  function EntradaPercentual(props, ref) {
    return <EntradaAfixada ref={ref} sufixo="%" inputMode="decimal" autoComplete="off" {...props} />;
  },
);

const MASCARAS = { documento: mascararDocumento, telefone: mascararTelefone, cep: mascararCep };

/** CPF/CNPJ, telefone ou CEP formatados enquanto se digita. */
export const EntradaMascara = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { mascara: keyof typeof MASCARAS }
>(function EntradaMascara({ mascara, onChange, ...props }, ref) {
  return (
    <Entrada
      ref={ref}
      inputMode={mascara === 'documento' || mascara === 'cep' ? 'numeric' : 'tel'}
      autoComplete="off"
      onChange={(e) => {
        const novo = MASCARAS[mascara](e.target.value);
        if (novo !== e.target.value) e.target.value = novo;
        onChange?.(e);
      }}
      {...props}
    />
  );
});
