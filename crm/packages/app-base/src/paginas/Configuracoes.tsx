import type { TipoCatalogo, Usuario } from '@portella/core';
import { normalizar } from '@portella/core';
import {
  Botao,
  CabecalhoPagina,
  Campo,
  Cartao,
  Carregando,
  ConfirmarAcao,
  Entrada,
  useAvisos,
} from '@portella/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useConfig, useRefinada, useRotuloPerfil } from '../config';
import { mensagemErro } from '../erros';
import { useCatalogo, useEquipe } from '../hooks/dados';
import { useServicos } from '../servicos';
import { useSessao, useUsuario } from '../sessao/Sessao';
import styles from './Configuracoes.module.css';

export function PaginaConfiguracoes() {
  const { pode } = useSessao();
  const { catalogosExtras = [] } = useConfig();
  return (
    <>
      <CabecalhoPagina
        titulo="Configurações"
        descricao="% de repasse dos produtores e listas usadas nas propostas e nos estornos."
      />
      <div className="grade">
        {pode('usuarios:gerenciar') && <RepasseProdutores />}
        <div className="grade-2">
          <EditorCatalogo tipo="produtos" titulo="Produtos" />
          <EditorCatalogo tipo="seguradoras" titulo="Seguradoras" />
        </div>
        {catalogosExtras.map((c) => (
          <EditorCatalogo key={c.tipo} tipo={c.tipo} titulo={c.titulo} descricao={c.descricao} />
        ))}
      </div>
    </>
  );
}

const textoPct = (n?: number) => (n == null ? '' : String(n).replace('.', ','));
const lerPct = (v: string) => (v.trim() ? Number(v.trim().replace(',', '.')) : NaN);

/** A administradora altera o % de repasse de cada produtor (e, se quiser, das propostas em aberto). */
function RepasseProdutores() {
  const { equipe, isPending } = useEquipe();
  const [aplicar, setAplicar] = useState(false);
  const ativos = equipe.filter((u) => u.ativo).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  return (
    <Cartao titulo="Repasse dos produtores (%)">
      <p className="texto-suave" style={{ marginTop: 0 }}>
        O % de cada produtor é sugerido nas propostas novas. Para mudar também as propostas que ainda têm
        saldo a receber, marque a opção abaixo antes de salvar: o que já foi recebido continua com o % antigo.
      </p>
      <label className={styles.marcar}>
        <input type="checkbox" checked={aplicar} onChange={(e) => setAplicar(e.target.checked)} />
        Aplicar também às propostas em aberto
      </label>
      {isPending ? (
        <Carregando />
      ) : (
        <ul className={styles.lista}>
          <li className={styles.cabecalho} aria-hidden="true">
            <span>Produtor</span>
            <span>Repasse (%)</span>
          </li>
          {ativos.map((u) => (
            <LinhaRepasse
              key={`${u.id}:${u.percentualRepasse ?? ''}`}
              produtor={u}
              aplicar={aplicar}
              aoAplicar={() => setAplicar(false)}
            />
          ))}
        </ul>
      )}
    </Cartao>
  );
}

function LinhaRepasse({
  produtor,
  aplicar,
  aoAplicar,
}: {
  produtor: Usuario;
  aplicar: boolean;
  /** Depois de aplicar às propostas, a opção é desmarcada (não fica ligada para o próximo). */
  aoAplicar: () => void;
}) {
  const usuario = useUsuario();
  const refinada = useRefinada();
  const rotuloPerfil = useRotuloPerfil();
  const [confirmar, setConfirmar] = useState(false);
  const { usuarios, propostas } = useServicos();
  const consultas = useQueryClient();
  const { avisar } = useAvisos();
  const [valor, setValor] = useState(textoPct(produtor.percentualRepasse));
  const pct = lerPct(valor);
  const valido = pct >= 0 && pct <= 100;
  const mudou = pct !== produtor.percentualRepasse;

  const salvar = useMutation({
    mutationFn: async () => {
      if (mudou) await usuarios.atualizar(usuario, produtor.id, { percentualRepasse: pct });
      return aplicar ? propostas.aplicarPercentualProdutor(usuario, produtor.id, pct) : null;
    },
    onSuccess: async (resultado) => {
      await Promise.all([
        consultas.invalidateQueries({ queryKey: ['usuarios'] }),
        consultas.invalidateQueries({ queryKey: ['propostas'] }),
      ]);
      let texto = `Repasse de ${produtor.nome}: ${textoPct(pct)}%.`;
      if (resultado) {
        texto += ` ${resultado.alteradas} proposta(s) em aberto atualizada(s).`;
        if (resultado.ignoradas)
          texto += ` ${resultado.ignoradas} ficaram como estavam: a soma dos % passaria de 100%.`;
        if (refinada) aoAplicar();
      }
      setConfirmar(false);
      avisar(texto);
    },
    onError: (e) => avisar(mensagemErro(e), 'erro'),
  });

  return (
    <li>
      <form
        className={styles.linha}
        onSubmit={(e) => {
          e.preventDefault();
          if (!valido) return;
          // Aplicar às propostas em aberto muda várias propostas de uma vez: confirma antes.
          if (refinada && aplicar) setConfirmar(true);
          else salvar.mutate();
        }}
      >
        <span className={styles.nome}>
          <strong>{produtor.nome}</strong>
          <span className="texto-suave">{rotuloPerfil(produtor.perfil)}</span>
        </span>
        <span className={styles.campo}>
          <Entrada
            aria-label={`% de ${produtor.nome}`}
            aria-invalid={valor && !valido ? true : undefined}
            inputMode="decimal"
            placeholder="—"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
          {valor && !valido && <small role="alert">Entre 0 e 100.</small>}
        </span>
        <Botao
          type="submit"
          variante="secundario"
          carregando={salvar.isPending}
          disabled={!valido || (!mudou && !aplicar)}
        >
          {aplicar ? (refinada ? 'Salvar e aplicar…' : 'Salvar e aplicar') : 'Salvar'}
        </Botao>
      </form>
      {refinada && (
        <ConfirmarAcao
          aberto={confirmar}
          titulo={`Aplicar ${textoPct(pct)}% às propostas em aberto?`}
          mensagem={`Todas as propostas de ${produtor.nome} com saldo a receber passam a usar ${textoPct(pct)}%. O que já foi recebido continua com o % antigo.`}
          textoConfirmar="Aplicar às propostas"
          carregando={salvar.isPending}
          aoCancelar={() => setConfirmar(false)}
          aoConfirmar={() => salvar.mutate()}
        />
      )}
    </li>
  );
}

