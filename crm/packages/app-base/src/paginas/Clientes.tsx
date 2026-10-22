import type { Cliente } from '@portella/core';
import { corresponde, formatarDocumento, formatarTelefone, linkWhatsApp, normalizar } from '@portella/core';
import {
  BarraFiltros,
  Botao,
  CabecalhoPagina,
  Campo,
  classesBotao,
  Cartao,
  Carregando,
  ConfirmarAcao,
  Entrada,
  EstadoVazio,
  Icone,
  Selecao,
  Tabela,
  useAvisos,
} from '@portella/ui';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FormularioCliente } from '../componentes/FormularioCliente';
import { useConfig } from '../config';
import { mensagemErro } from '../erros';
import { useColecao, useEquipe, useRemover } from '../hooks/dados';
import { useServicos } from '../servicos';
import { useSessao } from '../sessao/Sessao';

export function PaginaClientes() {
  const { clientes } = useServicos();
  const { pode } = useSessao();
  const { nomeDe, equipe } = useEquipe();
  const { data, isPending } = useColecao('clientes', clientes);
  const navegar = useNavigate();
  const [busca, setBusca] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [novo, setNovo] = useState(false);
  const verTodos = pode('carteira:ver_todos');

  const filtrados = useMemo(
    () =>
      (data ?? [])
        .filter((c) => !responsavel || c.responsavelId === responsavel)
        .filter((c) => corresponde(busca, c.nome, c.documento, c.telefone, c.email, c.endereco?.cidade))
        .sort((a, b) => normalizar(a.nome).localeCompare(normalizar(b.nome))),
    [data, busca, responsavel],
  );

  return (
    <>
      <CabecalhoPagina
        titulo="Clientes"
        descricao={verTodos ? 'Carteira completa da corretora.' : 'Sua carteira de clientes.'}
        acoes={
          <Botao icone="mais" onClick={() => setNovo(true)}>
            Novo cliente
          </Botao>
        }
      />
      <Cartao>
        <BarraFiltros>
          <Campo rotulo="Buscar">
            <Entrada
              type="search"
              placeholder="Nome, CPF/CNPJ, telefone, cidade"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </Campo>
          {verTodos && (
            <Campo rotulo="Responsável">
              <Selecao value={responsavel} onChange={(e) => setResponsavel(e.target.value)}>
                <option value="">Todos</option>
                {equipe.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </Selecao>
            </Campo>
          )}
        </BarraFiltros>
        {isPending ? (
          <Carregando />
        ) : (
          <Tabela
            rotulo="Clientes"
            itens={filtrados}
            chave={(c) => c.id}
            aoClicar={(c) => navegar(`/clientes/${c.id}`)}
            vazio={
              <EstadoVazio titulo={busca ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}>
                {busca ? 'Tente outro termo de busca.' : 'Cadastre o primeiro cliente ou importe a planilha.'}
              </EstadoVazio>
            }
            colunas={[
              { chave: 'nome', titulo: 'Cliente', principal: true, render: (c) => c.nome },
              {
                chave: 'doc',
                titulo: 'CPF/CNPJ',
                render: (c) => (c.documento ? formatarDocumento(c.documento) : '—'),
              },
              {
                chave: 'tel',
                titulo: 'Telefone',
                render: (c) => (c.telefone ? formatarTelefone(c.telefone) : '—'),
              },
              {
                chave: 'cidade',
                titulo: 'Cidade',
                ocultarNoMobile: true,
                render: (c) => c.endereco?.cidade ?? '—',
              },
              ...(verTodos
                ? [{ chave: 'resp', titulo: 'Responsável', render: (c: Cliente) => nomeDe(c.responsavelId) }]
                : []),
            ]}
          />
        )}
      </Cartao>
      {novo && (
        <FormularioCliente aoFechar={() => setNovo(false)} aoSalvar={(c) => navegar(`/clientes/${c.id}`)} />
      )}
    </>
  );
}

export function PaginaCliente() {
  const { id = '' } = useParams();
  const { clientes } = useServicos();
  const { data, isPending } = useColecao('clientes', clientes);
  const cliente = data?.find((c) => c.id === id);
  if (isPending) return <Carregando />;
  if (!cliente)
    return (
      <EstadoVazio titulo="Cliente não encontrado">
        Ele pode ter sido removido ou pertencer a outra carteira.
      </EstadoVazio>
    );
  return <FichaCliente cliente={cliente} />;
}

function FichaCliente({ cliente }: { cliente: Cliente }) {
  const { clientes } = useServicos();
  const { pode } = useSessao();
  const { nomeDe } = useEquipe();
  const { abasCliente = [] } = useConfig();
  const { avisar } = useAvisos();
  const navegar = useNavigate();
  const remover = useRemover('clientes', clientes);
  const [editar, setEditar] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const whatsapp = cliente.telefone ? linkWhatsApp(cliente.telefone) : null;
  const e = cliente.endereco;
  const endereco = e
    ? [
        e.logradouro && `${e.logradouro}${e.numero ? `, ${e.numero}` : ''}`,
        e.complemento,
        e.bairro,
        e.cidade && `${e.cidade}${e.uf ? ` – ${e.uf}` : ''}`,
        e.cep,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';

  const dados: Array<[string, string]> = [
    [
      cliente.tipoPessoa === 'PF' ? 'CPF' : 'CNPJ',
      cliente.documento ? formatarDocumento(cliente.documento) : '—',
    ],
    ['Telefone', cliente.telefone ? formatarTelefone(cliente.telefone) : '—'],
    ['E-mail', cliente.email ?? '—'],
    ['Endereço', endereco || '—'],
    ['Responsável', nomeDe(cliente.responsavelId)],
  ];

  return (
    <>
      <CabecalhoPagina
        titulo={cliente.nome}
        descricao={cliente.tipoPessoa === 'PF' ? 'Pessoa física' : 'Pessoa jurídica'}
        acoes={
          <>
            {whatsapp && (
              <a
                className={classesBotao({ variante: 'secundario' })}
                href={whatsapp}
                target="_blank"
                rel="noreferrer"
              >
                <Icone nome="whatsapp" tamanho={18} /> WhatsApp
              </a>
            )}
            {pode('registro:editar', cliente) && (
              <Botao variante="secundario" icone="editar" onClick={() => setEditar(true)}>
                Editar
              </Botao>
            )}
            {pode('registro:remover', cliente) && (
              <Botao variante="perigo" icone="lixeira" onClick={() => setConfirmar(true)}>
                Remover
              </Botao>
            )}
          </>
        }
      />
      <div className="grade">
        <Cartao titulo="Dados">
          <dl className="lista-dados">
            {dados.map(([rotulo, valor]) => (
              <div key={rotulo}>
                <dt>{rotulo}</dt>
                <dd>{valor}</dd>
              </div>
            ))}
          </dl>
          {cliente.observacoes && (
            <p className="texto-suave" style={{ whiteSpace: 'pre-line' }}>
              {cliente.observacoes}
            </p>
          )}
        </Cartao>
        {abasCliente.map((aba) => (
          <Cartao key={aba.id} titulo={aba.rotulo}>
            {aba.render(cliente)}
          </Cartao>
        ))}
      </div>
      {editar && <FormularioCliente cliente={cliente} aoFechar={() => setEditar(false)} />}
      <ConfirmarAcao
        aberto={confirmar}
        perigo
        titulo="Remover cliente?"
        mensagem={`${cliente.nome} será removido. Esta ação não pode ser desfeita.`}
        textoConfirmar="Remover"
        carregando={remover.isPending}
        aoCancelar={() => setConfirmar(false)}
        aoConfirmar={() =>
          remover.mutate(cliente.id, {
            onSuccess: () => {
              avisar('Cliente removido.');
              navegar('/clientes');
            },
            onError: (erro) => avisar(mensagemErro(erro), 'erro'),
          })
        }
      />
    </>
  );
}
