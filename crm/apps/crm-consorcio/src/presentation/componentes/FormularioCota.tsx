import { zodResolver } from '@hookform/resolvers/zod';
import { aplicarErros, limparVazios, mensagemErro, SeletorResponsavel, useColecao, useSalvar, useUsuario } from '@portella/app-base';
import type { DadosRegistro } from '@portella/core';
import { centavosParaTexto, corresponde, hojeISO, normalizar, paraCentavos } from '@portella/core';
import { AreaTexto, Botao, Campo, Entrada, Modal, Selecao, useAvisos } from '@portella/ui';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { Cota } from '../../domain/cota';
import { ROTULO_STATUS_COTA, STATUS_COTA, TIPOS_BEM } from '../../domain/cota';
import { useCotas, useServicosConsorcio } from '../hooks';

const dinheiro = z.string().refine((v) => !v.trim() || paraCentavos(v) != null, 'Valor inválido.');
const inteiro = z.string().refine((v) => !v.trim() || /^\d+$/.test(v.trim()), 'Número inteiro.');
const esquema = z.object({
  clienteId: z.string().min(1, 'Escolha o cliente.'),
  administradora: z.string().trim().min(1, 'Informe a administradora.'),
  grupo: z.string().trim().min(1, 'Informe o grupo.'),
  cota: z.string().trim().min(1, 'Informe a cota.'),
  tipoBem: z.enum(TIPOS_BEM.map((t) => t.id) as [Cota['tipoBem'], ...Cota['tipoBem'][]]),
  valorCredito: dinheiro.refine((v) => v.trim() !== '', 'Informe o crédito.'),
  prazoMeses: inteiro.refine((v) => v.trim() !== '', 'Informe o prazo.'),
  valorParcela: dinheiro,
  dataAdesao: z.string().min(1, 'Informe a data.'),
  parcelasPagas: inteiro,
  status: z.enum(STATUS_COTA),
  dataContemplacao: z.string(),
  formaContemplacao: z.enum(['sorteio', 'lance']),
  observacoes: z.string(),
  responsavelId: z.string().optional(),
});
type Valores = z.infer<typeof esquema>;

