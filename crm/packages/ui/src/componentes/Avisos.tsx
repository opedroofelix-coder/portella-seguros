import type { ReactNode } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import styles from './Avisos.module.css';
import { Botao } from './Botao';
import { useInterface } from './Interface';

type TipoAviso = 'sucesso' | 'erro' | 'info';
interface Aviso {
  id: number;
  tipo: TipoAviso;
  texto: string;
}

interface ApiAvisos {
  avisar: (texto: string, tipo?: TipoAviso) => void;
}

const Contexto = createContext<ApiAvisos | null>(null);
let proximoId = 1;

export function ProvedorAvisos({ children, duracao = 4500 }: { children: ReactNode; duracao?: number }) {
  const { refinada } = useInterface();
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const relogios = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const remover = useCallback((id: number) => {
    clearTimeout(relogios.current.get(id));
    relogios.current.delete(id);
    setAvisos((a) => a.filter((x) => x.id !== id));
  }, []);
  const agendar = useCallback(
    (id: number) =>
      relogios.current.set(
        id,
        setTimeout(() => remover(id), duracao),
      ),
    [duracao, remover],
  );
  const pausar = (id: number) => clearTimeout(relogios.current.get(id));
  const avisar = useCallback(
    (texto: string, tipo: TipoAviso = 'sucesso') => {
      const id = proximoId++;
      // O mesmo aviso de novo (ex.: "Salvar" clicado duas vezes) substitui o anterior, sem empilhar.
      setAvisos((a) => {
        const repetidos = a.filter((x) => x.texto === texto && x.tipo === tipo);
        repetidos.forEach((x) => {
          clearTimeout(relogios.current.get(x.id));
          relogios.current.delete(x.id);
        });
        return [...a.filter((x) => !repetidos.includes(x)).slice(-2), { id, tipo, texto }];
      });
      // Com a interface refinada, erro fica até a pessoa dispensar.
      if (!(refinada && tipo === 'erro')) agendar(id);
    },
    [agendar, refinada],
  );
  useEffect(() => {
    const ativos = relogios.current;
    return () => ativos.forEach(clearTimeout);
  }, []);

  // No celular a janela ocupa quase a tela toda: com ela aberta, os avisos ficam logo acima dos
  // botões dela (Salvar, Cancelar), sem cobrir nenhum. No computador quem posiciona é o CSS.
  const pilha = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = pilha.current;
    if (!el) return;
    const posicionar = () => {
      const celular = window.matchMedia('(max-width: 719px)').matches;
      const rodapes = document.querySelectorAll('[role="dialog"] footer, [role="alertdialog"] footer');
      const rodape = rodapes[rodapes.length - 1];
      if (!celular || !rodape) {
        el.style.removeProperty('bottom');
        el.style.removeProperty('top');
        return;
      }
      el.style.top = 'auto';
      el.style.bottom = `${Math.max(16, window.innerHeight - rodape.getBoundingClientRect().top + 8)}px`;
    };
    posicionar();
    if (!avisos.length) return;
    // As janelas abrem num portal no <body>: abrir ou fechar uma reposiciona os avisos.
    const janelas = new MutationObserver(posicionar);
    janelas.observe(document.body, { childList: true });
    window.addEventListener('resize', posicionar);
    return () => {
      janelas.disconnect();
      window.removeEventListener('resize', posicionar);
    };
  }, [avisos]);
  const api = useMemo(() => ({ avisar }), [avisar]);

  return (
    <Contexto.Provider value={api}>
      {children}
      {/* Cada aviso já é uma região viva (status/alert); a pilha não repete o anúncio. */}
      <div ref={pilha} className={styles.pilha} aria-live={refinada ? undefined : 'polite'}>
        {avisos.map((a) => (
          <div
            key={a.id}
            className={`${styles.aviso} ${a.tipo === 'info' ? '' : styles[a.tipo]}`}
            role={a.tipo === 'erro' ? 'alert' : 'status'}
            onMouseEnter={refinada && a.tipo !== 'erro' ? () => pausar(a.id) : undefined}
            onMouseLeave={refinada && a.tipo !== 'erro' ? () => agendar(a.id) : undefined}
            onFocus={refinada && a.tipo !== 'erro' ? () => pausar(a.id) : undefined}
            onBlur={refinada && a.tipo !== 'erro' ? () => agendar(a.id) : undefined}
          >
            <p>{a.texto}</p>
            <Botao variante="fantasma" soIcone icone="fechar" pequeno onClick={() => remover(a.id)}>
              Dispensar
            </Botao>
          </div>
        ))}
      </div>
    </Contexto.Provider>
  );
}

export function useAvisos(): ApiAvisos {
  const api = useContext(Contexto);
  if (!api) throw new Error('useAvisos precisa estar dentro de <ProvedorAvisos>.');
  return api;
}
