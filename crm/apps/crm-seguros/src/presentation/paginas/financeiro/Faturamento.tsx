import { zodResolver } from '@hookform/resolvers/zod';
import { aplicarErros, mensagemErro, useSalvar } from '@portella/app-base';
import { centavosParaTexto, formatarDinheiro, hojeISO, paraCentavos } from '@portella/core';
import { Botao, Campo, Carregando, Entrada, EstadoVazio, Modal, Tabela, useAvisos } from '@portella/ui';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { Fechamento } from '../../../domain/financeiro';
import { useServicosSeguros } from '../../hooks';
import { rotuloMes, useFinanceiro } from './comum';

export function FaturamentoFinanceiro() {
  const { fechamentos } = useFinanceiro();
  const [editando, setEditando] = useState<Fechamento | 'novo' | null>(null);
  const lista = [...(fechamentos.data ?? [])].sort((a, b) => b.mes.localeCompare(a.mes));
  const total = lista.reduce((t, f) => t + (f.faturamento ?? 0), 0);
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <p className="texto-suave" style={{ margin: 0 }}>Total no período: {formatarDinheiro(total)}</p>
        <Botao icone="mais" onClick={() => setEditando('novo')}>Fechar mês</Botao>
      </div>
      {fechamentos.isPending ? (
        <Carregando />
      ) : (
        <Tabela
          rotulo="Faturamento mensal"
          itens={lista}
          chave={(f) => f.id}
          aoClicar={setEditando}
          vazio={<EstadoVazio titulo="Nenhum fechamento">Importe a planilha ou feche o mês.</EstadoVazio>}
          colunas={[
            { chave: 'mes', titulo: 'Mês', principal: true, render: (f) => rotuloMes(f.mes) },
            { chave: 'fat', titulo: 'Faturamento (comissões)', alinharDireita: true, render: (f) => formatarDinheiro(f.faturamento) },
            { chave: 'cons', titulo: 'Crédito de consórcio vendido', alinharDireita: true, render: (f) => formatarDinheiro(f.creditoConsorcio) },
          ]}
        />
      )}
      {editando && <FormularioFechamento fechamento={editando === 'novo' ? undefined : editando} aoFechar={() => setEditando(null)} />}
    </>
  );
}

const dinheiro = z.string().refine((v) => !v.trim() || paraCentavos(v) != null, 'Valor inválido.');
const esquema = z.object({ mes: z.string().regex(/^\d{4}-\d{2}$/, 'Escolha o mês.'), faturamento: dinheiro, creditoConsorcio: dinheiro });
type Valores = z.infer<typeof esquema>;

function FormularioFechamento({ fechamento, aoFechar }: { fechamento?: Fechamento; aoFechar: () => void }) {
  const { fechamentos } = useServicosSeguros();
  const salvar = useSalvar<Fechamento>('fechamentos', fechamentos);
  const { avisar } = useAvisos();
  const { register, handleSubmit, formState, setError } = useForm<Valores>({
    resolver: zodResolver(esquema),
    defaultValues: {
      mes: fechamento?.mes ?? hojeISO().slice(0, 7),
      faturamento: centavosParaTexto(fechamento?.faturamento),
      creditoConsorcio: centavosParaTexto(fechamento?.creditoConsorcio),
    },
  });
  const enviar = handleSubmit(async (v) => {
    const c = (t: string) => (t.trim() ? (paraCentavos(t) ?? undefined) : undefined);
    try {
      // O id é o mês: fechar o mesmo mês de novo atualiza o registro.
      await salvar.mutateAsync({ ...(fechamento ?? {}), id: v.mes, mes: v.mes, faturamento: c(v.faturamento), creditoConsorcio: c(v.creditoConsorcio) });
      avisar('Fechamento salvo.');
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
      titulo={fechamento ? rotuloMes(fechamento.mes) : 'Fechar mês'}
      aoFechar={aoFechar}
      largura={520}
      rodape={
        <>
          <Botao variante="secundario" onClick={aoFechar}>Cancelar</Botao>
          <Botao type="submit" form="form-fechamento" carregando={formState.isSubmitting}>Salvar</Botao>
        </>
      }
    >
      <form id="form-fechamento" className="grade" onSubmit={enviar} noValidate>
        <Campo rotulo="Mês" obrigatorio erro={erros.mes?.message}><Entrada type="month" readOnly={Boolean(fechamento)} {...register('mes')} /></Campo>
        <Campo rotulo="Faturamento (R$)" erro={erros.faturamento?.message}><Entrada inputMode="decimal" {...register('faturamento')} /></Campo>
        <Campo rotulo="Crédito de consórcio vendido (R$)" erro={erros.creditoConsorcio?.message}><Entrada inputMode="decimal" {...register('creditoConsorcio')} /></Campo>
      </form>
    </Modal>
  );
}
