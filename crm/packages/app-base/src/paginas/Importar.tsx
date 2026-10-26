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
  // Planilha com senha: guarda o arquivo até a senha ser informada.
  const [protegida, setProtegida] = useState<File | null>(null);
  const [senha, setSenha] = useState('');
  const refinada = useRefinada();

  if (!importacao) return null;

  /** A planilha (.xlsx) é convertida aqui mesmo, no navegador; o .json do importador também vale. */
  const lerArquivo = async (arquivo: File, senhaPlanilha?: string) => {
    if (/\.json$/i.test(arquivo.name)) {
      try {
        return { dados: JSON.parse(await arquivo.text()) as unknown, avisos: [] };
      } catch (e) {
        if (e instanceof SyntaxError) throw new Error('O arquivo não é um JSON válido.');
        throw e;
      }
    }
    const { converterPlanilha } = await import('@portella/importer/navegador');
    const r = await converterPlanilha(
      new Uint8Array(await arquivo.arrayBuffer()),
      arquivo.name,
      senhaPlanilha,
    );
    return { dados: r[importacao.parte] as unknown, avisos: r.avisos };
  };

  const escolher = async (arquivo: File | undefined, senhaPlanilha?: string) => {
    setPrevia(null);
    setErro(null);
    setConcluida(false);
    if (!arquivo) return;
    setAnalisando(true);
    try {
      const { dados, avisos } = await lerArquivo(arquivo, senhaPlanilha);
      const p = await importacao.analisar(dados, usuario, equipe);
      setPrevia({ ...p, avisos: [...avisos, ...p.avisos] });
      setProtegida(null);
      setSenha('');
    } catch (e) {
      const { ErroSenhaPlanilha } = await import('@portella/importer/navegador');
      if (e instanceof ErroSenhaPlanilha) {
        setProtegida(arquivo);
        if (e.motivo === 'incorreta') setErro(e.message);
      } else {
        setProtegida(null);
        setErro(mensagemErro(e));
      }
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
            rotulo="Planilha da corretora (.xlsx)"
            dica={
              refinada
                ? 'A planilha de controle da Portella, do jeito que está no Excel (A Receber, comissões de cada produtor…). Escolher de novo o mesmo arquivo também funciona.'
                : 'A planilha da Portella (.xlsx), do jeito que está no Excel.'
            }
            erro={protegida ? undefined : (erro ?? undefined)}
          >
            <Entrada
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.json,application/json"
              onChange={(e) => {
                void escolher(e.target.files?.[0]);
                // Limpa a escolha para que o mesmo arquivo possa ser escolhido de novo.
                if (refinada) e.target.value = '';
              }}
              disabled={analisando || importando}
            />
          </Campo>
          {protegida && (
            <form
              className="acoes-linha"
              style={{ justifyContent: 'stretch', alignItems: 'flex-end', marginTop: 14 }}
              onSubmit={(e) => {
                e.preventDefault();
                if (senha) void escolher(protegida, senha);
              }}
            >
              <Campo
                rotulo="Senha da planilha"
                className="span-todo"
                erro={erro ?? undefined}
                dica="A planilha tem senha. Ela é usada só para abrir o arquivo aqui e não fica guardada."
              >
                <Entrada
                  type="password"
                  autoComplete="off"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  autoFocus
                />
              </Campo>
              <Botao type="submit" carregando={analisando} disabled={!senha}>
                Abrir planilha
              </Botao>
            </form>
          )}
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
                {analisando
                  ? 'Lendo a planilha…'
                  : protegida
                    ? 'Informe a senha da planilha para continuar.'
                    : 'Escolha a planilha para ver o que será importado.'}
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
