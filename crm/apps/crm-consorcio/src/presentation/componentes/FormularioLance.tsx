import { zodResolver } from '@hookform/resolvers/zod';
import {
  aplicarErros,
  limparVazios,
  mensagemErro,
  useColecao,
  useIndice,
  useSalvar,
} from '@portella/app-base';
import { centavosParaTexto, paraCentavos, somarDias, hojeISO } from '@portella/core';
import { AreaTexto, Botao, Campo, Entrada, Modal, Selecao, useAvisos } from '@portella/ui';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { identificacaoCota } from '../../domain/cota';
import type { Lance } from '../../domain/lance';
import { ROTULO_TIPO_LANCE, TIPOS_LANCE } from '../../domain/lance';
import { useCotas, useServicosConsorcio } from '../hooks';

const esquema = z.object({
  cotaId: z.string().min(1, 'Escolha a cota.'),
  assembleia: z.string().min(1, 'Informe a data.'),
  tipo: z.enum(TIPOS_LANCE),
  percentual: z.string().refine((v) => !v.trim() || paraCentavos(v) != null, 'Percentual inválido.'),
  valor: z.string().refine((v) => !v.trim() || paraCentavos(v) != null, 'Valor inválido.'),
  observacoes: z.string(),
});
type Valores = z.infer<typeof esquema>;

export function FormularioLance({ lance, aoFechar }: { lance?: Lance; aoFechar: () => void }) {
  const { lances, clientes } = useServicosConsorcio();
  const { data: cotas = [] } = useCotas();
  const { data: listaClientes } = useColecao('clientes', clientes);
  const indice = useIndice(listaClientes);
  const salvar = useSalvar('lances', lances);
  const { avisar } = useAvisos();
  const ativas = cotas.filter((c) => c.status === 'ativa' || c.id === lance?.cotaId);

  const { register, handleSubmit, formState, setError } = useForm<Valores>({
    resolver: zodResolver(esquema),
    defaultValues: {
      cotaId: lance?.cotaId ?? '',
      assembleia: lance?.assembleia ?? somarDias(hojeISO(), 7),
      tipo: lance?.tipo ?? 'livre',
      percentual: lance?.percentual != null ? String(lance.percentual).replace('.', ',') : '',
      valor: centavosParaTexto(lance?.valor),
      observacoes: lance?.observacoes ?? '',
    },
  });

  const enviar = handleSubmit(async (v) => {
    const d = limparVazios(v);
    try {
      await salvar.mutateAsync({
        ...(lance ?? { resultado: 'aguardando' as const }),
        ...d,
        percentual: d.percentual ? (paraCentavos(d.percentual) ?? 0) / 100 : undefined,
        valor: d.valor ? (paraCentavos(d.valor) ?? undefined) : undefined,
        // O lance pertence ao responsável pela cota.
        responsavelId: lance?.responsavelId ?? cotas.find((c) => c.id === v.cotaId)?.responsavelId,
      });
      avisar(lance ? 'Lance atualizado.' : 'Lance registrado.');
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
      titulo={lance ? 'Editar lance' : 'Novo lance'}
      aoFechar={aoFechar}
      rodape={
        <>
          <Botao variante="secundario" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" form="form-lance" carregando={formState.isSubmitting}>
            Salvar
          </Botao>
        </>
      }
    >
      <form id="form-lance" className="grade-2" onSubmit={enviar} noValidate>
        <Campo rotulo="Cota" obrigatorio erro={erros.cotaId?.message} className="span-todo">
          <Selecao {...register('cotaId')}>
            <option value="">Escolha…</option>
            {ativas.map((c) => (
              <option
                key={c.id}
                value={c.id}
              >{`${indice.get(c.clienteId)?.nome ?? '—'} · ${c.administradora} ${identificacaoCota(c)}`}</option>
            ))}
          </Selecao>
        </Campo>
        <Campo rotulo="Assembleia" obrigatorio erro={erros.assembleia?.message}>
          <Entrada type="date" {...register('assembleia')} />
        </Campo>
        <Campo rotulo="Tipo">
          <Selecao {...register('tipo')}>
            {TIPOS_LANCE.map((t) => (
              <option key={t} value={t}>
                {ROTULO_TIPO_LANCE[t]}
              </option>
            ))}
          </Selecao>
        </Campo>
        <Campo rotulo="Percentual do crédito (%)" erro={erros.percentual?.message}>
          <Entrada inputMode="decimal" {...register('percentual')} />
        </Campo>
        <Campo rotulo="Valor (R$)" erro={erros.valor?.message}>
          <Entrada inputMode="decimal" placeholder="0,00" {...register('valor')} />
        </Campo>
        <Campo rotulo="Observações" className="span-todo">
          <AreaTexto {...register('observacoes')} />
        </Campo>
      </form>
    </Modal>
  );
}
