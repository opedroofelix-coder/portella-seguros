import { Botao, CabecalhoPagina, Campo, Cartao, Entrada, useAvisos } from '@portella/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { PreviaImportacao } from '../config';
import { useConfig } from '../config';
import { mensagemErro } from '../erros';
import { useEquipe } from '../hooks/dados';
import { useUsuario } from '../sessao/Sessao';

export function PaginaImportar() {
  const { importacao } = useConfig();
  const usuario = useUsuario();
  const { equipe } = useEquipe();
  const { avisar } = useAvisos();
  const cliente = useQueryClient();
  const [previa, setPrevia] = useState<PreviaImportacao | null>(null);
  const [analisando, setAnalisando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!importacao) return null;

  const escolher = async (arquivo: File | undefined) => {
    setPrevia(null);
    setErro(null);
    if (!arquivo) return;
    setAnalisando(true);
    try {
      const dados: unknown = JSON.parse(await arquivo.text());
      setPrevia(await importacao.analisar(dados, usuario, equipe));
    } catch (e) {
      setErro(e instanceof SyntaxError ? 'O arquivo não é um JSON válido.' : mensagemErro(e));
    } finally {
      setAnalisando(false);
    }
  };

  const confirmar = async () => {
    if (!previa) return;
    setImportando(true);
    try {
      await previa.confirmar();
      await cliente.invalidateQueries();
      avisar('Importação concluída.');
      setPrevia(null);
    } catch (e) {
      avisar(mensagemErro(e), 'erro');
    } finally {
      setImportando(false);
    }
  };

  return (
    <>
      <CabecalhoPagina
        titulo={
          <>
            Importar <em>planilha</em>
          </>
        }
        descricao={importacao.descricao}
      />
      <div className="grade-2">
        <Cartao titulo="1. Arquivo">
          <Campo
            rotulo="Arquivo gerado pelo importador (.json)"
            dica="Gere com: npm run importar -- planilha.xlsx"
            erro={erro ?? undefined}
          >
            <Entrada
              type="file"
              accept="application/json,.json"
              onChange={(e) => escolher(e.target.files?.[0])}
              disabled={analisando || importando}
            />
          </Campo>
        </Cartao>
        <Cartao titulo="2. Conferir e importar">
          {!previa ? (
            <p className="texto-suave">
              {analisando ? 'Analisando…' : 'Escolha o arquivo para ver o que será importado.'}
            </p>
          ) : (
            <div className="grade">
              <dl className="lista-dados">
                {previa.resumo.map(([rotulo, n]) => (
                  <div key={rotulo}>
                    <dt>{rotulo}</dt>
                    <dd>{n}</dd>
                  </div>
                ))}
              </dl>
              {previa.avisos.length > 0 && (
                <details>
                  <summary>{previa.avisos.length} aviso(s)</summary>
                  <ul className="texto-suave">
                    {previa.avisos.slice(0, 200).map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </details>
              )}
              <div>
                <Botao icone="importar" carregando={importando} onClick={confirmar}>
                  Importar agora
                </Botao>
              </div>
            </div>
          )}
        </Cartao>
      </div>
    </>
  );
}
