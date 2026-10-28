import type {
  ForwardedRef,
  InputHTMLAttributes,
  KeyboardEvent,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import {
  cloneElement,
  forwardRef,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import styles from './Campo.module.css';
import { useInterface } from './Interface';
import type { ItemLista } from './Lista';
import { buscarPorInicio, idOpcao, lerOpcoes, PainelLista, proximoAtivo } from './Lista';
import estilosLista from './Lista.module.css';

/** Junta a ref de quem usa o componente (react-hook-form, por exemplo) com a ref interna. */
function juntarRefs<T>(externa: ForwardedRef<T>, interna: { current: T | null }) {
  return (el: T | null) => {
    interna.current = el;
    if (typeof externa === 'function') externa(el);
    else if (externa) externa.current = el;
  };
}

/** Muda o valor como se a pessoa tivesse digitado ou escolhido: o React e os formulários percebem. */
function definirValor(el: HTMLInputElement | HTMLSelectElement, valor: string, evento: 'input' | 'change') {
  const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, valor);
  el.dispatchEvent(new Event(evento, { bubbles: true }));
}

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
        <label className={styles.rotulo} htmlFor={id}>
          {rotulo}
        </label>
        {obrigatorio && (
          <span className={styles.obrigatorio} aria-hidden="true">
            *
          </span>
        )}
      </span>
      {controle}
      {dica && !erro && (
        <span id={idDica} className={styles.dica}>
          {dica}
        </span>
      )}
      {erro && (
        <span id={idErro} className={styles.erro} role="alert">
          {erro}
        </span>
      )}
    </div>
  );
}

export const Entrada = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Entrada(props, ref) {
    const { refinada } = useInterface();
    // Interface refinada: as sugestões (<datalist>) abrem no painel do app, não na lista do navegador.
    if (refinada && props.list) return <EntradaComSugestoes {...props} ref={ref} />;
    const { className, ...resto } = props;
    return <input ref={ref} className={[styles.controle, className].filter(Boolean).join(' ')} {...resto} />;
  },
);

const EntradaComSugestoes = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function EntradaComSugestoes({ className, list, onKeyDown, onBlur, onInput, onClick, ...props }, ref) {
    const campo = useRef<HTMLInputElement | null>(null);
    const idLista = useId();
    const [itens, setItens] = useState<ItemLista[]>([]);
    const [ativo, setAtivo] = useState(-1);
    const aberto = itens.length > 0;
    const fechar = useCallback(() => {
      setItens([]);
      setAtivo(-1);
    }, []);
    const abrir = (filtrar: boolean) => {
      const el = campo.current;
      if (!el || el.readOnly || el.disabled) return;
      const texto = filtrar ? el.value.trim().toLowerCase() : '';
      const todas = lerOpcoes(document.getElementById(list!) as HTMLDataListElement | null);
      const filtradas = texto
        ? todas.filter((o) => o.rotulo.toLowerCase().includes(texto) && o.valor !== el.value)
        : todas;
      setItens(filtradas.slice(0, 80));
      setAtivo(-1);
    };
    const escolher = (i: number) => {
      const it = itens[i];
      if (campo.current && it) definirValor(campo.current, it.valor, 'input');
      fechar();
    };
    const teclado = (e: KeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(e);
      if (e.defaultPrevented) return;
      if (!aberto) {
        if (e.key === 'ArrowDown' || (e.altKey && e.key === 'ArrowDown')) {
          e.preventDefault();
          abrir(false);
        }
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setAtivo((a) =>
          a < 0
            ? e.key === 'ArrowDown'
              ? 0
              : itens.length - 1
            : proximoAtivo(itens, a, e.key === 'ArrowDown' ? 1 : -1),
        );
      } else if (e.key === 'Enter' && ativo >= 0) {
        e.preventDefault();
        escolher(ativo);
      } else if (e.key === 'Escape') {
        // Esc com a lista aberta fecha só a lista, não a janela em volta.
        e.preventDefault();
        e.stopPropagation();
        fechar();
      } else if (e.key === 'Tab') fechar();
    };
    return (
      <>
        <input
          ref={juntarRefs(ref, campo)}
          className={[styles.controle, styles.comLista, className].filter(Boolean).join(' ')}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={aberto}
          aria-controls={aberto ? idLista : undefined}
          aria-activedescendant={aberto && ativo >= 0 ? idOpcao(idLista, ativo) : undefined}
          autoComplete="off"
          onKeyDown={teclado}
          onInput={(e) => {
            onInput?.(e);
            abrir(true);
          }}
          onClick={(e) => {
            onClick?.(e);
            if (aberto) fechar();
            else abrir(false);
          }}
          onBlur={(e) => {
            onBlur?.(e);
            fechar();
          }}
          {...props}
        />
        {aberto && campo.current && (
          <PainelLista
            ancora={campo.current}
            id={idLista}
            itens={itens}
            ativo={ativo}
            aoEscolher={escolher}
            aoPassar={setAtivo}
            aoFechar={fechar}
          />
        )}
      </>
    );
  },
);

