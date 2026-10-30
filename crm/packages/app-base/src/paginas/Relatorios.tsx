import type {
  DadosComissao,
  PagamentoMensal,
  PagamentoProdutor,
  PendenteCliente,
  PendenteProdutor,
} from '@portella/core';
import {
  CORRETORA,
  normalizar,
  fechamentoDoMes,
  formatarData,
  formatarDinheiro,
  hojeISO,
  pagamentoMensal,
  pendentesPorCliente,
  pendentesPorProdutor,
  lerDinheiro,
  recebidoPrincipal,
  textoDinheiro,
} from '@portella/core';
import {
  Abas,
  BarraFiltros,
  Botao,
  CabecalhoPagina,
  Campo,
  Cartao,
  Carregando,
  ConfirmarAcao,
  Entrada,
  EstadoVazio,
  Indicador,
  Selecao,
  Selo,
  Tabela,
  useAvisos,
} from '@portella/ui';
import { useMemo, useState } from 'react';
import { EntradaDinheiro } from '../componentes/Entradas';
import { useRefinada } from '../config';
import { mensagemErro } from '../erros';
import type { DocumentoRelatorio } from '../exportar';
import { exportarExcel, exportarPdf, nomeArquivo } from '../exportar';
import { useDadosComissao, useEquipe, useSalvar } from '../hooks/dados';
import { useServicos } from '../servicos';
import { useSessao, useUsuario } from '../sessao/Sessao';