export function FormularioCota({ cota, clienteId, aoFechar }: { cota?: Cota; clienteId?: string; aoFechar: () => void }) {
  const usuario = useUsuario();
  const { cotas, clientes } = useServicosConsorcio();
  const { data: listaClientes = [] } = useColecao('clientes', clientes);
  const { data: todasCotas = [] } = useCotas();
  const salvar = useSalvar('cotas', cotas);
  const { avisar } = useAvisos();
  const [filtro, setFiltro] = useState('');
  const administradoras = useMemo(() => [...new Set(todasCotas.map((c) => c.administradora))].sort(), [todasCotas]);
  const clienteFixo = Boolean(clienteId && !cota);

  const { register, handleSubmit, formState, setError, watch } = useForm<Valores>({
    resolver: zodResolver(esquema),
    defaultValues: {
      clienteId: cota?.clienteId ?? clienteId ?? '',
      administradora: cota?.administradora ?? '',
      grupo: cota?.grupo ?? '',
      cota: cota?.cota ?? '',
      tipoBem: cota?.tipoBem ?? 'imovel',
      valorCredito: centavosParaTexto(cota?.valorCredito),
      prazoMeses: cota?.prazoMeses ? String(cota.prazoMeses) : '',
      valorParcela: centavosParaTexto(cota?.valorParcela),
      dataAdesao: cota?.dataAdesao ?? hojeISO(),
      parcelasPagas: cota?.parcelasPagas != null ? String(cota.parcelasPagas) : '',
      status: cota?.status ?? 'ativa',
      dataContemplacao: cota?.contemplacao?.data ?? '',
      formaContemplacao: cota?.contemplacao?.forma ?? 'sorteio',
      observacoes: cota?.observacoes ?? '',
      responsavelId: cota?.responsavelId ?? usuario.id,
    },
  });
  const status = watch('status');

  const opcoes = useMemo(
    () =>
      listaClientes
        .filter((c) => corresponde(filtro, c.nome, c.documento) || c.id === cota?.clienteId)
        .sort((a, b) => normalizar(a.nome).localeCompare(normalizar(b.nome)))
        .slice(0, 300),
    [listaClientes, filtro, cota?.clienteId],
  );

  const enviar = handleSubmit(async (v) => {
    const { dataContemplacao, formaContemplacao, ...d } = limparVazios(v);
    const dados: DadosRegistro<Cota> = {
      ...(cota ?? {}),
      ...d,
      valorCredito: paraCentavos(v.valorCredito) ?? 0,
      prazoMeses: Number(v.prazoMeses),
      valorParcela: d.valorParcela ? (paraCentavos(d.valorParcela) ?? undefined) : undefined,
      parcelasPagas: d.parcelasPagas ? Number(d.parcelasPagas) : undefined,
      contemplacao: v.status === 'contemplada' && dataContemplacao ? { data: dataContemplacao, forma: formaContemplacao } : undefined,
    };
    try {
      await salvar.mutateAsync(dados);
      avisar(cota ? 'Cota atualizada.' : 'Cota cadastrada.');
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
      titulo={cota ? `Cota ${cota.grupo}/${cota.cota}` : 'Nova cota'}
      aoFechar={aoFechar}
      rodape={
        <>
          <Botao variante="secundario" onClick={aoFechar}>Cancelar</Botao>
          <Botao type="submit" form="form-cota" carregando={formState.isSubmitting}>Salvar</Botao>
        </>
      }
    >
      <form id="form-cota" className="grade-2" onSubmit={enviar} noValidate>
        {clienteFixo ? (
          <Campo rotulo="Cliente"><Entrada readOnly value={listaClientes.find((c) => c.id === clienteId)?.nome ?? ''} /></Campo>
        ) : (
          <>
            {listaClientes.length > 30 && (
              <Campo rotulo="Filtrar clientes"><Entrada type="search" value={filtro} onChange={(e) => setFiltro(e.target.value)} /></Campo>
            )}
            <Campo rotulo="Cliente" obrigatorio erro={erros.clienteId?.message}>
              <Selecao {...register('clienteId')}>
                <option value="">Escolha…</option>
                {opcoes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </Selecao>
            </Campo>
          </>
        )}
        <Campo rotulo="Administradora" obrigatorio erro={erros.administradora?.message}>
          <Entrada list="administradoras" autoComplete="off" {...register('administradora')} />
        </Campo>
        <datalist id="administradoras">{administradoras.map((a) => <option key={a} value={a} />)}</datalist>
        <Campo rotulo="Grupo" obrigatorio erro={erros.grupo?.message}><Entrada {...register('grupo')} /></Campo>
        <Campo rotulo="Cota" obrigatorio erro={erros.cota?.message}><Entrada {...register('cota')} /></Campo>
        <Campo rotulo="Tipo de bem">
          <Selecao {...register('tipoBem')}>{TIPOS_BEM.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}</Selecao>
        </Campo>
        <Campo rotulo="Crédito (R$)" obrigatorio erro={erros.valorCredito?.message}><Entrada inputMode="decimal" placeholder="0,00" {...register('valorCredito')} /></Campo>
        <Campo rotulo="Prazo (meses)" obrigatorio erro={erros.prazoMeses?.message}><Entrada inputMode="numeric" {...register('prazoMeses')} /></Campo>
        <Campo rotulo="Parcela (R$)" erro={erros.valorParcela?.message}><Entrada inputMode="decimal" placeholder="0,00" {...register('valorParcela')} /></Campo>
        <Campo rotulo="Data de adesão" obrigatorio erro={erros.dataAdesao?.message}><Entrada type="date" {...register('dataAdesao')} /></Campo>
        <Campo rotulo="Parcelas pagas" erro={erros.parcelasPagas?.message}><Entrada inputMode="numeric" {...register('parcelasPagas')} /></Campo>
        <Campo rotulo="Situação">
          <Selecao {...register('status')}>{STATUS_COTA.map((s) => <option key={s} value={s}>{ROTULO_STATUS_COTA[s]}</option>)}</Selecao>
        </Campo>
        {status === 'contemplada' && (
          <>
            <Campo rotulo="Data da contemplação" obrigatorio erro={(erros as Record<string, { message?: string }>).contemplacao?.message}>
              <Entrada type="date" {...register('dataContemplacao')} />
            </Campo>
            <Campo rotulo="Contemplada por">
              <Selecao {...register('formaContemplacao')}>
                <option value="sorteio">Sorteio</option>
                <option value="lance">Lance</option>
              </Selecao>
            </Campo>
          </>
        )}
        <SeletorResponsavel {...register('responsavelId')} />
        <Campo rotulo="Observações" className="span-todo"><AreaTexto {...register('observacoes')} /></Campo>
      </form>
    </Modal>
  );
}
