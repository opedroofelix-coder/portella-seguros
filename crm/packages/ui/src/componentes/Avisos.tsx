import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import styles from './Avisos.module.css';
import { Botao } from './Botao';

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
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const remover = useCallback((id: number) => setAvisos((a) => a.filter((x) => x.id !== id)), []);
  const avisar = useCallback(
    (texto: string, tipo: TipoAviso = 'sucesso') => {
      const id = proximoId++;
      setAvisos((a) => [...a.slice(-2), { id, tipo, texto }]);
      setTimeout(() => remover(id), duracao);
    },
    [duracao, remover],
  );
  const api = useMemo(() => ({ avisar }), [avisar]);

  return (
    <Contexto.Provider value={api}>
      {children}
      <div className={styles.pilha} aria-live="polite">
        {avisos.map((a) => (
          <div key={a.id} className={`${styles.aviso} ${a.tipo === 'info' ? '' : styles[a.tipo]}`} role={a.tipo === 'erro' ? 'alert' : 'status'}>
            <p>{a.texto}</p>
            <Botao variante="fantasma" soIcone icone="fechar" pequeno onClick={() => remover(a.id)}>Dispensar</Botao>
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
