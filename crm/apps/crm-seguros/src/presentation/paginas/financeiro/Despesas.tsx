import { zodResolver } from '@hookform/resolvers/zod';
import { aplicarErros, limparVazios, mensagemErro, useRemover, useSalvar } from '@portella/app-base';
import { centavosParaTexto, formatarData, formatarDinheiro, hojeISO, paraCentavos } from '@portella/core';
import type { TomSelo } from '@portella/ui';
import {
  BarraFiltros,
  Botao,
  Campo,
  Carregando,
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
import type { Despesa, SituacaoDespesa } from '../../../domain/financeiro';
import { ROTULO_DESPESA, situacaoDespesa } from '../../../domain/financeiro';
import { useServicosSeguros } from '../../hooks';
import { mesesDe, rotuloMes, useFinanceiro } from './comum';

const TOM: Record<SituacaoDespesa, TomSelo> = { paga: 'sucesso', aberta: 'alerta', vencida: 'perigo' };

export function DespesasFinanceiro() {
  const { despesas } = useFinanceiro();
  const { despesas: servico } = useServicosSeguros();
  const salvar = useSalvar<Despesa>('despesas', servico);
  const { avisar } = useAvisos();
  const lista = useMemo(() => despesas.data ?? [], [despesas.data]);
  const meses = useMemo(() => mesesDe(lista.map((d) => d.vencimento ?? d.pagamento)), [lista]);
  const [mes, setMes] = useState<string | null>(null);
  const mesAtivo = mes ?? meses[0] ?? '';
  const [sit, setSit] = useState<SituacaoDespesa | ''>('');
  const [editando, setEditando] = useState<Despesa | 'nova' | null>(null);
  const hoje = hojeISO();

  const filtradas = lista
    .filter((d) => !mesAtivo || (d.vencimento ?? d.pagamento ?? '').startsWith(mesAtivo))
    .filter((d) => !sit || situacaoDespesa(d, hoje) === sit)
    .sort((a, b) => (a.vencimento ?? '').localeCompare(b.vencimento ?? ''));
  const total = filtradas.reduce((t, d) => t + d.valor, 0);

  const pagar = (d: Despesa) =>
    salvar.mutate(
      { ...d, pago: d.valor, pagamento: d.pagamento ?? hoje },
      { onSuccess: () => avisar('Despesa paga.'), onError: (e) => avisar(mensagemErro(e), 'erro') },
    );

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
        {filtradas.length} despesa(s) · total {formatarDinheiro(total)}
      </p>
      {despesas.isPending ? (
        <Carregando />
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
                  <div
                    className="acoes-linha"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <Botao pequeno variante="secundario" onClick={() => pagar(d)}>
                      Pagar
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
    </>
  );
}

const dinheiro = z.string().refine((v) => !v.trim() || paraCentavos(v) != null, 'Valor inválido.');
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
  const { register, handleSubmit, formState, setError } = useForm<Valores>({
    resolver: zodResolver(esquema),
    defaultValues: {
      descricao: despesa?.descricao ?? '',
      vencimento: despesa?.vencimento ?? hojeISO(),
      pagamento: despesa?.pagamento ?? '',
      valor: centavosParaTexto(despesa?.valor),
      pago: centavosParaTexto(despesa?.pago),
      categoria: despesa?.categoria ?? '',
    },
  });
  const enviar = handleSubmit(async (v) => {
    const d = limparVazios(v);
    try {
      await salvar.mutateAsync({
        ...(despesa ?? {}),
        ...d,
        valor: paraCentavos(v.valor) ?? 0,
        pago: d.pago ? (paraCentavos(d.pago) ?? 0) : 0,
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
      rodape={
        <>
          {despesa && (
            <Botao
              variante="perigo"
              onClick={() =>
                remover.mutate(despesa.id, {
                  onSuccess: () => {
                    avisar('Despesa removida.');
                    aoFechar();
                  },
                })
              }
            >
              Remover
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
        <Campo rotulo="Valor (R$)" obrigatorio erro={erros.valor?.message}>
          <Entrada inputMode="decimal" {...register('valor')} />
        </Campo>
        <Campo rotulo="Data do pagamento">
          <Entrada type="date" {...register('pagamento')} />
        </Campo>
        <Campo rotulo="Valor pago (R$)" erro={erros.pago?.message}>
          <Entrada inputMode="decimal" {...register('pago')} />
        </Campo>
        <Campo rotulo="Categoria" dica="Ex.: Aluguel, Salários, Impostos">
          <Entrada {...register('categoria')} />
        </Campo>
      </form>
    </Modal>
  );
}