const NOME_MES = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
export const rotuloMes = (mes: string) => {
  const t = NOME_MES.format(new Date(`${mes}-15T00:00:00Z`));
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/** Meses com recebimento, estorno, vale ou pagamento, do mais recente ao mais antigo. */
function mesesComMovimento(d: DadosComissao): string[] {
  const meses = new Set<string>();
  for (const p of d.propostas) for (const r of p.recebimentos) meses.add(r.data.slice(0, 7));
  for (const e of d.estornos) meses.add(e.data.slice(0, 7));
  for (const v of d.vales) meses.add(v.data.slice(0, 7));
  for (const p of d.pagamentos) meses.add(p.mes);
  return [...meses].sort().reverse();
}

export function PaginaRelatorios() {
  const [aba, setAba] = useState<'pagamento' | 'pendentes'>('pagamento');
  return (
    <>
      <CabecalhoPagina
        titulo={
          <>
            Relatórios de <em>comissão</em>
          </>
        }
        descricao="Pagamento mensal dos produtores e comissões que ainda faltam receber."
      />
      <Abas
        rotulo="Relatórios"
        ativa={aba}
        aoTrocar={setAba}
        abas={[
          { id: 'pagamento', rotulo: 'Pagamento mensal' },
          { id: 'pendentes', rotulo: 'Comissões pendentes' },
        ]}
      />
      {aba === 'pagamento' ? <RelatorioPagamento /> : <RelatorioPendentes />}
    </>
  );
}

// ------------------------------------------------------------------ Pagamento mensal

function documentoPagamento(p: PagamentoMensal, nomeProdutor: string, refinada = false): DocumentoRelatorio {
  return {
    titulo: `Pagamento de comissões — ${rotuloMes(p.mes)}`,
    subtitulo: `Produtor: ${nomeProdutor}`,
    arquivo: nomeArquivo('comissoes', nomeProdutor, p.mes),
    resumo: [
      [
        refinada ? 'Comissões recebidas (repasse)' : 'Comissões a receber (repasse)',
        { dinheiro: p.totalRepasse },
      ],
      ['(−) Estornos', { dinheiro: p.totalEstornos }],
      ['(−) Vales', { dinheiro: p.totalVales }],
      ['Líquido a pagar', { dinheiro: p.liquido }],
      ...(p.pago
        ? ([
            ['Já pago', { dinheiro: p.pago }],
            ['Saldo', { dinheiro: p.saldo }],
          ] as Array<[string, { dinheiro: number }]>)
        : []),
    ],
    secoes: [
      {
        titulo: 'Comissões recebidas',
        colunas: [
          'Data',
          'Cliente',
          'Nº proposta',
          'Seguradora',
          'Produto',
          'Parcela',
          'Recebido',
          '%',
          'Repasse',
        ],
        linhas: p.itens.map((i) => [
          formatarData(i.recebimento.data),
          i.proposta.clienteNome,
          i.proposta.numero ?? '',
          i.proposta.companhia,
          i.proposta.produto,
          i.recebimento.parcela ?? '',
          { dinheiro: i.recebimento.valor },
          { percentual: i.percentual },
          { dinheiro: i.repasse },
        ]),
        total: ['Total', '', '', '', '', '', { dinheiro: p.totalRecebido }, '', { dinheiro: p.totalRepasse }],
      },
      {
        titulo: 'Estornos',
        colunas: ['Data', 'Segurado', 'Nº apólice', 'Seguradora', 'Produto', 'Desconto'],
        linhas: p.estornos.map((e) => [
          formatarData(e.data),
          e.segurado,
          e.numeroApolice ?? '',
          e.companhia,
          e.produto,
          { dinheiro: e.descontoProdutor },
        ]),
        total: ['Total', '', '', '', '', { dinheiro: p.totalEstornos }],
      },
      {
        titulo: 'Vales',
        colunas: ['Data', 'Motivo', 'Valor'],
        linhas: p.vales.map((v) => [formatarData(v.data), v.motivo ?? '', { dinheiro: v.valor }]),
        total: ['Total', '', { dinheiro: p.totalVales }],
      },
    ],
  };
}

function BotoesExportar({ documento }: { documento: () => DocumentoRelatorio }) {
  const { avisar } = useAvisos();
  const [gerando, setGerando] = useState<'' | 'pdf' | 'xlsx'>('');
  const gerar = async (tipo: 'pdf' | 'xlsx') => {
    setGerando(tipo);
    try {
      await (tipo === 'pdf' ? exportarPdf(documento()) : exportarExcel(documento()));
    } catch (e) {
      avisar(mensagemErro(e), 'erro');
    } finally {
      setGerando('');
    }
  };
  return (
    <div className="acoes-linha" style={{ justifyContent: 'flex-start' }}>
      <Botao
        variante="secundario"
        icone="importar"
        carregando={gerando === 'pdf'}
        onClick={() => gerar('pdf')}
      >
        PDF
      </Botao>
      <Botao
        variante="secundario"
        icone="importar"
        carregando={gerando === 'xlsx'}
        onClick={() => gerar('xlsx')}
      >
        Excel
      </Botao>
    </div>
  );
}

function RelatorioPagamento() {
  const usuario = useUsuario();
  const { pode } = useSessao();
  const { nomeDe } = useEquipe();
  const { dados, carregando } = useDadosComissao();
  const gestao = pode('financeiro:gerenciar');
  const refinada = useRefinada();
  const meses = useMemo(() => mesesComMovimento(dados), [dados]);
  const [mesEscolhido, setMes] = useState<string | null>(null);
  const mes = mesEscolhido ?? meses[0] ?? hojeISO().slice(0, 7);
  const [produtor, setProdutor] = useState<string>(gestao ? '' : usuario.id);
  const fechamento = useMemo(
    () =>
      fechamentoDoMes(mes, dados).sort((a, b) => nomeDe(a.produtorId).localeCompare(nomeDe(b.produtorId))),
    [mes, dados, nomeDe],
  );

  if (carregando) return <Carregando />;
  const detalhe = produtor ? pagamentoMensal(produtor, mes, dados) : null;

  return (
    <div className="grade">
      <Cartao>
        <BarraFiltros>
          <Campo rotulo="Mês">
            <Selecao value={mes} onChange={(e) => setMes(e.target.value)}>
              {(meses.includes(mes) ? meses : [mes, ...meses]).map((m) => (
                <option key={m} value={m}>
                  {rotuloMes(m)}
                </option>
              ))}
            </Selecao>
          </Campo>
          {gestao && (
            <Campo rotulo="Produtor">
              <Selecao value={produtor} onChange={(e) => setProdutor(e.target.value)}>
                <option value="">Todos (fechamento do mês)</option>
                {fechamento.map((l) => (
                  <option key={l.produtorId} value={l.produtorId}>
                    {nomeDe(l.produtorId)}
                  </option>
                ))}
              </Selecao>
            </Campo>
          )}
        </BarraFiltros>
        {!detalhe && (
          <Tabela
            rotulo="Fechamento do mês"
            itens={fechamento}
            chave={(l) => l.produtorId}
            aoClicar={(l) => setProdutor(l.produtorId)}
            totais={
              refinada && fechamento.length
                ? {
                    rotulo: 'Total do mês',
                    valores: {
                      repasse: formatarDinheiro(fechamento.reduce((t, l) => t + l.totalRepasse, 0)),
                      estornos: formatarDinheiro(-fechamento.reduce((t, l) => t + l.totalEstornos, 0)),
                      vales: formatarDinheiro(-fechamento.reduce((t, l) => t + l.totalVales, 0)),
                      liquido: formatarDinheiro(fechamento.reduce((t, l) => t + l.liquido, 0)),
                    },
                  }
                : undefined
            }
            vazio={
              <EstadoVazio titulo="Nada neste mês">
                Lance os recebimentos nas propostas para gerar o pagamento.
              </EstadoVazio>
            }
            colunas={[
              { chave: 'produtor', titulo: 'Produtor', principal: true, render: (l) => nomeDe(l.produtorId) },
              {
                chave: 'repasse',
                titulo: refinada ? 'Repasse' : 'Comissões',
                alinharDireita: true,
                render: (l) => formatarDinheiro(l.totalRepasse),
              },
              {
                chave: 'estornos',
                titulo: 'Estornos',
                alinharDireita: true,
                render: (l) => formatarDinheiro(-l.totalEstornos),
              },
              {
                chave: 'vales',
                titulo: 'Vales',
                alinharDireita: true,
                render: (l) => formatarDinheiro(-l.totalVales),
              },
              {
                chave: 'liquido',
                titulo: 'Líquido a pagar',
                alinharDireita: true,
                render: (l) => formatarDinheiro(l.liquido),
              },
              {
                chave: 'situacao',
                titulo: 'Situação',
                render: (l) =>
                  l.pago && l.saldo === 0 ? (
                    <Selo tom="sucesso">Pago</Selo>
                  ) : l.pago ? (
                    <Selo tom="alerta">Pago em parte</Selo>
                  ) : (
                    <Selo tom="neutro">A pagar</Selo>
                  ),
              },
            ]}
          />
        )}
      </Cartao>
      {detalhe && (
        <DetalhePagamento
          pagamento={detalhe}
          nomeProdutor={nomeDe(detalhe.produtorId)}
          aoVoltar={gestao ? () => setProdutor('') : undefined}
        />
      )}
    </div>
  );
}

function DetalhePagamento({
  pagamento: p,
  nomeProdutor,
  aoVoltar,
}: {
  pagamento: PagamentoMensal;
  nomeProdutor: string;
  aoVoltar?: () => void;
}) {
  const usuario = useUsuario();
  const { pode } = useSessao();
  const { pagamentos } = useServicos();
  const registrar = useSalvar<PagamentoProdutor>('pagamentos', pagamentos);
  const { avisar } = useAvisos();
  const gestao = pode('financeiro:gerenciar');
  const refinada = useRefinada();
  // Interface refinada: "Registrar pagamento" abre uma confirmação com valor, data e observação.
  const [confirmando, setConfirmando] = useState(false);
  const [valorPago, setValorPago] = useState('');
  const [dataPago, setDataPago] = useState(hojeISO());
  const [obs, setObs] = useState('');

  const pagar = (valor = p.saldo, data = hojeISO(), observacao?: string) =>
    registrar.mutate(
      {
        responsavelId: p.produtorId,
        mes: p.mes,
        data,
        valor,
        observacoes: [observacao?.trim(), `Registrado por ${usuario.nome}.`].filter(Boolean).join(' · '),
      },
      {
        onSuccess: () => {
          avisar(`Pagamento de ${nomeProdutor} registrado.`);
          setConfirmando(false);
        },
        onError: (e) => avisar(mensagemErro(e), 'erro'),
      },
    );
  const abrirConfirmacao = () => {
    setValorPago(textoDinheiro(Math.max(0, p.saldo)));
    setDataPago(hojeISO());
    setObs('');
    setConfirmando(true);
  };
  const valorDigitado = lerDinheiro(valorPago);

  return (
    <>
      <Cartao
        titulo={`${nomeProdutor} · ${rotuloMes(p.mes)}`}
        acoes={
          <div className="acoes-linha">
            {aoVoltar && (
              <Botao variante="fantasma" icone="voltar" onClick={aoVoltar}>
                {refinada ? 'Voltar ao fechamento' : 'Todos'}
              </Botao>
            )}
            <BotoesExportar documento={() => documentoPagamento(p, nomeProdutor, refinada)} />
            {gestao && p.saldo !== 0 && (
              <Botao
                carregando={!refinada && registrar.isPending}
                onClick={refinada ? abrirConfirmacao : () => pagar()}
              >
                {refinada ? 'Registrar pagamento…' : 'Registrar pagamento'}
              </Botao>
            )}
          </div>
        }
      >
        <div className="grade-4">
          <Indicador
            tom="primaria"
            icone="moeda"
            rotulo={refinada ? 'Repasse das comissões recebidas' : 'Comissões'}
            valor={formatarDinheiro(p.totalRepasse)}
            detalhe={`${p.itens.length} recebimento(s)`}
          />
          <Indicador
            tom="perigo"
            icone="estorno"
            rotulo="Estornos"
            valor={formatarDinheiro(-p.totalEstornos)}
          />
          <Indicador tom="alerta" icone="carteira" rotulo="Vales" valor={formatarDinheiro(-p.totalVales)} />
          <Indicador
            tom="sucesso"
            icone="carteira"
            rotulo="Líquido a pagar"
            valor={formatarDinheiro(p.liquido)}
            detalhe={
              p.pago ? `pago ${formatarDinheiro(p.pago)} · saldo ${formatarDinheiro(p.saldo)}` : undefined
            }
          />
        </div>
      </Cartao>
      <Cartao titulo="Comissões recebidas no mês">
        <Tabela
          rotulo="Comissões recebidas"
          itens={p.itens}
          chave={(i) => i.recebimento.id + i.proposta.id}
          porPagina={50}
          vazio={<EstadoVazio titulo="Nenhum recebimento neste mês" />}
          colunas={[
            { chave: 'cliente', titulo: 'Cliente', principal: true, render: (i) => i.proposta.clienteNome },
            { chave: 'data', titulo: 'Data', render: (i) => formatarData(i.recebimento.data) },
            {
              chave: 'cia',
              titulo: 'Seguradora · produto',
              render: (i) => `${i.proposta.companhia} · ${i.proposta.produto}`,
            },
            {
              chave: 'parcela',
              titulo: 'Parcela',
              ocultarNoMobile: true,
              render: (i) => i.recebimento.parcela ?? '—',
            },
            {
              chave: 'valor',
              titulo: 'Recebido',
              alinharDireita: true,
              render: (i) => formatarDinheiro(i.recebimento.valor),
            },
            { chave: 'pct', titulo: '%', alinharDireita: true, render: (i) => `${i.percentual}%` },
            {
              chave: 'repasse',
              titulo: 'Repasse',
              alinharDireita: true,
              render: (i) => formatarDinheiro(i.repasse),
            },
          ]}
        />
      </Cartao>
      {(p.estornos.length > 0 || p.vales.length > 0) && (
        <div className="grade-2">
          <Cartao titulo="Estornos">
            <Tabela
              rotulo="Estornos do mês"
              itens={p.estornos}
              chave={(e) => e.id}
              vazio={<p className="texto-suave">Nenhum.</p>}
              colunas={[
                { chave: 'segurado', titulo: 'Segurado', principal: true, render: (e) => e.segurado },
                { chave: 'apolice', titulo: 'Apólice', render: (e) => e.numeroApolice ?? '—' },
                {
                  chave: 'cia',
                  titulo: 'Seguradora · produto',
                  render: (e) => `${e.companhia} · ${e.produto}`,
                },
                {
                  chave: 'valor',
                  titulo: 'Desconto',
                  alinharDireita: true,
                  render: (e) => formatarDinheiro(refinada ? -e.descontoProdutor : e.descontoProdutor),
                },
              ]}
            />
          </Cartao>
          <Cartao titulo="Vales">
            <Tabela
              rotulo="Vales do mês"
              itens={p.vales}
              chave={(v) => v.id}
              vazio={<p className="texto-suave">Nenhum.</p>}
              colunas={[
                { chave: 'data', titulo: 'Data', principal: true, render: (v) => formatarData(v.data) },
                { chave: 'motivo', titulo: 'Motivo', render: (v) => v.motivo ?? '—' },
                {
                  chave: 'valor',
                  titulo: 'Valor',
                  alinharDireita: true,
                  render: (v) => formatarDinheiro(refinada ? -v.valor : v.valor),
                },
              ]}
            />
          </Cartao>
        </div>
      )}
      {refinada && (
        <ConfirmarAcao
          aberto={confirmando}
          titulo={`Registrar o pagamento de ${nomeProdutor}?`}
          mensagem={
            p.saldo < 0
              ? `Os descontos de ${rotuloMes(p.mes)} passam das comissões: o líquido é ${formatarDinheiro(p.saldo)}. Confira antes de registrar.`
              : `Líquido a pagar em ${rotuloMes(p.mes)}: ${formatarDinheiro(p.saldo)}.`
          }
          textoConfirmar="Registrar pagamento"
          carregando={registrar.isPending}
          aoCancelar={() => setConfirmando(false)}
          aoConfirmar={() =>
            valorDigitado != null && valorDigitado > 0 && pagar(valorDigitado, dataPago, obs)
          }
        >
          <div className="grade-2">
            <Campo
              rotulo="Valor pago"
              erro={valorDigitado == null || valorDigitado <= 0 ? 'Informe o valor pago.' : undefined}
            >
              <EntradaDinheiro value={valorPago} onChange={(e) => setValorPago(e.target.value)} />
            </Campo>
            <Campo rotulo="Data do pagamento">
              <Entrada type="date" value={dataPago} onChange={(e) => setDataPago(e.target.value)} />
            </Campo>
            <Campo rotulo="Observação" className="span-todo">
              <Entrada
                placeholder="PIX, transferência…"
                value={obs}
                onChange={(e) => setObs(e.target.value)}
              />
            </Campo>
          </div>
        </ConfirmarAcao>
      )}
    </>
  );
}

// ------------------------------------------------------------------ Pendentes

function documentoPendentes(grupos: PendenteProdutor[], nomeDe: (id: string) => string): DocumentoRelatorio {
  return {
    titulo: 'Comissões pendentes de recebimento',
    subtitulo: `Posição em ${formatarData(hojeISO())}`,
    arquivo: nomeArquivo('comissoes-pendentes', hojeISO()),
    resumo: [
      [
        'Saldo a receber das seguradoras',
        {
          dinheiro:
            grupos.reduce((t, g) => t + (g.produtorId === CORRETORA ? g.saldo : 0), 0) + somaUnica(grupos),
        },
      ],
      ['Repasse projetado aos produtores', { dinheiro: grupos.reduce((t, g) => t + g.repasseProjetado, 0) }],
    ],
    secoes: grupos.map((g) => ({
      titulo: g.produtorId === CORRETORA ? 'Corretora (sem produtor)' : nomeDe(g.produtorId),
      colunas: [
        'Data',
        'Cliente',
        'Nº',
        'Seguradora',
        'Produto',
        'Comissão',
        'Recebido',
        'Saldo',
        '%',
        'Repasse previsto',
      ],
      linhas: g.itens.map((i) => [
        formatarData(i.proposta.data),
        i.proposta.clienteNome,
        i.proposta.numero ?? '',
        i.proposta.companhia,
        i.proposta.produto,
        { dinheiro: i.proposta.comissaoReceber },
        { dinheiro: recebidoPrincipal(i.proposta) },
        { dinheiro: i.saldo },
        { percentual: i.percentual },
        { dinheiro: i.repasseProjetado },
      ]),
      total: ['Total', '', '', '', '', '', '', { dinheiro: g.saldo }, '', { dinheiro: g.repasseProjetado }],
    })),
  };
}

/** Saldo de propostas com produtores, contado uma vez só (a proposta aparece em cada produtor). */
function somaUnica(grupos: PendenteProdutor[]) {
  const vistas = new Map<string, number>();
  for (const g of grupos)
    if (g.produtorId !== CORRETORA) for (const i of g.itens) vistas.set(i.proposta.id, i.saldo);
  return [...vistas.values()].reduce((t, v) => t + v, 0);
}

function RelatorioPendentes() {
  const [visao, setVisao] = useState<'produtor' | 'cliente'>('produtor');
  return (
    <div className="grade">
      <div style={{ maxWidth: 320 }}>
        <Campo rotulo="Ver por">
          <Selecao value={visao} onChange={(e) => setVisao(e.target.value as 'produtor' | 'cliente')}>
            <option value="produtor">Produtor</option>
            <option value="cliente">Cliente</option>
          </Selecao>
        </Campo>
      </div>
      {visao === 'produtor' ? <PendentesPorProdutor /> : <PendentesPorCliente />}
    </div>
  );
}

function PendentesPorProdutor() {
  const { dados, carregando } = useDadosComissao();
  const { nomeDe } = useEquipe();
  const { pode } = useSessao();
  const usuario = useUsuario();
  const gestao = pode('financeiro:gerenciar');
  const grupos = useMemo(() => {
    const todos = pendentesPorProdutor(dados.propostas);
    return gestao ? todos : todos.filter((g) => g.produtorId === usuario.id);
  }, [dados.propostas, gestao, usuario.id]);
  const [aberto, setAberto] = useState<string | null>(null);

  if (carregando) return <Carregando />;
  return (
    <div className="grade">
      <Cartao
        acoes={<BotoesExportar documento={() => documentoPendentes(grupos, nomeDe)} />}
        titulo="Saldo a receber por produtor"
      >
        <Tabela
          rotulo="Pendentes por produtor"
          itens={grupos}
          chave={(g) => g.produtorId || 'corretora'}
          aoClicar={(g) => setAberto(aberto === g.produtorId ? null : g.produtorId)}
          vazio={
            <EstadoVazio titulo="Nada pendente">Todas as comissões aprovadas já foram recebidas.</EstadoVazio>
          }
          colunas={[
            {
              chave: 'produtor',
              titulo: 'Produtor',
              principal: true,
              render: (g) => (g.produtorId === CORRETORA ? 'Corretora (sem produtor)' : nomeDe(g.produtorId)),
            },
            { chave: 'qtd', titulo: 'Propostas', alinharDireita: true, render: (g) => g.itens.length },
            {
              chave: 'saldo',
              titulo: 'Saldo a receber',
              alinharDireita: true,
              render: (g) => formatarDinheiro(g.saldo),
            },
            {
              chave: 'repasse',
              titulo: 'Repasse previsto',
              alinharDireita: true,
              render: (g) => formatarDinheiro(g.repasseProjetado),
            },
          ]}
        />
      </Cartao>
      {grupos
        .filter((g) => aberto === g.produtorId || (!gestao && g.produtorId === usuario.id))
        .map((g) => (
          <Cartao
            key={g.produtorId || 'corretora'}
            titulo={g.produtorId === CORRETORA ? 'Corretora' : nomeDe(g.produtorId)}
          >
            <Tabela
              rotulo={`Pendentes de ${nomeDe(g.produtorId)}`}
              itens={g.itens}
              chave={(i) => i.proposta.id}
              porPagina={50}
              colunas={[
                {
                  chave: 'cliente',
                  titulo: 'Cliente',
                  principal: true,
                  render: (i) => i.proposta.clienteNome,
                },
                { chave: 'data', titulo: 'Data', render: (i) => formatarData(i.proposta.data) },
                {
                  chave: 'cia',
                  titulo: 'Seguradora · produto',
                  render: (i) => `${i.proposta.companhia} · ${i.proposta.produto}`,
                },
                {
                  chave: 'saldo',
                  titulo: 'Saldo',
                  alinharDireita: true,
                  render: (i) => formatarDinheiro(i.saldo),
                },
                {
                  chave: 'repasse',
                  titulo: 'Repasse previsto',
                  alinharDireita: true,
                  render: (i) => formatarDinheiro(i.repasseProjetado),
                },
              ]}
            />
          </Cartao>
        ))}
    </div>
  );
}

function documentoPendentesCliente(
  grupos: PendenteCliente[],
  nomeDe: (id: string) => string,
  produtor?: string,
): DocumentoRelatorio {
  return {
    titulo: 'Comissões pendentes por cliente',
    subtitulo: `${produtor ? `${produtor} · ` : ''}Posição em ${formatarData(hojeISO())}`,
    arquivo: nomeArquivo('comissoes-pendentes-por-cliente', hojeISO()),
    resumo: [
      ['Clientes com saldo', String(grupos.length)],
      ['Saldo a receber das seguradoras', { dinheiro: grupos.reduce((t, g) => t + g.saldo, 0) }],
      ['Repasse projetado aos produtores', { dinheiro: grupos.reduce((t, g) => t + g.repasseProjetado, 0) }],
    ],
    secoes: [
      {
        titulo: 'Saldo por cliente',
        colunas: [
          'Cliente',
          'Data',
          'Nº',
          'Seguradora',
          'Produto',
          'Comissão',
          'Recebido',
          'Saldo',
          'Produtores',
          'Repasse previsto',
        ],
        linhas: grupos.flatMap((g) =>
          g.itens.map((i) => [
            g.clienteNome,
            formatarData(i.proposta.data),
            i.proposta.numero ?? '',
            i.proposta.companhia,
            i.proposta.produto,
            { dinheiro: i.comissao },
            { dinheiro: i.recebido },
            { dinheiro: i.saldo },
            i.repasses.length
              ? i.repasses
                  .map((r) => `${nomeDe(r.produtorId)} ${String(r.percentual).replace('.', ',')}%`)
                  .join(', ')
              : 'Corretora',
            { dinheiro: i.repasses.reduce((t, r) => t + r.repasseProjetado, 0) },
          ]),
        ),
        total: [
          'Total',
          '',
          '',
          '',
          '',
          { dinheiro: grupos.reduce((t, g) => t + g.comissao, 0) },
          { dinheiro: grupos.reduce((t, g) => t + g.recebido, 0) },
          { dinheiro: grupos.reduce((t, g) => t + g.saldo, 0) },
          '',
          { dinheiro: grupos.reduce((t, g) => t + g.repasseProjetado, 0) },
        ],
      },
    ],
  };
}

/** Saldo a receber por cliente: para cruzar com o controle da administradora e achar atrasos. */
function PendentesPorCliente() {
  const { dados, carregando } = useDadosComissao();
  const { nomeDe } = useEquipe();
  const { pode } = useSessao();
  const usuario = useUsuario();
  const gestao = pode('financeiro:gerenciar');
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState<string | null>(null);
  const todos = useMemo(
    () => pendentesPorCliente(dados.propostas, gestao ? {} : { produtorId: usuario.id }),
    [dados.propostas, gestao, usuario.id],
  );
  const grupos = useMemo(() => {
    const alvo = normalizar(busca.trim());
    return alvo ? todos.filter((g) => normalizar(g.clienteNome).includes(alvo)) : todos;
  }, [todos, busca]);
  const selecionado = grupos.find((g) => g.chave === aberto);

  if (carregando) return <Carregando />;
  return (
    <>
      <Cartao
        titulo="Saldo a receber por cliente"
        acoes={
          <BotoesExportar
            documento={() => documentoPendentesCliente(grupos, nomeDe, gestao ? undefined : usuario.nome)}
          />
        }
      >
        <div style={{ marginBottom: 12, maxWidth: 420 }}>
          <Campo rotulo="Buscar cliente">
            <Entrada
              type="search"
              placeholder="Nome do cliente"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </Campo>
        </div>
        <Tabela
          rotulo="Pendentes por cliente"
          itens={grupos}
          chave={(g) => g.chave}
          porPagina={50}
          aoClicar={(g) => setAberto(aberto === g.chave ? null : g.chave)}
          vazio={
            <EstadoVazio titulo={busca ? 'Nenhum cliente encontrado' : 'Nada pendente'}>
              {busca ? 'Tente outro nome.' : 'Todas as comissões aprovadas já foram recebidas.'}
            </EstadoVazio>
          }
          colunas={[
            { chave: 'cliente', titulo: 'Cliente', principal: true, render: (g) => g.clienteNome },
            { chave: 'qtd', titulo: 'Propostas', alinharDireita: true, render: (g) => g.itens.length },
            {
              chave: 'comissao',
              titulo: 'Comissão',
              alinharDireita: true,
              ocultarNoMobile: true,
              render: (g) => formatarDinheiro(g.comissao),
            },
            {
              chave: 'recebido',
              titulo: 'Recebido',
              alinharDireita: true,
              ocultarNoMobile: true,
              render: (g) => formatarDinheiro(g.recebido),
            },
            {
              chave: 'saldo',
              titulo: 'Saldo a receber',
              alinharDireita: true,
              render: (g) => formatarDinheiro(g.saldo),
            },
            {
              chave: 'repasse',
              titulo: gestao ? 'Repasse previsto' : 'Meu repasse previsto',
              alinharDireita: true,
              render: (g) => formatarDinheiro(g.repasseProjetado),
            },
          ]}
        />
      </Cartao>
      {selecionado && (
        <Cartao titulo={selecionado.clienteNome}>
          <Tabela
            rotulo={`Pendentes de ${selecionado.clienteNome}`}
            itens={selecionado.itens}
            chave={(i) => i.proposta.id}
            colunas={[
              {
                chave: 'data',
                titulo: 'Data',
                principal: true,
                render: (i) => formatarData(i.proposta.data),
              },
              { chave: 'numero', titulo: 'Nº', render: (i) => i.proposta.numero ?? '—' },
              {
                chave: 'cia',
                titulo: 'Seguradora · produto',
                render: (i) => `${i.proposta.companhia} · ${i.proposta.produto}`,
              },
              {
                chave: 'produtores',
                titulo: 'Produtores',
                render: (i) =>
                  i.repasses.length
                    ? i.repasses
                        .map((r) => `${nomeDe(r.produtorId)} ${String(r.percentual).replace('.', ',')}%`)
                        .join(', ')
                    : 'Corretora',
              },
              {
                chave: 'saldo',
                titulo: 'Saldo',
                alinharDireita: true,
                render: (i) => formatarDinheiro(i.saldo),
              },
              {
                chave: 'repasse',
                titulo: 'Repasse previsto',
                alinharDireita: true,
                render: (i) => formatarDinheiro(i.repasses.reduce((t, r) => t + r.repasseProjetado, 0)),
              },
            ]}
          />
        </Cartao>
      )}
    </>
  );
}