export const Selecao = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Selecao(props, ref) {
    const { refinada } = useInterface();
    // Interface refinada: a lista abre no painel do app, igual em todas as telas e navegadores.
    if (refinada && !props.multiple) return <SelecaoRefinada {...props} ref={ref} />;
    const { className, ...resto } = props;
    return <select ref={ref} className={[styles.controle, className].filter(Boolean).join(' ')} {...resto} />;
  },
);

/**
 * O <select> continua no formulário (react-hook-form e quem lê o valor não mudam), escondido; um
 * botão com o papel de "combobox" mostra a escolha e abre o painel.
 */
const SelecaoRefinada = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function SelecaoRefinada(
    {
      className,
      id,
      disabled,
      title,
      'aria-label': rotuloAria,
      'aria-labelledby': rotuladoPor,
      'aria-invalid': invalido,
      'aria-describedby': descritoPor,
      'aria-required': obrigatorio,
      ...props
    },
    ref,
  ) {
    const select = useRef<HTMLSelectElement | null>(null);
    const botao = useRef<HTMLButtonElement>(null);
    const idLista = useId();
    const [aberto, setAberto] = useState(false);
    const [itens, setItens] = useState<ItemLista[]>([]);
    const [ativo, setAtivo] = useState(-1);
    const [atual, setAtual] = useState({ valor: '', rotulo: '' });
    const [, setVersao] = useState(0);
    const atualizar = useCallback(() => setVersao((v) => v + 1), []);
    const busca = useRef({ texto: '', ate: 0 });

    const ligar = useCallback((el: HTMLSelectElement | null) => juntarRefs(ref, select)(el), [ref]);
    // A cada renderização o botão relê a escolha do <select>: o valor pode mudar por código
    // (reset ou setValue do formulário, valor controlado), e o formulário renderiza de novo depois.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- de propósito a cada renderização (só grava se mudou)
    useLayoutEffect(() => {
      const el = select.current;
      const opcao = el?.selectedOptions[0];
      const novo = { valor: el?.value ?? '', rotulo: opcao ? opcao.label || opcao.text : '' };
      if (novo.valor !== atual.valor || novo.rotulo !== atual.rotulo) setAtual(novo);
    });
    useEffect(() => {
      const el = select.current;
      el?.addEventListener('change', atualizar);
      const formulario = el?.form;
      const aoLimpar = () => setTimeout(atualizar);
      formulario?.addEventListener('reset', aoLimpar);
      return () => {
        el?.removeEventListener('change', atualizar);
        formulario?.removeEventListener('reset', aoLimpar);
      };
    }, [atualizar]);

    const fechar = useCallback(() => setAberto(false), []);
    const abrir = () => {
      const lista = lerOpcoes(select.current);
      setItens(lista);
      const i = lista.findIndex((o) => o.valor === select.current?.value);
      setAtivo(i >= 0 ? i : proximoAtivo(lista, -1, 1));
      setAberto(true);
    };
    const escolher = (i: number) => {
      const it = itens[i];
      const el = select.current;
      if (el && it && !it.desativado && it.valor !== el.value) definirValor(el, it.valor, 'change');
      setAberto(false);
      botao.current?.focus();
    };
    const teclado = (e: KeyboardEvent<HTMLButtonElement>) => {
      if (!aberto) {
        if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
          e.preventDefault();
          abrir();
        }
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setAtivo((a) => proximoAtivo(itens, a, e.key === 'ArrowDown' ? 1 : -1));
      } else if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        setAtivo(e.key === 'Home' ? proximoAtivo(itens, -1, 1) : proximoAtivo(itens, itens.length, -1));
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (ativo >= 0) escolher(ativo);
      } else if (e.key === 'Escape') {
        // Esc com a lista aberta fecha só a lista, não a janela em volta.
        e.preventDefault();
        e.stopPropagation();
        setAberto(false);
      } else if (e.key === 'Tab') {
        setAberto(false);
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Digitar a inicial (ou as primeiras letras) leva até a opção, como na lista do sistema.
        const agora = Date.now();
        busca.current.texto = agora < busca.current.ate ? busca.current.texto + e.key : e.key;
        busca.current.ate = agora + 700;
        setAtivo((a) =>
          buscarPorInicio(itens, busca.current.texto, busca.current.texto.length > 1 ? a - 1 : a),
        );
      }
    };

    return (
      <span className={estilosLista.selecao}>
        <select
          ref={ligar}
          className={estilosLista.nativo}
          tabIndex={-1}
          aria-hidden="true"
          disabled={disabled}
          {...props}
        />
        <button
          ref={botao}
          type="button"
          id={id}
          role="combobox"
          className={[styles.controle, styles.comLista, estilosLista.gatilho, className]
            .filter(Boolean)
            .join(' ')}
          aria-haspopup="listbox"
          aria-expanded={aberto}
          aria-controls={aberto ? idLista : undefined}
          aria-activedescendant={aberto && ativo >= 0 ? idOpcao(idLista, ativo) : undefined}
          aria-label={rotuloAria}
          aria-labelledby={rotuladoPor}
          aria-invalid={invalido}
          aria-describedby={descritoPor}
          aria-required={obrigatorio}
          title={title}
          disabled={disabled}
          onClick={() => (aberto ? setAberto(false) : abrir())}
          onKeyDown={teclado}
          onBlur={fechar}
        >
          <span className={estilosLista.valor}>{atual.rotulo || ' '}</span>
        </button>
        {aberto && botao.current && (
          <PainelLista
            ancora={botao.current}
            id={idLista}
            itens={itens}
            ativo={ativo}
            selecionado={atual.valor}
            rotulo={rotuloAria}
            aoEscolher={escolher}
            aoPassar={setAtivo}
            aoFechar={fechar}
          />
        )}
      </span>
    );
  },
);

export const AreaTexto = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function AreaTexto({ className, ...props }, ref) {
    return (
      <textarea ref={ref} className={[styles.controle, className].filter(Boolean).join(' ')} {...props} />
    );
  },
);

export interface EntradaAfixadaProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Texto antes do valor ("R$"). */
  prefixo?: string;
  /** Texto depois do valor ("%"). */
  sufixo?: string;
}

/** Entrada com unidade fixa ao lado (R$, %). Os atributos (id, aria-*) vão para o <input>. */
export const EntradaAfixada = forwardRef<HTMLInputElement, EntradaAfixadaProps>(function EntradaAfixada(
  { prefixo, sufixo, className, ...props },
  ref,
) {
  return (
    <span className={[styles.afixada, className].filter(Boolean).join(' ')}>
      {prefixo && (
        <span className={styles.afixo} aria-hidden="true">
          {prefixo}
        </span>
      )}
      <input ref={ref} className={`${styles.controle} ${styles.controleAfixado}`} {...props} />
      {sufixo && (
        <span className={styles.afixo} aria-hidden="true">
          {sufixo}
        </span>
      )}
    </span>
  );
});
