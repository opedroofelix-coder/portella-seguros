import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cloneElement, forwardRef, isValidElement, useId } from 'react';
import styles from './Campo.module.css';

export interface CampoProps {
  rotulo: string;
  erro?: string;
  dica?: string;
  obrigatorio?: boolean;
  className?: string;
  /** Um único controle (Entrada, Selecao, AreaTexto). Recebe id e atributos de acessibilidade. */
  children: ReactNode;
}

export function Campo({ rotulo, erro, dica, obrigatorio, className, children }: CampoProps) {
  const id = useId();
  const idDica = dica ? `${id}-dica` : undefined;
  const idErro = erro ? `${id}-erro` : undefined;
  const descritoPor = [idDica, idErro].filter(Boolean).join(' ') || undefined;
  const controle = isValidElement<Record<string, unknown>>(children)
    ? cloneElement(children, {
        id,
        'aria-invalid': erro ? true : undefined,
        'aria-describedby': descritoPor,
        'aria-required': obrigatorio || undefined,
      })
    : children;

  return (
    <div className={[styles.campo, className].filter(Boolean).join(' ')}>
      {/* O asterisco fica fora do <label> para não entrar no nome acessível; aria-required informa. */}
      <span className={styles.linhaRotulo}>
        <label className={styles.rotulo} htmlFor={id}>{rotulo}</label>
        {obrigatorio && <span className={styles.obrigatorio} aria-hidden="true">*</span>}
      </span>
      {controle}
      {dica && !erro && <span id={idDica} className={styles.dica}>{dica}</span>}
      {erro && <span id={idErro} className={styles.erro} role="alert">{erro}</span>}
    </div>
  );
}

export const Entrada = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Entrada(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={[styles.controle, className].filter(Boolean).join(' ')} {...props} />;
});

export const Selecao = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Selecao(
  { className, ...props },
  ref,
) {
  return <select ref={ref} className={[styles.controle, className].filter(Boolean).join(' ')} {...props} />;
});

export const AreaTexto = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function AreaTexto(
  { className, ...props },
  ref,
) {
  return <textarea ref={ref} className={[styles.controle, className].filter(Boolean).join(' ')} {...props} />;
});
