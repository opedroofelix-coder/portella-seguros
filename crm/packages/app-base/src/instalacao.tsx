import { Botao } from '@portella/ui';
import { useSyncExternalStore } from 'react';

/**
 * Atalho de aplicativo (PWA): o navegador avisa uma vez, logo ao abrir, que o app pode ser instalado
 * (Chrome e Edge, no computador e no Android). O aviso é guardado aqui para o botão usar depois.
 * No iPhone não há aviso: a instalação é pelo menu Compartilhar do Safari.
 */
interface EventoInstalacao extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let pedido: EventoInstalacao | null = null;
let instalado = false;
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((o) => o());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    pedido = e as EventoInstalacao;
    avisar();
  });
  window.addEventListener('appinstalled', () => {
    pedido = null;
    instalado = true;
    avisar();
  });
}

const rodandoComoApp = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true);
const ehIphone = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

const assinar = (o: () => void) => {
  ouvintes.add(o);
  return () => ouvintes.delete(o);
};
const estado = () => (instalado || rodandoComoApp() ? 'instalado' : pedido ? 'disponivel' : 'indisponivel');

export function useInstalacao() {
  const situacao = useSyncExternalStore(assinar, estado, () => 'indisponivel' as const);
  return {
    situacao,
    iphone: ehIphone(),
    async instalar() {
      if (!pedido) return false;
      await pedido.prompt();
      const { outcome } = await pedido.userChoice;
      pedido = null;
      avisar();
      return outcome === 'accepted';
    },
  };
}

/** Cartão de Minha conta: instala o CRM como aplicativo, com ícone na área de trabalho ou na tela inicial. */
export function InstalarAplicativo() {
  const { situacao, iphone, instalar } = useInstalacao();
  if (situacao === 'instalado')
    return (
      <p className="texto-suave" style={{ margin: 0 }}>
        O CRM já está instalado neste aparelho. As atualizações entram sozinhas quando você abre o aplicativo
        de novo.
      </p>
    );
  return (
    <div className="grade">
      <p className="texto-suave" style={{ margin: 0 }}>
        Instale o CRM como aplicativo: ele ganha um ícone na área de trabalho do computador ou na tela inicial
        do celular e abre em janela própria. O acesso pelo navegador continua igual.
      </p>
      {situacao === 'disponivel' ? (
        <div>
          <Botao icone="mais" onClick={() => void instalar()}>
            Instalar aplicativo
          </Botao>
        </div>
      ) : iphone ? (
        <p style={{ margin: 0 }}>
          No iPhone ou iPad: abra no <strong>Safari</strong>, toque em <strong>Compartilhar</strong> e depois
          em <strong>Adicionar à Tela de Início</strong>.
        </p>
      ) : (
        <p style={{ margin: 0 }}>
          No Chrome ou no Edge, use o ícone de instalar na barra de endereço ou o menu{' '}
          <strong>⋮ › Instalar aplicativo</strong>. No celular Android: menu{' '}
          <strong>⋮ › Adicionar à tela inicial</strong>.
        </p>
      )}
    </div>
  );
}
