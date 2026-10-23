import { zodResolver } from '@hookform/resolvers/zod';
import {
  aplicarErros,
  EntradaDinheiro,
  limparVazios,
  mensagemErro,
  useRemover,
  useSalvar,
} from '@portella/app-base';
import { formatarData, formatarDinheiro, hojeISO, lerDinheiro, textoDinheiro } from '@portella/core';
import type { TomSelo } from '@portella/ui';
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
  Selo,
  Tabela,
  useAvisos,
} from '@portella/ui';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { Despesa, Movimento, SituacaoDespesa } from '../../../domain/financeiro';
import { CONTA_PRINCIPAL, ROTULO_DESPESA, situacaoDespesa } from '../../../domain/financeiro';
import { EstadoErro } from '../../componentes/EstadoErro';
import { useServicosSeguros } from '../../hooks';
import { mesesDe, mesPadrao, rotuloMes, useFinanceiro } from './comum';

const TOM: Record<SituacaoDespesa, TomSelo> = { paga: 'sucesso', aberta: 'alerta', vencida: 'perigo' };

export function DespesasFinanceiro() {
  const { despesas } = useFinanceiro();
  const { despesas: servico, movimentos } = useServicosSeguros();
  const salvar = useSalvar<Despesa>('despesas', servico);
  const lancar = useSalvar<Movimento>('movimentos', movimentos);
  const { avisar } = useAvisos();
  const lista = useMemo(() => despesas.data ?? [], [despesas.data]);
  const meses = useMemo(() => mesesDe(lista.map((d) => d.vencimento ?? d.pagamento)), [lista]);
  const [mes, setMes] = useState<string | null>(null);
  const hoje = hojeISO();
  const mesAtivo = mes ?? mesPadrao(meses, hoje);
  const [sit, setSit] = useState<SituacaoDespesa | ''>('');
  const [editando, setEditando] = useState<Despesa | 'nova' | null>(null);
  const [pagando, setPagando] = useState<Despesa | null>(null);
  const [dataPagamento, setDataPagamento] = useState(hoje);
  const [noExtrato, setNoExtrato] = useState(true);

  const filtradas = lista
    .filter((d) => !mesAtivo || (d.vencimento ?? d.pagamento ?? '').startsWith(mesAtivo))
    .filter((d) => !sit || situacaoDespesa(d, hoje) === sit)
    .sort((a, b) => (a.vencimento ?? '').localeCompare(b.vencimento ?? ''));
  const emAberto = filtradas.reduce((t, d) => t + Math.max(0, d.valor - d.pago), 0);
  const pagas = filtradas.reduce((t, d) => t + Math.min(d.pago, d.valor), 0);

  // Pagar quita a despesa e, se marcado, lança a saída na conta principal: extrato e despesas batem.
  const pagar = async (d: Despesa) => {
    try {
      await salvar.mutateAsync({ ...d, pago: d.valor, pagamento: dataPagamento });
      if (noExtrato) {
        await lancar.mutateAsync({
          conta: CONTA_PRINCIPAL,
          data: dataPagamento,
          descricao: `Pagamento: ${d.descricao}`,
          tipo: 'saida',
          valor: d.valor - d.pago,
        });
      }
      avisar(noExtrato ? `Despesa paga e lançada no extrato ${CONTA_PRINCIPAL}.` : 'Despesa paga.');
      setPagando(null);
    } catch (e) {
      avisar(mensagemErro(e), 'erro');
    }
  };

  return (
    <>
      <BarraFiltros>
        <Campo rotulo="Mês do vencimento">
          <Selecao value={mesAtivo} onChange={(e) => setMes(e.target.value)}>
            <option value="">Todos</option>
            {meses.map((m) => (
              <option key={m} value={m}>
                {rotuloMes(m)}
              </option>
            ))}
          </Selecao>
        </Campo>
        <Campo rotulo="Situação">
          <Selecao value={sit} onChange={(e) => setSit(e.target.value as SituacaoDespesa | '')}>
            <option value="">Todas</option>
            {(Object.keys(ROTULO_DESPESA) as SituacaoDespesa[]).map((s) => (
              <option key={s} value={s}>
                {ROTULO_DESPESA[s]}
              </option>
            ))}
          </Selecao>
        </Campo>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <Botao icone="mais" onClick={() => setEditando('nova')}>
            Nova despesa
          </Botao>
        </div>
      </BarraFiltros>
      <p className="texto-suave">
        {filtradas.length} despesa{filtradas.length === 1 ? '' : 's'} · {formatarDinheiro(emAberto)} em aberto
        · {formatarDinheiro(pagas)} pagas
      </p>
      {despesas.isError ? (
        <EstadoErro oque="as despesas" aoTentar={() => despesas.refetch()} />
      ) : despesas.isPending ? (
        <Carregando texto="Carregando as despesas…" />
      ) : (
        <Tabela
          rotulo="Despesas"
          itens={filtradas}
          chave={(d) => d.id}
          aoClicar={setEditando}
          porPagina={50}
          vazio={<EstadoVazio titulo="Nenhuma despesa">Importe a planilha ou lance uma despesa.</EstadoVazio>}
          colunas={[
            { chave: 'desc', titulo: 'Descrição', principal: true, render: (d) => d.descricao },
            { chave: 'venc', titulo: 'Vencimento', render: (d) => formatarData(d.vencimento) },
            {
              chave: 'valor',
              titulo: 'Valor',
              alinharDireita: true,
              render: (d) => formatarDinheiro(d.valor),
            },
            {
              chave: 'pgto',
              titulo: 'Pagamento',
              ocultarNoMobile: true,
              render: (d) => formatarData(d.pagamento),
            },
            {
              chave: 'sit',
              titulo: 'Situação',
              render: (d) => (
                <Selo tom={TOM[situacaoDespesa(d, hoje)]}>{ROTULO_DESPESA[situacaoDespesa(d, hoje)]}</Selo>
              ),
            },
            {
              chave: 'acoes',
              titulo: 'Ações',
              render: (d) =>
                situacaoDespesa(d, hoje) !== 'paga' ? (
                  <div className="acoes-linha">
                    <Botao
                      pequeno
                      variante="secundario"
                      onClick={() => {
                        setDataPagamento(hoje);
                        setNoExtrato(true);
                        setPagando(d);
                      }}
                    >
                      Pagar…
                    </Botao>
                  </div>
                ) : null,
            },
          ]}
        />
      )}
      {editando && (
        <FormularioDespesa
          despesa={editando === 'nova' ? undefined : editando}
          aoFechar={() => setEditando(null)}
        />
      )}
      <ConfirmarAcao
        aberto={pagando != null}
        titulo="Registrar o pagamento?"
        mensagem={pagando ? `${pagando.descricao}: ${formatarDinheiro(pagando.valor - pagando.pago)}.` : ''}
        textoConfirmar="Registrar pagamento"
        carregando={salvar.isPending || lancar.isPending}
        aoCancelar={() => setPagando(null)}
        aoConfirmar={() => pagando && void pagar(pagando)}
      >
        <div className="grade">
          <Campo rotulo="Data do pagamento">
            <Entrada type="date" value={dataPagamento} onChange={(e) => setDataPagamento(e.target.value)} />
          </Campo>
          <label className="opcao-marcar">
            <input type="checkbox" checked={noExtrato} onChange={(e) => setNoExtrato(e.target.checked)} />
            Lançar a saída no extrato {CONTA_PRINCIPAL}
          </label>
        </div>
      </ConfirmarAcao>
    </>
  );
}

