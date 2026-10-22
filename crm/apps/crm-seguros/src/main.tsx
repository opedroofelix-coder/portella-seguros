import '@portella/ui/styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { criarServicos } from './infrastructure/container';
import { App } from './presentation/App';

const raiz = createRoot(document.getElementById('raiz')!);

criarServicos()
  .then((servicos) =>
    raiz.render(
      <StrictMode>
        <App servicos={servicos} />
      </StrictMode>,
    ),
  )
  .catch((erro) => {
    console.error(erro);
    raiz.render(<p style={{ padding: 24 }}>Não foi possível abrir o banco de dados deste navegador. Verifique se o modo privado está desativado.</p>);
  });
