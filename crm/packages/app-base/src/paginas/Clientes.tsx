import type { Cliente, Proposta } from '@portella/core';
import {
  corresponde,
  formatarData,
  formatarDocumento,
  formatarDinheiro,
  formatarTelefone,
  linkWhatsApp,
  normalizar,
  somenteDigitos,
} from '@portella/core';
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
  Selo,
  Tabela,
  useAvisos,
} from '@portella/ui';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FormularioCliente } from '../componentes/FormularioCliente';
import { FormularioProposta } from '../componentes/FormularioProposta';
import { useConfig, useRefinada } from '../config';
import { mensagemErro } from '../erros';
import { useColecao, useEquipe, useRemover } from '../hooks/dados';
import { useServicos } from '../servicos';
import { useSessao } from '../sessao/Sessao';

export function PaginaClientes() {
  const { clientes } = useServicos();
  const { pode } = useSessao();
  const { nomeDe, equipe } = useEquipe();
  const { data, isPending, isError, refetch } = useColecao('clientes', clientes);
  const navegar = useNavigate();
  const [busca, setBusca] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [novo, setNovo] = useState(false);
  const verTodos = pode('carteira:ver_todos');
  const refinada = useRefinada();
  // Documento e telefone ficam guardados só com dígitos: "(11) 98888-7777" também precisa achar.
  const digitos = refinada ? somenteDigitos(busca) : '';

  const filtrados = useMemo(
    () =>
      (data ?? [])
        .filter((c) => !responsavel || c.responsavelId === responsavel)
        .filter(
          (c) =>
            corresponde(busca, c.nome, c.documento, c.telefone, c.email, c.endereco?.cidade) ||
            (digitos.length >= 4 &&
              /^[\d\s().\-/+]+$/.test(busca.trim()) &&
              [c.documento, c.telefone].some((d) => d?.includes(digitos))),
        )
        .sort((a, b) => normalizar(a.nome).localeCompare(normalizar(b.nome))),
    [data, busca, responsavel, digitos],
  );

  return (
    <>
      <CabecalhoPagina
        titulo="Clientes"
        descricao={
          refinada && data
            ? `${filtrados.length.toLocaleString('pt-BR')} de ${data.length.toLocaleString('pt-BR')} clientes${verTodos ? ' da corretora' : ' da sua carteira'}.`
            : verTodos
              ? 'Carteira completa da corretora.'
              : 'Sua carteira de clientes.'
        }
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
            <Campo rotulo={refinada ? 'Produtor' : 'Responsável'}>
              <Selecao value={responsavel} onChange={(e) => setResponsavel(e.target.value)}>
                <option value="">Todos</option>
                {equipe
                  .filter((u) => !refinada || u.ativo || u.id === responsavel)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome}
                    </option>
                  ))}
              </Selecao>
            </Campo>
          )}
        </BarraFiltros>
        {refinada && isError ? (
          <div role="alert">
            <EstadoVazio
              titulo="Não foi possível carregar os clientes"
              acao={
                <Botao variante="secundario" onClick={() => refetch()}>
                  Tentar de novo
                </Botao>
              }
            />
          </div>
        ) : isPending ? (
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
                ? [
                    {
                      chave: 'resp',
                      titulo: refinada ? 'Produtor' : 'Responsável',
                      render: (c: Cliente) => nomeDe(c.responsavelId),
                    },
                  ]
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
  const refinada = useRefinada();
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
    ...(cliente.tipoPessoa === 'PF'
      ? [
          ['Nascimento', cliente.dataNascimento ? formatarData(cliente.dataNascimento) : '—'] as [
            string,
            string,
          ],
        ]
      : []),
    ['Endereço', endereco || '—'],
    ...(cliente.origem
      ? [
          ['Origem', cliente.indicadoPor ? `${cliente.origem} · ${cliente.indicadoPor}` : cliente.origem] as [
            string,
            string,
          ],
        ]
      : []),
    [refinada ? 'Produtor' : 'Responsável', nomeDe(cliente.responsavelId)],
  ];

  return (
    <>
      {refinada && (
        <p style={{ margin: '0 0 12px' }}>
          <Link to="/clientes">← Voltar para clientes</Link>
        </p>
      )}
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
                aria-label={refinada ? 'WhatsApp (abre em nova aba)' : undefined}
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
                {refinada ? 'Excluir' : 'Remover'}
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
        {refinada && (
          <Cartao titulo="Propostas">
            <PropostasDoCliente cliente={cliente} />
          </Cartao>
        )}
      </div>
      {editar && <FormularioCliente cliente={cliente} aoFechar={() => setEditar(false)} />}
      <ConfirmarAcao
        aberto={confirmar}
        perigo
        titulo={refinada ? 'Excluir cliente?' : 'Remover cliente?'}
        mensagem={
          refinada
            ? `${cliente.nome} será excluído. As apólices e propostas dele continuam no sistema, sem o vínculo. Não dá para desfazer.`
            : `${cliente.nome} será removido. Esta ação não pode ser desfeita.`
        }
        textoConfirmar={refinada ? 'Excluir cliente' : 'Remover'}
        carregando={remover.isPending}
        aoCancelar={() => setConfirmar(false)}
        aoConfirmar={() =>
          remover.mutate(cliente.id, {
            onSuccess: () => {
              avisar(refinada ? 'Cliente excluído.' : 'Cliente removido.');
              navegar('/clientes');
            },
            onError: (erro) => avisar(mensagemErro(erro), 'erro'),
          })
        }
      />
    </>
  );
}

/** Propostas (vendas) do cliente: pelo vínculo ou, nas importadas, pelo nome. */
function PropostasDoCliente({ cliente }: { cliente: Cliente }) {
  const { propostas } = useServicos();
  const { data, isPending } = useColecao<Proposta>('propostas', propostas);
  const [abrindo, setAbrindo] = useState<Proposta | null>(null);
  const nome = normalizar(cliente.nome);
  const doCliente = (data ?? [])
    .filter((p) => p.clienteId === cliente.id || (!p.clienteId && normalizar(p.clienteNome) === nome))
    .sort((a, b) => b.data.localeCompare(a.data));
  if (isPending) return <Carregando />;
  return (
    <>
      <Tabela
        rotulo={`Propostas de ${cliente.nome}`}
        itens={doCliente}
        chave={(p) => p.id}
        aoClicar={setAbrindo}
        porPagina={10}
        vazio={<EstadoVazio titulo="Nenhuma proposta">As vendas deste cliente aparecem aqui.</EstadoVazio>}
        colunas={[
          { chave: 'data', titulo: 'Data', principal: true, render: (p) => formatarData(p.data) },
          { chave: 'cia', titulo: 'Seguradora · produto', render: (p) => `${p.companhia} · ${p.produto}` },
          { chave: 'numero', titulo: 'Nº', render: (p) => p.numero ?? '—' },
          {
            chave: 'premio',
            titulo: 'Prêmio líquido',
            alinharDireita: true,
            render: (p) => formatarDinheiro(p.premioLiquido),
          },
          {
            chave: 'status',
            titulo: 'Situação',
            render: (p) => (
              <Selo tom={p.status === 'pendente' ? 'alerta' : 'sucesso'}>
                {p.status === 'pendente' ? 'Aguardando aprovação' : 'Aprovada'}
              </Selo>
            ),
          },
        ]}
      />
      {abrindo && <FormularioProposta proposta={abrindo} aoFechar={() => setAbrindo(null)} />}
    </>
  );
}