const dinheiro = z.string().refine((v) => !v.trim() || lerDinheiro(v) != null, 'Valor inválido.');
const esquema = z.object({
  descricao: z.string().trim().min(1, 'Informe a descrição.'),
  vencimento: z.string(),
  pagamento: z.string(),
  valor: dinheiro.refine((v) => v.trim() !== '', 'Informe o valor.'),
  pago: dinheiro,
  categoria: z.string(),
});
type Valores = z.infer<typeof esquema>;

function FormularioDespesa({ despesa, aoFechar }: { despesa?: Despesa; aoFechar: () => void }) {
  const { despesas } = useServicosSeguros();
  const salvar = useSalvar<Despesa>('despesas', despesas);
  const remover = useRemover<Despesa>('despesas', despesas);
  const { avisar } = useAvisos();
  const [confirmarRemocao, setConfirmarRemocao] = useState(false);
  const { register, handleSubmit, formState, setError } = useForm<Valores>({
    resolver: zodResolver(esquema),
    defaultValues: {
      descricao: despesa?.descricao ?? '',
      vencimento: despesa?.vencimento ?? hojeISO(),
      pagamento: despesa?.pagamento ?? '',
      valor: textoDinheiro(despesa?.valor),
      pago: textoDinheiro(despesa?.pago),
      categoria: despesa?.categoria ?? '',
    },
  });
  const enviar = handleSubmit(async (v) => {
    const d = limparVazios(v);
    try {
      await salvar.mutateAsync({
        ...(despesa ?? {}),
        ...d,
        valor: lerDinheiro(v.valor) ?? 0,
        pago: d.pago ? (lerDinheiro(d.pago) ?? 0) : 0,
      });
      avisar('Despesa salva.');
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
      titulo={despesa ? 'Editar despesa' : 'Nova despesa'}
      aoFechar={aoFechar}
      alterado={formState.isDirty}
      bloqueado={formState.isSubmitting}
      rodape={
        <>
          {despesa && (
            <Botao variante="perigo" icone="lixeira" onClick={() => setConfirmarRemocao(true)}>
              Excluir
            </Botao>
          )}
          <Botao variante="secundario" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" form="form-despesa" carregando={formState.isSubmitting}>
            Salvar
          </Botao>
        </>
      }
    >
      <form id="form-despesa" className="grade-2" onSubmit={enviar} noValidate>
        <Campo rotulo="Descrição" obrigatorio erro={erros.descricao?.message} className="span-todo">
          <Entrada {...register('descricao')} />
        </Campo>
        <Campo rotulo="Vencimento">
          <Entrada type="date" {...register('vencimento')} />
        </Campo>
        <Campo rotulo="Valor" obrigatorio erro={erros.valor?.message}>
          <EntradaDinheiro {...register('valor')} />
        </Campo>
        <Campo rotulo="Data do pagamento">
          <Entrada type="date" {...register('pagamento')} />
        </Campo>
        <Campo rotulo="Valor pago" erro={erros.pago?.message}>
          <EntradaDinheiro {...register('pago')} />
        </Campo>
        <Campo rotulo="Categoria" dica="Ex.: Aluguel, Salários, Impostos">
          <Entrada {...register('categoria')} />
        </Campo>
      </form>
      {despesa && (
        <ConfirmarAcao
          aberto={confirmarRemocao}
          titulo="Excluir a despesa?"
          mensagem={`"${despesa.descricao}" sai das despesas. O que já foi lançado no extrato continua lá.`}
          textoConfirmar="Excluir despesa"
          perigo
          carregando={remover.isPending}
          aoCancelar={() => setConfirmarRemocao(false)}
          aoConfirmar={() =>
            remover.mutate(despesa.id, {
              onSuccess: () => {
                avisar('Despesa excluída.');
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
