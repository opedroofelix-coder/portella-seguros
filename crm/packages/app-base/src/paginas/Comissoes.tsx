import { zodResolver } from '@hookform/resolvers/zod';
import type { LancamentoComissao, SituacaoComissao } from '@portella/core';
import {
  centavosParaTexto,
  corresponde,
  formatarData,
  formatarDinheiro,
  formatarParcela,
  hojeISO,
  mesCompetencia,
  mesMaisRecente,
  paraCentavos,
  porcentagem,
  resumirComissoes,
  ROTULO_SITUACAO_COMISSAO,
  saldoRepasse,
  SEM_DATA,
  situacaoComissao,
} from '@portella/core';
import type { Coluna, TomSelo } from '@portella/ui';
import {
  AreaTexto,
  BarraFiltros,
  Botao,
  CabecalhoPagina,
  Campo,
  Cartao,
  Carregando,
  Entrada,
  EstadoVazio,
  Indicador,
  Modal,
  Selecao,
  Selo,
  Tabela,
  useAvisos,
} from '@portella/ui';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { SeletorResponsavel } from '../componentes/SeletorResponsavel';
import { useConfig } from '../config';
import { aplicarErros, limparVazios, mensagemErro } from '../erros';
import { useColecao, useEquipe, useRemover, useSalvar } from '../hooks/dados';
import { useServicos } from '../servicos';
import { useSessao, useUsuario } from '../sessao/Sessao';

const TOM: Record<SituacaoComissao, TomSelo> = {
  a_receber: 'alerta',
  recebida: 'sucesso',
  estorno: 'perigo',
};
const NOME_MES = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const rotuloMes = (mes: string) => {
  const t = NOME_MES.format(new Date(`${mes}-15T00:00:00Z`));
  return t.charAt(0).toUpperCase() + t.slice(1);
};

