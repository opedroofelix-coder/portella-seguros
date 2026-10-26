import { zodResolver } from '@hookform/resolvers/zod';
import {
  aplicarErros,
  EntradaDinheiro,
  limparVazios,
  mensagemErro,
  useCatalogo,
  useRemover,
  useSalvar,
} from '@portella/app-base';
import { formatarData, formatarDinheiro, hojeISO, lerDinheiro, textoDinheiro } from '@portella/core';
import {
  BarraFiltros,
  Botao,
  Campo,
  Carregando,
  ConfirmarAcao,
  Entrada,
  EstadoVazio,
  Modal,
  Selecao,
  Tabela,
  useAvisos,
} from '@portella/ui';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { Movimento } from '../../../domain/financeiro';
import { CONTA_PRINCIPAL, extrato, textoMovimento } from '../../../domain/financeiro';
import { EstadoErro } from '../../componentes/EstadoErro';
import { useServicosSeguros } from '../../hooks';
import { mesesDe, mesPadrao, rotuloMes, useFinanceiro } from './comum';

export function ExtratoFinanceiro() {
  const { movimentos } = useFinanceiro();
  const movs = useMemo(() => movimentos.data ?? [], [movimentos.data]);
  const contas = useMemo(() => [...new Set([CONTA_PRINCIPAL, ...movs.map((m) => m.conta)])], [movs]);
  const [conta, setConta] = useState(CONTA_PRINCIPAL);
  const linhasConta = useMemo(() => extrato(movs, conta), [movs, conta]);
  const meses = useMemo(() => mesesDe(linhasConta.map((m) => m.data)), [linhasConta]);
  const [mes, setMes] = useState<string | null>(null);
  const mesAtivo = mes ?? mesPadrao(meses, hojeISO());
  const [editando, setEditando] = useState<Movimento | 'novo' | null>(null);
  const linhas = linhasConta.filter((m) => !mesAtivo || m.data.startsWith(mesAtivo));

  return (
    <>
      <BarraFiltros>
        <Campo rotulo="Conta">
          <Selecao
            value={conta}
            onChange={(e) => {
              setConta(e.target.value);
              setMes(null);
            }}
          >
            {contas.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Selecao>
        </Campo>
        <Campo rotulo="Mês">
          <Selecao value={mesAtivo} onChange={(e) => setMes(e.target.value)}>
            <option value="">Todos</option>
            {meses.map((m) => (
              <option key={m} value={m}>
                {rotuloMes(m)}
              </option>
            ))}
          </Selecao>
        </Campo>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <Botao icone="mais" onClick={() => setEditando('novo')}>
            Novo movimento
          </Botao>
        </div>
      </BarraFiltros>
      {movimentos.isError ? (
        <EstadoErro oque="o extrato" aoTentar={() => movimentos.refetch()} />
      ) : movimentos.isPending ? (
        <Carregando texto="Carregando o extrato…" />
      ) : (
        <Tabela
          rotulo={`Extrato ${conta}`}
          itens={[...linhas].reverse()}
          chave={(m) => m.id}
          aoClicar={setEditando}
          porPagina={50}
          vazio={<EstadoVazio titulo="Sem movimentos">Importe a planilha ou lance um movimento.</EstadoVazio>}
          colunas={[
            {
              chave: 'desc',
              titulo: 'Descrição',
              principal: true,
              render: textoMovimento,
            },
            { chave: 'data', titulo: 'Data', render: (m) => formatarData(m.data) },
            {
              chave: 'entrada',
              titulo: 'Entrada',
              alinharDireita: true,
              render: (m) => (m.tipo === 'entrada' ? formatarDinheiro(m.valor) : '—'),
            },
            {
              chave: 'saida',
              titulo: 'Saída',
              alinharDireita: true,
              render: (m) => (m.tipo === 'saida' ? `− ${formatarDinheiro(m.valor)}` : '—'),
            },
            {
              chave: 'saldo',
              titulo: 'Saldo',
              alinharDireita: true,
              render: (m) => formatarDinheiro(m.saldo),
            },
          ]}
        />
      )}
      {editando && (
        <FormularioMovimento
          movimento={editando === 'novo' ? undefined : editando}
          conta={conta}
          contas={contas}
          aoFechar={() => setEditando(null)}
        />
      )}
    </>
  );
}

/**
 * Entradas: a origem (seguradora ou origem de Configurações) é obrigatória e a descrição vira um
 * detalhe opcional. Entradas antigas sem origem (importadas do extrato) podem ser salvas só com a descrição.
 */
const montarEsquema = (origemObrigatoria: boolean) =>
  z
    .object({
      conta: z.string().trim().min(1, 'Informe a conta.'),
      data: z.string().min(1, 'Informe a data.'),
      origem: z.string(),
      descricao: z.string().trim(),
      tipo: z.enum(['entrada', 'saida', 'saldo_inicial']),
      valor: z.string().refine((v) => lerDinheiro(v) != null && lerDinheiro(v)! >= 0, 'Valor inválido.'),
      documento: z.string(),
    })
    .superRefine((v, ctx) => {
      if (v.tipo === 'entrada' && origemObrigatoria && !v.origem)
        ctx.addIssue({ code: 'custom', path: ['origem'], message: 'Escolha de onde veio o recebimento.' });
      else if (!v.descricao && !(v.tipo === 'entrada' && v.origem))
        ctx.addIssue({ code: 'custom', path: ['descricao'], message: 'Informe a descrição.' });
    });
type Valores = z.infer<ReturnType<typeof montarEsquema>>;

function FormularioMovimento({
  movimento,
  conta,
  contas,
  aoFechar,
}: {
  movimento?: Movimento;
  conta: string;
  contas: string[];
  aoFechar: () => void;
}) {
  const { movimentos } = useServicosSeguros();
  const seguradoras = useCatalogo('seguradoras');
  const outrasOrigens = useCatalogo('origensRecebimento');
  // Entrada antiga sem origem: continua editável só com a descrição.
  const origemObrigatoria = !movimento || movimento.tipo !== 'entrada' || Boolean(movimento.origem);
  const salvar = useSalvar<Movimento>('movimentos', movimentos);
  const remover = useRemover<Movimento>('movimentos', movimentos);
  const { avisar } = useAvisos();
  const [confirmarRemocao, setConfirmarRemocao] = useState(false);
  const { register, handleSubmit, formState, setError, watch } = useForm<Valores>({
    resolver: zodResolver(montarEsquema(origemObrigatoria)),
    defaultValues: {
      conta: movimento?.conta ?? conta,
      data: movimento?.data ?? hojeISO(),
      origem: movimento?.origem ?? '',
      // Com origem, a descrição guardada igual à origem é só o preenchimento automático: o detalhe fica vazio.
      descricao: movimento?.descricao && movimento.descricao !== movimento.origem ? movimento.descricao : '',
      tipo: movimento?.tipo ?? 'entrada',
      valor: textoDinheiro(movimento?.valor),
      documento: movimento?.documento ?? '',
    },
  });
  const entrada = watch('tipo') === 'entrada';
  const origemAtual = watch('origem');
  const enviar = handleSubmit(async (v) => {
    const origem = v.tipo === 'entrada' && v.origem ? v.origem : undefined;
    try {
      await salvar.mutateAsync({
        ...(movimento ?? {}),
        ...limparVazios(v),
        origem,
        descricao: v.descricao || origem || '',
        valor: lerDinheiro(v.valor) ?? 0,
      });
      avisar('Movimento salvo.');
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
      titulo={movimento ? 'Editar movimento' : 'Novo movimento'}
      aoFechar={aoFechar}
      alterado={formState.isDirty}
      bloqueado={formState.isSubmitting}
      rodape={
        <>
          {movimento && (
            <Botao variante="perigo" icone="lixeira" onClick={() => setConfirmarRemocao(true)}>
              Excluir
            </Botao>
          )}
          <Botao variante="secundario" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" form="form-movimento" carregando={formState.isSubmitting}>
            Salvar
          </Botao>
        </>
      }
    >
      <form id="form-movimento" className="grade-2" onSubmit={enviar} noValidate>
        <Campo
          rotulo="Conta"
          obrigatorio
          erro={erros.conta?.message}
          dica="Escolha uma conta da lista; digite só para criar uma nova."
        >
          <Entrada list="contas-extrato" autoComplete="off" {...register('conta')} />
        </Campo>
        <datalist id="contas-extrato">
          {contas.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <Campo rotulo="Data" obrigatorio erro={erros.data?.message}>
          <Entrada type="date" {...register('data')} />
        </Campo>
        <Campo rotulo="Tipo">
          <Selecao {...register('tipo')}>
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
            <option value="saldo_inicial">Saldo inicial</option>
          </Selecao>
        </Campo>
        {entrada && (
          <Campo
            rotulo="Recebido de"
            obrigatorio={origemObrigatoria}
            erro={erros.origem?.message}
            dica="Seguradora ou outra origem (Configurações › Origens de recebimento)."
          >
            <Selecao {...register('origem')}>
              <option value="">Escolha…</option>
              <optgroup label="Seguradoras">
                {seguradoras.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </optgroup>
              {outrasOrigens.length > 0 && (
                <optgroup label="Outras origens">
                  {outrasOrigens.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </optgroup>
              )}
              {origemAtual && !seguradoras.includes(origemAtual) && !outrasOrigens.includes(origemAtual) && (
                <option>{origemAtual}</option>
              )}
            </Selecao>
          </Campo>
        )}
        <Campo
          rotulo={entrada ? 'Descrição (opcional)' : 'Descrição'}
          obrigatorio={!entrada || !origemObrigatoria}
          erro={erros.descricao?.message}
          className="span-todo"
        >
          <Entrada
            placeholder={entrada ? 'Ex.: comissão de João Silva, parcela 2' : undefined}
            {...register('descricao')}
          />
        </Campo>
        <Campo rotulo="Valor" obrigatorio erro={erros.valor?.message}>
          <EntradaDinheiro {...register('valor')} />
        </Campo>
        <Campo rotulo="Documento">
          <Entrada {...register('documento')} />
        </Campo>
      </form>
      {movimento && (
        <ConfirmarAcao
          aberto={confirmarRemocao}
          titulo="Excluir o movimento?"
          mensagem={`"${textoMovimento(movimento)}" sai do extrato e o saldo é recalculado.`}
          textoConfirmar="Excluir movimento"
          perigo
          carregando={remover.isPending}
          aoCancelar={() => setConfirmarRemocao(false)}
          aoConfirmar={() =>
            remover.mutate(movimento.id, {
              onSuccess: () => {
                avisar('Movimento excluído.');
                aoFechar();
              },
              onError: (e) => avisar(mensagemErro(e), 'erro'),
            })
          }
        />
      )}
    </Modal>
  );
}
