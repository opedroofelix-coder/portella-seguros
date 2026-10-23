import { zodResolver } from '@hookform/resolvers/zod';
import { aplicarErros, EntradaDinheiro, mensagemErro, useSalvar } from '@portella/app-base';
import { formatarDinheiro, hojeISO, lerDinheiro, textoDinheiro } from '@portella/core';
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
import type { Fechamento } from '../../../domain/financeiro';
import { EstadoErro } from '../../componentes/EstadoErro';
import { useServicosSeguros } from '../../hooks';
import { rotuloMes, useFinanceiro } from './comum';

export function FaturamentoFinanceiro() {
  const { fechamentos } = useFinanceiro();
  const [editando, setEditando] = useState<Fechamento | 'novo' | null>(null);
  const todos = useMemo(
    () => [...(fechamentos.data ?? [])].sort((a, b) => b.mes.localeCompare(a.mes)),
    [fechamentos.data],
  );
  const anos = useMemo(() => [...new Set(todos.map((f) => f.mes.slice(0, 4)))], [todos]);
  const [ano, setAno] = useState<string | null>(null);
  const anoAtivo = ano ?? anos[0] ?? '';
  const lista = todos.filter((f) => !anoAtivo || f.mes.startsWith(anoAtivo));
  const total = lista.reduce((t, f) => t + (f.faturamento ?? 0), 0);
  const credito = lista.reduce((t, f) => t + (f.creditoConsorcio ?? 0), 0);

  return (
    <>
      <BarraFiltros>
        <Campo rotulo="Ano">
          <Selecao value={anoAtivo} onChange={(e) => setAno(e.target.value)}>
            <option value="">Todos</option>
            {anos.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </Selecao>
        </Campo>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <Botao icone="mais" onClick={() => setEditando('novo')}>
            Fechar mês
          </Botao>
        </div>
      </BarraFiltros>
      {fechamentos.isError ? (
        <EstadoErro oque="o faturamento" aoTentar={() => fechamentos.refetch()} />
      ) : fechamentos.isPending ? (
        <Carregando texto="Carregando o faturamento…" />
      ) : (
        <Tabela
          rotulo="Faturamento mensal"
          itens={lista}
          chave={(f) => f.id}
          aoClicar={setEditando}
          vazio={<EstadoVazio titulo="Nenhum fechamento">Importe a planilha ou feche o mês.</EstadoVazio>}
          totais={{
            rotulo: anoAtivo ? `Total de ${anoAtivo}` : 'Total de todos os anos',
            valores: { fat: formatarDinheiro(total), cons: formatarDinheiro(credito) },
          }}
          colunas={[
            { chave: 'mes', titulo: 'Mês', principal: true, render: (f) => rotuloMes(f.mes) },
            {
              chave: 'fat',
              titulo: 'Faturamento (comissões)',
              alinharDireita: true,
              render: (f) => formatarDinheiro(f.faturamento),
            },
            {
              chave: 'cons',
              titulo: 'Crédito de consórcio vendido',
              alinharDireita: true,
              render: (f) => formatarDinheiro(f.creditoConsorcio),
            },
          ]}
        />
      )}
      {editando && (
        <FormularioFechamento
          fechamento={editando === 'novo' ? undefined : editando}
          existentes={todos}
          aoFechar={() => setEditando(null)}
        />
      )}
    </>
  );
}

const dinheiro = z.string().refine((v) => !v.trim() || lerDinheiro(v) != null, 'Valor inválido.');
const esquema = z.object({
  mes: z.string().regex(/^\d{4}-\d{2}$/, 'Escolha o mês.'),
  faturamento: dinheiro,
  creditoConsorcio: dinheiro,
});
type Valores = z.infer<typeof esquema>;

function FormularioFechamento({
  fechamento,
  existentes,
  aoFechar,
}: {
  fechamento?: Fechamento;
  existentes: Fechamento[];
  aoFechar: () => void;
}) {
  const { fechamentos } = useServicosSeguros();
  const salvar = useSalvar<Fechamento>('fechamentos', fechamentos);
  const { avisar } = useAvisos();
  const [substituir, setSubstituir] = useState<Valores | null>(null);
  const { register, handleSubmit, formState, setError } = useForm<Valores>({
    resolver: zodResolver(esquema),
    defaultValues: {
      mes: fechamento?.mes ?? hojeISO().slice(0, 7),
      faturamento: textoDinheiro(fechamento?.faturamento),
      creditoConsorcio: textoDinheiro(fechamento?.creditoConsorcio),
    },
  });

  const gravar = async (v: Valores) => {
    const c = (t: string) => (t.trim() ? (lerDinheiro(t) ?? undefined) : undefined);
    const anterior = fechamento ?? existentes.find((f) => f.mes === v.mes);
    try {
      // O id é o mês: fechar o mesmo mês de novo atualiza o registro.
      await salvar.mutateAsync({
        ...(anterior ?? {}),
        id: v.mes,
        mes: v.mes,
        faturamento: c(v.faturamento),
        creditoConsorcio: c(v.creditoConsorcio),
      });
      avisar('Fechamento salvo.');
      aoFechar();
    } catch (e) {
      aplicarErros(e, setError);
      avisar(mensagemErro(e), 'erro');
    }
  };
  const enviar = handleSubmit(async (v) => {
    // Fechar de novo um mês que já tem fechamento substitui os valores: pede confirmação antes.
    if (!fechamento && existentes.some((f) => f.mes === v.mes)) setSubstituir(v);
    else await gravar(v);
  });

  const erros = formState.errors;
  return (
    <Modal
      aberto
      titulo={fechamento ? rotuloMes(fechamento.mes) : 'Fechar mês'}
      aoFechar={aoFechar}
      alterado={formState.isDirty}
      bloqueado={formState.isSubmitting}
      largura={520}
      rodape={
        <>
          <Botao variante="secundario" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" form="form-fechamento" carregando={formState.isSubmitting}>
            Salvar
          </Botao>
        </>
      }
    >
      <form id="form-fechamento" className="grade" onSubmit={enviar} noValidate>
        <Campo rotulo="Mês" obrigatorio erro={erros.mes?.message}>
          <Entrada type="month" readOnly={Boolean(fechamento)} {...register('mes')} />
        </Campo>
        <Campo rotulo="Faturamento (comissões)" erro={erros.faturamento?.message}>
          <EntradaDinheiro {...register('faturamento')} />
        </Campo>
        <Campo rotulo="Crédito de consórcio vendido" erro={erros.creditoConsorcio?.message}>
          <EntradaDinheiro {...register('creditoConsorcio')} />
        </Campo>
      </form>
      <ConfirmarAcao
        aberto={substituir != null}
        titulo="Substituir o fechamento?"
        mensagem={`${substituir ? rotuloMes(substituir.mes) : ''} já tem fechamento. Os valores novos substituem os antigos.`}
        textoConfirmar="Substituir"
        carregando={salvar.isPending}
        aoCancelar={() => setSubstituir(null)}
        aoConfirmar={() => substituir && void gravar(substituir)}
      />
    </Modal>
  );
}