function EditorCatalogo({
  tipo,
  titulo,
  descricao,
}: {
  tipo: TipoCatalogo;
  titulo: string;
  descricao?: string;
}) {
  const itens = useCatalogo(tipo);
  const usuario = useUsuario();
  const { catalogos } = useServicos();
  const consultas = useQueryClient();
  const { avisar } = useAvisos();
  const [novo, setNovo] = useState('');
  const refinada = useRefinada();
  const [removendo, setRemovendo] = useState<string | null>(null);
  const salvar = useMutation({
    mutationFn: (lista: string[]) => catalogos.salvar(usuario, tipo, lista),
    onSuccess: () => consultas.invalidateQueries({ queryKey: ['catalogos', tipo] }),
    onError: (e) => avisar(mensagemErro(e), 'erro'),
  });
  const incluir = () => {
    if (!novo.trim()) return;
    if (refinada) {
      // Sem duplicar ("sul america" = "SulAmérica") e sem perder o texto se der erro.
      const igual = itens.find(
        (i) => normalizar(i).replace(/\s/g, '') === normalizar(novo).replace(/\s/g, ''),
      );
      if (igual) return avisar(`"${igual}" já está na lista.`, 'erro');
      salvar.mutate([...itens, novo.trim()], {
        onSuccess: () => {
          avisar(`"${novo.trim()}" incluído.`);
          setNovo('');
        },
      });
      return;
    }
    salvar.mutate([...itens, novo], { onSuccess: () => avisar(`"${novo.trim()}" incluído.`) });
    setNovo('');
  };
  const lista = refinada ? [...itens].sort((a, b) => a.localeCompare(b, 'pt-BR')) : itens;

  return (
    <Cartao titulo={`${titulo} (${itens.length})`}>
      {descricao && (
        <p className="texto-suave" style={{ marginTop: 0 }}>
          {descricao}
        </p>
      )}
      <form
        className="acoes-linha"
        style={{ justifyContent: 'stretch', alignItems: 'flex-end', marginBottom: 14 }}
        onSubmit={(e) => {
          e.preventDefault();
          incluir();
        }}
      >
        <Campo rotulo={`Incluir em ${titulo.toLowerCase()}`} className="span-todo">
          <Entrada value={novo} onChange={(e) => setNovo(e.target.value)} />
        </Campo>
        <Botao type="submit" icone="mais" carregando={salvar.isPending}>
          Incluir
        </Botao>
      </form>
      <ul className="lista-simples">
        {lista.map((item) => (
          <li key={item}>
            <div className="linha">
              <span>
                <strong>{item}</strong>
              </span>
              <Botao
                variante="fantasma"
                pequeno
                soIcone
                icone="lixeira"
                onClick={() =>
                  refinada ? setRemovendo(item) : salvar.mutate(itens.filter((i) => i !== item))
                }
              >
                {refinada ? `Excluir ${item}` : `Remover ${item}`}
              </Botao>
            </div>
          </li>
        ))}
      </ul>
      {refinada && (
        <ConfirmarAcao
          aberto={removendo != null}
          titulo={`Excluir "${removendo}" da lista?`}
          mensagem={
            descricao
              ? 'Some das opções dos lançamentos novos. Os já lançados continuam com esse nome.'
              : 'Some das opções das propostas novas. As propostas já lançadas continuam com esse nome.'
          }
          textoConfirmar="Excluir da lista"
          perigo
          carregando={salvar.isPending}
          aoCancelar={() => setRemovendo(null)}
          aoConfirmar={() =>
            salvar.mutate(
              itens.filter((i) => i !== removendo),
              {
                onSuccess: () => {
                  avisar(`"${removendo}" excluído da lista.`);
                  setRemovendo(null);
                },
              },
            )
          }
        />
      )}
    </Cartao>
  );
}
