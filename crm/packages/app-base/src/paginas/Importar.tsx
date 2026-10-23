import {
  Botao,
  CabecalhoPagina,
  Campo,
  Cartao,
  classesBotao,
  ConfirmarAcao,
  Entrada,
  EstadoVazio,
  useAvisos,
} from '@portella/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { PreviaImportacao } from '../config';
import { useConfig, useRefinada } from '../config';
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
  const [confirmando, setConfirmando] = useState(false);
  const [concluida, setConcluida] = useState(false);
  const refinada = useRefinada();

  if (!importacao) return null;

  const escolher = async (arquivo: File | undefined) => {
    setPrevia(null);
    setErro(null);
    setConcluida(false);
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
      setConfirmando(false);
      setConcluida(true);
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
            dica={
              refinada
                ? 'O arquivo .json que o importador gera a partir da planilha da corretora. Escolher de novo o mesmo arquivo também funciona.'
                : 'Gere com: npm run importar -- planilha.xlsx'
            }
            erro={erro ?? undefined}
          >
            <Entrada
              type="file"
              accept="application/json,.json"
              onChange={(e) => {
                void escolher(e.target.files?.[0]);
                // Limpa a escolha para que o mesmo arquivo possa ser escolhido de novo.
                if (refinada) e.target.value = '';
              }}
              disabled={analisando || importando}
            />
          </Campo>
        </Cartao>
        <Cartao titulo="2. Conferir e importar">
          {!previa ? (
            refinada && concluida ? (
              <EstadoVazio
                titulo="Importação concluída"
                acao={
                  <Link className={classesBotao({ variante: 'secundario' })} to="/propostas">
                    Ver as propostas
                  </Link>
                }
              >
                Os dados já estão nas telas. Para atualizar, escolha o arquivo de novo.
              </EstadoVazio>
            ) : (
              <p className="texto-suave">
                {analisando ? 'Analisando…' : 'Escolha o arquivo para ver o que será importado.'}
              </p>
            )
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
                  <summary>
                    {previa.avisos.length} aviso(s)
                    {refinada && previa.avisos.length > 200 ? ' (mostrando os 200 primeiros)' : ''}
                  </summary>
                  <ul className="texto-suave">
                    {previa.avisos.slice(0, 200).map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </details>
              )}
              <div>
                <Botao
                  icone="importar"
                  carregando={!refinada && importando}
                  onClick={refinada ? () => setConfirmando(true) : confirmar}
                >
                  Importar agora
                </Botao>
              </div>
            </div>
          )}
        </Cartao>
      </div>
      {refinada && (
        <ConfirmarAcao
          aberto={confirmando}
          titulo="Importar os dados?"
          mensagem="Os registros novos entram e os que já vieram de uma importação anterior são atualizados, sem duplicar."
          textoConfirmar="Importar"
          carregando={importando}
          aoCancelar={() => setConfirmando(false)}
          aoConfirmar={() => void confirmar()}
        />
      )}
    </>
  );
}
