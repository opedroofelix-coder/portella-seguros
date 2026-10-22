import { useAvisos } from '@portella/ui';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mensagemErro } from '../erros';
import { useSessao } from '../sessao/Sessao';
import styles from './BarraDemo.module.css';
import { ADMIN_DEMO, PRODUTORA_DEMO } from './semear';

/** Faixa fixa da demonstração: troca entre a visão da administradora e a de uma produtora. */
export function BarraDemo({ aoRecomecar }: { aoRecomecar: () => void }) {
  const { usuario, entrar } = useSessao();
  const navegar = useNavigate();
  const { avisar } = useAvisos();
  useEffect(() => {
    document.body.classList.add('com-demo');
    return () => document.body.classList.remove('com-demo');
  }, []);
  const visao = usuario?.login === PRODUTORA_DEMO.login ? 'produtora' : 'admin';

  const trocar = async (para: string) => {
    const conta = para === 'produtora' ? PRODUTORA_DEMO : ADMIN_DEMO;
    try {
      await entrar(conta.login, conta.senha);
      navegar('/');
    } catch (e) {
      avisar(mensagemErro(e), 'erro');
    }
  };

  return (
    <aside className={styles.barra} aria-label="Demonstração">
      <span className={styles.selo}>
        <strong>Demonstração</strong> · dados fictícios
      </span>
      <label className={styles.visao}>
        <span>Ver como</span>
        <select value={usuario ? visao : ''} onChange={(e) => trocar(e.target.value)}>
          {!usuario && <option value="">Escolha…</option>}
          <option value="admin">Administradora</option>
          <option value="produtora">Gisele (produtora)</option>
        </select>
      </label>
      <button type="button" className={styles.recomecar} onClick={aoRecomecar}>
        Recomeçar
      </button>
    </aside>
  );
}
