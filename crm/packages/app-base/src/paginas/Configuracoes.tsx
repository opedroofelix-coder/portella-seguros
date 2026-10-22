import type { TipoCatalogo } from '@portella/core';
import { Botao, CabecalhoPagina, Campo, Cartao, Entrada, useAvisos } from '@portella/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { mensagemErro } from '../erros';
import { useCatalogo } from '../hooks/dados';
import { useServicos } from '../servicos';
import { useUsuario } from '../sessao/Sessao';

export function PaginaConfiguracoes() {
  return (
    <>
      <CabecalhoPagina
        titulo="Configurações"
        descricao="Listas usadas nas propostas e nos estornos. Produtores e % de repasse ficam em Usuários."
      />
      <div className="grade-2">
        <EditorCatalogo tipo="produtos" titulo="Produtos" />
        <EditorCatalogo tipo="seguradoras" titulo="Seguradoras" />
      </div>
    </>
  );
}

function EditorCatalogo({ tipo, titulo }: { tipo: TipoCatalogo; titulo: string }) {
  const itens = useCatalogo(tipo);
  const usuario = useUsuario();
  const { catalogos } = useServicos();
  const consultas = useQueryClient();
  const { avisar } = useAvisos();
  const [novo, setNovo] = useState('');
  const salvar = useMutation({
    mutationFn: (lista: string[]) => catalogos.salvar(usuario, tipo, lista),
    onSuccess: () => consultas.invalidateQueries({ queryKey: ['catalogos', tipo] }),
    onError: (e) => avisar(mensagemErro(e), 'erro'),
  });
  const incluir = () => {
    if (!novo.trim()) return;
    salvar.mutate([...itens, novo], { onSuccess: () => avisar(`"${novo.trim()}" incluído.`) });
    setNovo('');
  };

  return (
    <Cartao titulo={`${titulo} (${itens.length})`}>
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
        {itens.map((item) => (
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
                onClick={() => salvar.mutate(itens.filter((i) => i !== item))}
              >
                {`Remover ${item}`}
              </Botao>
            </div>
          </li>
        ))}
      </ul>
    </Cartao>
  );
}