export function PaginaComissoes() {
  const { comissoes } = useServicos();
  const { data, isPending } = useColecao<LancamentoComissao>('comissoes', comissoes);
  const { pode } = useSessao();
  const { equipe, nomeDe } = useEquipe();
  const { avisar } = useAvisos();
  const salvar = useSalvar<LancamentoComissao>('comissoes', comissoes);
  const gestao = pode('financeiro:gerenciar');
  const verTodos = pode('carteira:ver_todos');

  const meses = useMemo(
    // Do mais recente para o mais antigo; "Sem data" por último.
    () =>
      [...new Set((data ?? []).map(mesCompetencia))].sort((a, b) =>
        a === SEM_DATA ? 1 : b === SEM_DATA ? -1 : b.localeCompare(a),
      ),
    [data],
  );
  const [mes, setMes] = useState<string | null>(null);
  const mesAtivo = mes ?? mesMaisRecente(data ?? []) ?? '';
  const [responsavel, setResponsavel] = useState('');
  const [situacao, setSituacao] = useState<SituacaoComissao | ''>('');
  const [busca, setBusca] = useState('');
  const [editando, setEditando] = useState<LancamentoComissao | 'nova' | null>(null);

  const doPeriodo = useMemo(
    () =>
      (data ?? [])
        .filter((c) => !mesAtivo || mesCompetencia(c) === mesAtivo)
        .filter((c) => !responsavel || c.responsavelId === responsavel),
    [data, mesAtivo, responsavel],
  );
  const lista = useMemo(
    () =>
      doPeriodo
        .filter((c) => !situacao || situacaoComissao(c) === situacao)
        .filter((c) => corresponde(busca, c.clienteNome, c.numeroProposta, c.companhia, c.produto))
        .sort((a, b) =>
          (b.dataRecebimento ?? b.dataProposta ?? '').localeCompare(
            a.dataRecebimento ?? a.dataProposta ?? '',
          ),
        ),
    [doPeriodo, situacao, busca],
  );
  const resumo = useMemo(() => resumirComissoes(doPeriodo), [doPeriodo]);

  const darBaixa = (c: LancamentoComissao) =>
    salvar.mutate(
      { ...c, comissaoRecebida: c.comissaoReceber, dataRecebimento: c.dataRecebimento ?? hojeISO() },
      { onSuccess: () => avisar('Recebimento registrado.'), onError: (e) => avisar(mensagemErro(e), 'erro') },
    );

  const quitarRepasses = async (responsavelId: string) => {
    const pendentes = doPeriodo.filter(
      (c) => c.responsavelId === responsavelId && !c.vendaDaCorretora && saldoRepasse(c) !== 0,
    );
    try {
      for (const c of pendentes) await salvar.mutateAsync({ ...c, repassePago: c.repasse });
      avisar(`Repasse de ${nomeDe(responsavelId)} quitado (${pendentes.length} parcela(s)).`);
    } catch (e) {
      avisar(mensagemErro(e), 'erro');
    }
  };

  const colunas: Coluna<LancamentoComissao>[] = [
    { chave: 'cliente', titulo: 'Cliente', principal: true, render: (c) => c.clienteNome },
    { chave: 'produto', titulo: 'Produto', render: (c) => `${c.produto} · ${c.companhia}` },
    {
      chave: 'parcela',
      titulo: 'Parcela',
      ocultarNoMobile: true,
      render: (c) => formatarParcela(c.parcela) ?? '—',
    },
    { chave: 'data', titulo: 'Recebimento', render: (c) => formatarData(c.dataRecebimento) },
    ...(gestao
      ? [
          {
            chave: 'comissao',
            titulo: 'Comissão',
            alinharDireita: true,
            render: (c: LancamentoComissao) => formatarDinheiro(c.comissaoRecebida || c.comissaoReceber),
          },
        ]
      : []),
    {
      chave: 'repasse',
      titulo: gestao ? 'Repasse' : 'Minha comissão',
      alinharDireita: true,
      render: (c) => (c.vendaDaCorretora ? 'Corretora' : formatarDinheiro(c.repasse)),
    },
    {
      chave: 'pago',
      titulo: 'Repasse pago',
      alinharDireita: true,
      ocultarNoMobile: !gestao,
      render: (c) => (c.vendaDaCorretora ? '—' : formatarDinheiro(c.repassePago ?? 0)),
    },
    {
      chave: 'sit',
      titulo: 'Situação',
      render: (c) => (
        <Selo tom={TOM[situacaoComissao(c)]}>{ROTULO_SITUACAO_COMISSAO[situacaoComissao(c)]}</Selo>
      ),
    },
    ...(verTodos
      ? [
          {
            chave: 'resp',
            titulo: 'Corretor',
            ocultarNoMobile: true,
            render: (c: LancamentoComissao) => (c.vendaDaCorretora ? 'Corretora' : nomeDe(c.responsavelId)),
          },
        ]
      : []),
    ...(gestao
      ? [
          {
            chave: 'acoes',
            titulo: 'Ações',
            render: (c: LancamentoComissao) =>
              situacaoComissao(c) === 'a_receber' ? (
                <div
                  className="acoes-linha"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <Botao pequeno variante="secundario" onClick={() => darBaixa(c)}>
                    Dar baixa
                  </Botao>
                </div>
              ) : null,
          },
        ]
      : []),
  ];

  return (
    <>
      <CabecalhoPagina
        titulo="Comissões"
        descricao={
          gestao ? 'Comissões das seguradoras e repasses aos corretores.' : 'Suas comissões e repasses.'
        }
        acoes={
          gestao && (
            <Botao icone="mais" onClick={() => setEditando('nova')}>
              Nova comissão
            </Botao>
          )
        }
      />
      <Cartao style={{ marginBottom: 20 }}>
        <BarraFiltros>
          <Campo rotulo="Mês">
            <Selecao value={mesAtivo} onChange={(e) => setMes(e.target.value)}>
              <option value="">Todos os meses</option>
              {meses.map((m) => (
                <option key={m} value={m}>
                  {m === SEM_DATA ? 'Sem data' : rotuloMes(m)}
                </option>
              ))}
            </Selecao>
          </Campo>
          {verTodos && (
            <Campo rotulo="Corretor">
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
          <Campo rotulo="Situação">
            <Selecao value={situacao} onChange={(e) => setSituacao(e.target.value as SituacaoComissao | '')}>
              <option value="">Todas</option>
              {(Object.keys(ROTULO_SITUACAO_COMISSAO) as SituacaoComissao[]).map((s) => (
                <option key={s} value={s}>
                  {ROTULO_SITUACAO_COMISSAO[s]}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Buscar">
            <Entrada
              type="search"
              placeholder="Cliente, proposta, companhia"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </Campo>
        </BarraFiltros>
        <div className="grade-4">
          {gestao ? (
            <>
              <Indicador
                rotulo="Recebido"
                valor={formatarDinheiro(resumo.recebido)}
                detalhe={resumo.estornos ? `${formatarDinheiro(resumo.estornos)} em estornos` : undefined}
              />
              <Indicador rotulo="A receber" valor={formatarDinheiro(resumo.aReceber)} />
              <Indicador
                rotulo="Repasse a pagar"
                valor={formatarDinheiro(resumo.repasse - resumo.repassePago)}
                detalhe={`de ${formatarDinheiro(resumo.repasse)}`}
              />
              <Indicador
                rotulo="Líquido da corretora"
                valor={formatarDinheiro(resumo.liquidoCorretora)}
                detalhe="recebido − estornos − repasses"
              />
            </>
          ) : (
            <>
              <Indicador rotulo="Minhas comissões" valor={formatarDinheiro(resumo.repasse)} />
              <Indicador rotulo="Já pago" valor={formatarDinheiro(resumo.repassePago)} />
              <Indicador rotulo="A receber" valor={formatarDinheiro(resumo.repasse - resumo.repassePago)} />
              <Indicador rotulo="Parcelas" valor={doPeriodo.length} />
            </>
          )}
        </div>
      </Cartao>

      {gestao && resumo.porCorretor.length > 0 && (
        <Cartao titulo="Repasse por corretor" style={{ marginBottom: 20 }}>
          <Tabela
            rotulo="Repasse por corretor"
            itens={resumo.porCorretor}
            chave={(p) => p.responsavelId}
            colunas={[
              { chave: 'nome', titulo: 'Corretor', principal: true, render: (p) => nomeDe(p.responsavelId) },
              {
                chave: 'repasse',
                titulo: 'Repasse',
                alinharDireita: true,
                render: (p) => formatarDinheiro(p.repasse),
              },
              {
                chave: 'pago',
                titulo: 'Pago',
                alinharDireita: true,
                render: (p) => formatarDinheiro(p.repassePago),
              },
              {
                chave: 'saldo',
                titulo: 'Saldo',
                alinharDireita: true,
                render: (p) => formatarDinheiro(p.saldo),
              },
              {
                chave: 'acao',
                titulo: 'Ações',
                render: (p) =>
                  p.saldo !== 0 ? (
                    <Botao
                      pequeno
                      variante="secundario"
                      carregando={salvar.isPending}
                      onClick={() => quitarRepasses(p.responsavelId)}
                    >
                      Quitar
                    </Botao>
                  ) : (
                    <Selo tom="sucesso">Quitado</Selo>
                  ),
              },
            ]}
          />
        </Cartao>
      )}

      <Cartao>
        {isPending ? (
          <Carregando />
        ) : (
          <Tabela
            rotulo="Comissões"
            itens={lista}
            colunas={colunas}
            chave={(c) => c.id}
            aoClicar={gestao ? setEditando : undefined}
            vazio={
              <EstadoVazio titulo="Nenhuma comissão neste período">
                Escolha outro mês ou importe a planilha.
              </EstadoVazio>
            }
          />
        )}
      </Cartao>
      {editando && (
        <FormularioComissao
          comissao={editando === 'nova' ? undefined : editando}
          aoFechar={() => setEditando(null)}
        />
      )}
    </>
  );
}

const dinheiro = z.string().refine((v) => !v.trim() || paraCentavos(v) != null, 'Valor inválido.');
const esquema = z.object({
  clienteNome: z.string().trim().min(2, 'Informe o cliente.'),
  produto: z.string().trim().min(1, 'Informe o produto.'),
  companhia: z.string().trim().min(1, 'Informe a companhia.'),
  numeroProposta: z.string(),
  dataProposta: z.string(),
  parcela: z.string(),
  dataRecebimento: z.string(),
  premio: dinheiro,
  comissaoReceber: dinheiro.refine((v) => v.trim() !== '', 'Informe a comissão.'),
  comissaoRecebida: dinheiro,
  percentualRepasse: z.string().refine((v) => !v.trim() || paraCentavos(v) != null, 'Percentual inválido.'),
  repasse: dinheiro,
  repassePago: dinheiro,
  tipo: z.enum(['corretor', 'corretora', 'estorno']),
  observacoes: z.string(),
  responsavelId: z.string().optional(),
});
type Valores = z.infer<typeof esquema>;

function FormularioComissao({ comissao, aoFechar }: { comissao?: LancamentoComissao; aoFechar: () => void }) {
  const usuario = useUsuario();
  const { comissoes } = useServicos();
  const { produtos } = useConfig();
  const { avisar } = useAvisos();
  const salvar = useSalvar<LancamentoComissao>('comissoes', comissoes);
  const remover = useRemover<LancamentoComissao>('comissoes', comissoes);
  const c = comissao;
  const { register, handleSubmit, formState, setError } = useForm<Valores>({
    resolver: zodResolver(esquema),
    defaultValues: {
      clienteNome: c?.clienteNome ?? '',
      produto: c?.produto ?? '',
      companhia: c?.companhia ?? '',
      numeroProposta: c?.numeroProposta ?? '',
      dataProposta: c?.dataProposta ?? hojeISO(),
      parcela: formatarParcela(c?.parcela) ?? '',
      dataRecebimento: c?.dataRecebimento ?? '',
      premio: centavosParaTexto(c?.premio),
      comissaoReceber: centavosParaTexto(c?.comissaoReceber),
      comissaoRecebida: centavosParaTexto(c?.comissaoRecebida),
      percentualRepasse: c?.percentualRepasse != null ? String(c.percentualRepasse).replace('.', ',') : '',
      repasse: centavosParaTexto(c?.repasse),
      repassePago: centavosParaTexto(c?.repassePago),
      tipo: c?.estorno ? 'estorno' : c?.vendaDaCorretora ? 'corretora' : 'corretor',
      observacoes: c?.observacoes ?? '',
      responsavelId: c?.responsavelId ?? usuario.id,
    },
  });

  const enviar = handleSubmit(async (v) => {
    const d = limparVazios(v);
    const cent = (t?: string) => (t ? (paraCentavos(t) ?? undefined) : undefined);
    const recebida = cent(d.comissaoRecebida) ?? 0;
    const percentual = d.percentualRepasse ? (paraCentavos(d.percentualRepasse) ?? 0) / 100 : undefined;
    // Sem valor de repasse informado, calcula pelo percentual sobre a comissão recebida (como na planilha).
    const repasse =
      cent(d.repasse) ??
      (percentual != null ? porcentagem(recebida || (cent(d.comissaoReceber) ?? 0), percentual) : undefined);
    try {
      await salvar.mutateAsync({
        ...(c ?? {}),
        clienteNome: v.clienteNome,
        produto: v.produto,
        companhia: v.companhia,
        numeroProposta: d.numeroProposta,
        dataProposta: d.dataProposta,
        parcela: d.parcela,
        dataRecebimento: d.dataRecebimento,
        observacoes: d.observacoes,
        responsavelId: d.responsavelId,
        premio: cent(d.premio),
        comissaoReceber: cent(d.comissaoReceber) ?? 0,
        comissaoRecebida: recebida,
        percentualRepasse: percentual,
        repasse: v.tipo === 'corretora' ? undefined : repasse,
        repassePago: v.tipo === 'corretora' ? undefined : cent(d.repassePago),
        estorno: v.tipo === 'estorno' || undefined,
        vendaDaCorretora: v.tipo === 'corretora' || undefined,
      });
      avisar(c ? 'Comissão atualizada.' : 'Comissão lançada.');
      aoFechar();
    } catch (e) {
      aplicarErros(e, setError);
      avisar(mensagemErro(e), 'erro');
    }
  });

  const erros = formState.errors;
  return (
    <Modal
      aberto
      largura={800}
      titulo={c ? `Comissão · ${c.clienteNome}` : 'Nova comissão'}
      aoFechar={aoFechar}
      rodape={
        <>
          {c && (
            <Botao
              variante="perigo"
              carregando={remover.isPending}
              onClick={() =>
                remover.mutate(c.id, {
                  onSuccess: () => {
                    avisar('Comissão removida.');
                    aoFechar();
                  },
                  onError: (e) => avisar(mensagemErro(e), 'erro'),
                })
              }
            >
              Remover
            </Botao>
          )}
          <Botao variante="secundario" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" form="form-comissao" carregando={formState.isSubmitting}>
            Salvar
          </Botao>
        </>
      }
    >
      <form id="form-comissao" className="grade-2" onSubmit={enviar} noValidate>
        <Campo rotulo="Cliente" obrigatorio erro={erros.clienteNome?.message}>
          <Entrada {...register('clienteNome')} />
        </Campo>
        <Campo rotulo="Tipo">
          <Selecao {...register('tipo')}>
            <option value="corretor">Venda de corretor (com repasse)</option>
            <option value="corretora">Venda da corretora (sem repasse)</option>
            <option value="estorno">Estorno</option>
          </Selecao>
        </Campo>
        <Campo rotulo="Produto" obrigatorio erro={erros.produto?.message}>
          <Entrada list="produtos-comissao" {...register('produto')} />
        </Campo>
        <datalist id="produtos-comissao">
          {produtos.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        <Campo rotulo="Seguradora / administradora" obrigatorio erro={erros.companhia?.message}>
          <Entrada {...register('companhia')} />
        </Campo>
        <Campo rotulo="Nº da proposta">
          <Entrada {...register('numeroProposta')} />
        </Campo>
        <Campo rotulo="Data da proposta">
          <Entrada type="date" {...register('dataProposta')} />
        </Campo>
        <Campo rotulo="Parcela" dica="Ex.: 3/10">
          <Entrada {...register('parcela')} />
        </Campo>
        <Campo rotulo="Data do recebimento">
          <Entrada type="date" {...register('dataRecebimento')} />
        </Campo>
        <Campo rotulo="Prêmio / crédito (R$)" erro={erros.premio?.message}>
          <Entrada inputMode="decimal" {...register('premio')} />
        </Campo>
        <Campo rotulo="Comissão a receber (R$)" obrigatorio erro={erros.comissaoReceber?.message}>
          <Entrada inputMode="decimal" {...register('comissaoReceber')} />
        </Campo>
        <Campo rotulo="Comissão recebida (R$)" erro={erros.comissaoRecebida?.message}>
          <Entrada inputMode="decimal" {...register('comissaoRecebida')} />
        </Campo>
        <Campo rotulo="Repasse ao corretor (%)" erro={erros.percentualRepasse?.message}>
          <Entrada inputMode="decimal" placeholder="Ex.: 20" {...register('percentualRepasse')} />
        </Campo>
        <Campo
          rotulo="Repasse (R$)"
          dica="Em branco: calculado pelo percentual."
          erro={erros.repasse?.message}
        >
          <Entrada inputMode="decimal" {...register('repasse')} />
        </Campo>
        <Campo rotulo="Repasse pago (R$)" erro={erros.repassePago?.message}>
          <Entrada inputMode="decimal" {...register('repassePago')} />
        </Campo>
        <SeletorResponsavel {...register('responsavelId')} />
        <Campo rotulo="Observações" className="span-todo">
          <AreaTexto {...register('observacoes')} />
        </Campo>
      </form>
    </Modal>
  );
}
