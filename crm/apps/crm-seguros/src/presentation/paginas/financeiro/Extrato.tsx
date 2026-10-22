import { zodResolver } from '@hookform/resolvers/zod';
import { aplicarErros, limparVazios, mensagemErro, useRemover, useSalvar } from '@portella/app-base';
import { centavosParaTexto, formatarData, formatarDinheiro, hojeISO, paraCentavos } from '@portella/core';
import {
  BarraFiltros,
  Botao,
  Campo,
  Carregando,
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
import { CONTA_PRINCIPAL, extrato } from '../../../domain/financeiro';
import { useServicosSeguros } from '../../hooks';
import { mesesDe, rotuloMes, useFinanceiro } from './comum';

export function ExtratoFinanceiro() {
  const { movimentos } = useFinanceiro();
  const movs = useMemo(() => movimentos.data ?? [], [movimentos.data]);
  const contas = useMemo(() => [...new Set([CONTA_PRINCIPAL, ...movs.map((m) => m.conta)])], [movs]);
  const [conta, setConta] = useState(CONTA_PRINCIPAL);
  const linhasConta = useMemo(() => extrato(movs, conta), [movs, conta]);
  const meses = useMemo(() => mesesDe(linhasConta.map((m) => m.data)), [linhasConta]);
  const [mes, setMes] = useState<string | null>(null);
  const mesAtivo = mes ?? meses[0] ?? '';
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
      {movimentos.isPending ? (
        <Carregando />
      ) : (
        <Tabela
          rotulo={`Extrato ${conta}`}
          itens={[...linhas].reverse()}
          chave={(m) => m.id}
          aoClicar={setEditando}
          porPagina={50}
          vazio={<EstadoVazio titulo="Sem movimentos">Importe a planilha ou lance um movimento.</EstadoVazio>}
          colunas={[
            { chave: 'desc', titulo: 'Descrição', principal: true, render: (m) => m.descricao },
            { chave: 'data', titulo: 'Data', render: (m) => formatarData(m.data) },
            {
              chave: 'entrada',
              titulo: 'Entrada',
              alinharDireita: true,
              render: (m) => (m.tipo === 'saida' ? '—' : formatarDinheiro(m.valor)),
            },
            {
              chave: 'saida',
              titulo: 'Saída',
              alinharDireita: true,
              render: (m) => (m.tipo === 'saida' ? formatarDinheiro(m.valor) : '—'),
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
          aoFechar={() => setEditando(null)}
        />
      )}
    </>
  );
}

const esquema = z.object({
  conta: z.string().trim().min(1, 'Informe a conta.'),
  data: z.string().min(1, 'Informe a data.'),
  descricao: z.string().trim().min(1, 'Informe a descrição.'),
  tipo: z.enum(['entrada', 'saida', 'saldo_inicial']),
  valor: z.string().refine((v) => paraCentavos(v) != null && paraCentavos(v)! >= 0, 'Valor inválido.'),
  documento: z.string(),
});
type Valores = z.infer<typeof esquema>;

function FormularioMovimento({
  movimento,
  conta,
  aoFechar,
}: {
  movimento?: Movimento;
  conta: string;
  aoFechar: () => void;
}) {
  const { movimentos } = useServicosSeguros();
  const salvar = useSalvar<Movimento>('movimentos', movimentos);
  const remover = useRemover<Movimento>('movimentos', movimentos);
  const { avisar } = useAvisos();
  const { register, handleSubmit, formState, setError } = useForm<Valores>({
    resolver: zodResolver(esquema),
    defaultValues: {
      conta: movimento?.conta ?? conta,
      data: movimento?.data ?? hojeISO(),
      descricao: movimento?.descricao ?? '',
      tipo: movimento?.tipo ?? 'entrada',
      valor: centavosParaTexto(movimento?.valor),
      documento: movimento?.documento ?? '',
    },
  });
  const enviar = handleSubmit(async (v) => {
    try {
      await salvar.mutateAsync({
        ...(movimento ?? {}),
        ...limparVazios(v),
        valor: paraCentavos(v.valor) ?? 0,
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
      rodape={
        <>
          {movimento && (
            <Botao
              variante="perigo"
              onClick={() =>
                remover.mutate(movimento.id, {
                  onSuccess: () => {
                    avisar('Movimento removido.');
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
          <Botao type="submit" form="form-movimento" carregando={formState.isSubmitting}>
            Salvar
          </Botao>
        </>
      }
    >
      <form id="form-movimento" className="grade-2" onSubmit={enviar} noValidate>
        <Campo rotulo="Conta" obrigatorio erro={erros.conta?.message}>
          <Entrada {...register('conta')} />
        </Campo>
        <Campo rotulo="Data" obrigatorio erro={erros.data?.message}>
          <Entrada type="date" {...register('data')} />
        </Campo>
        <Campo rotulo="Descrição" obrigatorio erro={erros.descricao?.message} className="span-todo">
          <Entrada {...register('descricao')} />
        </Campo>
        <Campo rotulo="Tipo">
          <Selecao {...register('tipo')}>
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
            <option value="saldo_inicial">Saldo inicial</option>
          </Selecao>
        </Campo>
        <Campo rotulo="Valor (R$)" obrigatorio erro={erros.valor?.message}>
          <Entrada inputMode="decimal" {...register('valor')} />
        </Campo>
        <Campo rotulo="Documento">
          <Entrada {...register('documento')} />
        </Campo>
      </form>
    </Modal>
  );
}
