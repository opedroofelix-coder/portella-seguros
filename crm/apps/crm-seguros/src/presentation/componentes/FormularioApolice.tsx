import { zodResolver } from '@hookform/resolvers/zod';
import {
  aplicarErros,
  EntradaDinheiro,
  EntradaPercentual,
  limparVazios,
  mensagemErro,
  SeletorResponsavel,
  useColecao,
  useRemover,
  useSalvar,
  useSessao,
  useUsuario,
} from '@portella/app-base';
import type { DadosRegistro } from '@portella/core';
import {
  corresponde,
  formatarDinheiro,
  hojeISO,
  lerDinheiro,
  normalizar,
  porcentagem,
  somarMeses,
  textoDinheiro,
} from '@portella/core';
import { AreaTexto, Botao, Campo, ConfirmarAcao, Entrada, Modal, Selecao, useAvisos } from '@portella/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { renovarApolice } from '../../application/renovacao';
import type { Apolice } from '../../domain/apolice';
import { ROTULO_RENOVACAO, STATUS_RENOVACAO } from '../../domain/apolice';
import { RAMOS, RAMOS_ANUAIS, SEGURADORAS, seguradorasDoRamo } from '../../domain/catalogo';
import { useServicosSeguros } from '../hooks';

const dinheiro = z.string().refine((v) => !v.trim() || lerDinheiro(v) != null, 'Valor inválido.');
const esquema = z.object({
  clienteId: z.string().min(1, 'Escolha o cliente.'),
  seguradora: z.string().min(1, 'Escolha a seguradora.'),
  outraSeguradora: z.string(),
  ramo: z.enum(RAMOS.map((r) => r.id) as [Apolice['ramo'], ...Apolice['ramo'][]]),
  numero: z.string(),
  item: z.string(),
  inicioVigencia: z.string().min(1, 'Informe o início.'),
  fimVigencia: z.string(),
  vigenciaEstimada: z.enum(['sim', 'nao']),
  premioLiquido: dinheiro,
  premioTotal: dinheiro,
  comissaoPercentual: z
    .string()
    .refine((v) => !v.trim() || lerDinheiro(v) != null, 'Percentual inválido.')
    .refine(
      (v) => !v.trim() || ((lerDinheiro(v) ?? 0) >= 0 && (lerDinheiro(v) ?? 0) <= 10000),
      'Entre 0 e 100%.',
    ),
  formaPagamento: z.string(),
  renovacao: z.enum(STATUS_RENOVACAO),
  cancelada: z.boolean(),
  observacoes: z.string(),
  responsavelId: z.string().optional(),
});
type Valores = z.infer<typeof esquema>;

const OUTRA = '__outra__';
const parceira = (s?: string) => !s || SEGURADORAS.some((x) => x.id === s);

export interface FormularioApoliceProps {
  apolice?: Apolice;
  /** Dados iniciais de uma apólice nova (cliente fixo, renovação…). */
  inicial?: Partial<DadosRegistro<Apolice>>;
  /** Quando informado, salvar registra a renovação desta apólice. */
  renovando?: Apolice;
  aoFechar: () => void;
}

export function FormularioApolice({ apolice, inicial, renovando, aoFechar }: FormularioApoliceProps) {
  const usuario = useUsuario();
  const { apolices, clientes } = useServicosSeguros();
  const { data: listaClientes = [] } = useColecao('clientes', clientes);
  const salvar = useSalvar('apolices', apolices);
  const remover = useRemover('apolices', apolices);
  const { pode } = useSessao();
  const { avisar } = useAvisos();
  const consultas = useQueryClient();
  const [filtroCliente, setFiltroCliente] = useState('');
  const [confirmarRemocao, setConfirmarRemocao] = useState(false);
  const base = { ...inicial, ...apolice };
  const hoje = hojeISO();

  const { register, handleSubmit, formState, setError, setValue, getValues, watch } = useForm<Valores>({
    resolver: zodResolver(esquema),
    defaultValues: {
      clienteId: base.clienteId ?? '',
      seguradora: parceira(base.seguradora) ? (base.seguradora ?? '') : OUTRA,
      outraSeguradora: parceira(base.seguradora) ? '' : (base.seguradora ?? ''),
      ramo: base.ramo ?? 'auto',
      numero: base.numero ?? '',
      item: base.item ?? '',
      inicioVigencia: base.inicioVigencia ?? hoje,
      fimVigencia: apolice ? (apolice.fimVigencia ?? '') : (base.fimVigencia ?? somarMeses(hoje, 12)),
      vigenciaEstimada: base.vigenciaEstimada ? 'sim' : 'nao',
      premioLiquido: textoDinheiro(base.premioLiquido),
      premioTotal: textoDinheiro(base.premioTotal),
      comissaoPercentual:
        base.comissaoPercentual == null ? '' : String(base.comissaoPercentual).replace('.', ','),
      formaPagamento: base.formaPagamento ?? '',
      renovacao: base.renovacao ?? 'pendente',
      cancelada: base.cancelada ?? false,
      observacoes: base.observacoes ?? '',
      responsavelId: base.responsavelId ?? usuario.id,
    },
  });

  // Ramo contínuo (vida, saúde…) fica sem fim de vigência; ramo anual sugere 12 meses.
  const ramo = watch('ramo');
  const ramoAnterior = useRef(ramo);
  useEffect(() => {
    if (ramoAnterior.current === ramo) return;
    ramoAnterior.current = ramo;
    if (!RAMOS_ANUAIS.has(ramo)) setValue('fimVigencia', '', { shouldDirty: true });
    else if (!getValues('fimVigencia') && getValues('inicioVigencia')) {
      setValue('fimVigencia', somarMeses(getValues('inicioVigencia'), 12), { shouldDirty: true });
    }
    const seguradora = getValues('seguradora');
    if (seguradora && seguradora !== OUTRA && !seguradorasDoRamo(ramo).some((s) => s.id === seguradora)) {
      setValue('seguradora', '', { shouldDirty: true });
    }
  }, [ramo, getValues, setValue]);

  const premio = lerDinheiro(watch('premioLiquido') ?? '');
  const percentual = lerDinheiro(watch('comissaoPercentual') ?? '');
  const comissaoPrevista =
    premio != null && percentual != null ? porcentagem(premio, percentual / 100) : null;

  const clienteFixo = Boolean(inicial?.clienteId && !apolice);
  const opcoesClientes = useMemo(
    () =>
      listaClientes
        .filter((c) => corresponde(filtroCliente, c.nome, c.documento) || c.id === watch('clienteId'))
        .sort((a, b) => normalizar(a.nome).localeCompare(normalizar(b.nome)))
        .slice(0, 300),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [listaClientes, filtroCliente],
  );

  const enviar = handleSubmit(async (v) => {
    const { outraSeguradora, vigenciaEstimada, ...d } = limparVazios(v);
    const dados: DadosRegistro<Apolice> = {
      ...(apolice ?? {}),
      ...d,
      seguradora: v.seguradora === OUTRA ? (outraSeguradora ?? '') : v.seguradora,
      fimVigencia: d.fimVigencia,
      vigenciaEstimada: (Boolean(d.fimVigencia) && vigenciaEstimada === 'sim') || undefined,
      premioLiquido: d.premioLiquido ? (lerDinheiro(d.premioLiquido) ?? undefined) : undefined,
      premioTotal: d.premioTotal ? (lerDinheiro(d.premioTotal) ?? undefined) : undefined,
      comissaoPercentual: d.comissaoPercentual ? (lerDinheiro(d.comissaoPercentual) ?? 0) / 100 : undefined,
    };
    try {
      if (renovando) {
        await renovarApolice(apolices, usuario, renovando, dados);
        await consultas.invalidateQueries({ queryKey: ['apolices'] });
      } else {
        await salvar.mutateAsync(dados);
      }
      avisar(renovando ? 'Renovação registrada.' : apolice ? 'Apólice atualizada.' : 'Apólice cadastrada.');
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
      titulo={renovando ? 'Renovar apólice' : apolice ? 'Editar apólice' : 'Nova apólice'}
      aoFechar={aoFechar}
      alterado={formState.isDirty}
      bloqueado={formState.isSubmitting}
      rodape={
        <>
          {apolice && pode('registro:remover') && (
            <Botao variante="perigo" icone="lixeira" onClick={() => setConfirmarRemocao(true)}>
              Excluir
            </Botao>
          )}
          <Botao variante="secundario" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" form="form-apolice" carregando={formState.isSubmitting}>
            {renovando ? 'Registrar renovação' : 'Salvar'}
          </Botao>
        </>
      }
    >
      <form id="form-apolice" className="grade-2" onSubmit={enviar} noValidate>
        {!clienteFixo && listaClientes.length > 30 && (
          <Campo rotulo="Filtrar clientes">
            <Entrada
              type="search"
              placeholder="Nome ou CPF"
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
            />
          </Campo>
        )}
        {clienteFixo ? (
          <Campo rotulo="Cliente">
            <Entrada value={listaClientes.find((c) => c.id === inicial?.clienteId)?.nome ?? ''} readOnly />
          </Campo>
        ) : (
          <Campo rotulo="Cliente" obrigatorio erro={erros.clienteId?.message}>
            <Selecao {...register('clienteId')}>
              <option value="">Escolha…</option>
              {opcoesClientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </Selecao>
          </Campo>
        )}
        <Campo rotulo="Seguradora" obrigatorio erro={erros.seguradora?.message}>
          <Selecao {...register('seguradora')}>
            <option value="">Escolha…</option>
            {seguradorasDoRamo(ramo).map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
            <option value={OUTRA}>Outra…</option>
          </Selecao>
        </Campo>
        {watch('seguradora') === OUTRA && (
          <Campo rotulo="Nome da seguradora" obrigatorio erro={erros.seguradora?.message}>
            <Entrada {...register('outraSeguradora')} />
          </Campo>
        )}
        <Campo
          rotulo="Ramo"
          obrigatorio
          erro={erros.ramo?.message}
          dica={ramo === 'equipamentos' ? 'Bike, celular, câmera, notebook…' : undefined}
        >
          <Selecao {...register('ramo')}>
            {RAMOS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nome}
              </option>
            ))}
          </Selecao>
        </Campo>
        <Campo rotulo="Nº da apólice">
          <Entrada {...register('numero')} />
        </Campo>
        <Campo rotulo="Bem segurado" dica="Placa e modelo, endereço do imóvel…">
          <Entrada {...register('item')} />
        </Campo>
        <Campo rotulo="Início da vigência" obrigatorio erro={erros.inicioVigencia?.message}>
          <Entrada type="date" {...register('inicioVigencia')} />
        </Campo>
        <Campo
          rotulo="Fim da vigência"
          dica={
            RAMOS_ANUAIS.has(ramo)
              ? 'Em geral, 12 meses depois do início.'
              : 'Contrato contínuo: deixe em branco para não entrar na fila de renovação.'
          }
          erro={erros.fimVigencia?.message}
        >
          <Entrada
            type="date"
            {...register('fimVigencia', {
              // Quem digita o fim confirma a vigência que a importação estimou.
              onChange: () => base.vigenciaEstimada && setValue('vigenciaEstimada', 'nao'),
            })}
          />
        </Campo>
        {base.vigenciaEstimada && (
          <Campo rotulo="Vigência" dica="Calculada na importação (proposta + 12 meses).">
            <Selecao {...register('vigenciaEstimada')}>
              <option value="sim">Estimada — confirmar</option>
              <option value="nao">Confirmada</option>
            </Selecao>
          </Campo>
        )}
        <Campo rotulo="Prêmio líquido" erro={erros.premioLiquido?.message}>
          <EntradaDinheiro {...register('premioLiquido')} />
        </Campo>
        <Campo
          rotulo="Prêmio total"
          dica="Com IOF e juros do parcelamento."
          erro={erros.premioTotal?.message}
        >
          <EntradaDinheiro {...register('premioTotal')} />
        </Campo>
        <Campo
          rotulo="Comissão"
          erro={erros.comissaoPercentual?.message}
          dica={
            comissaoPrevista != null
              ? `Comissão prevista: ${formatarDinheiro(comissaoPrevista)}`
              : 'Sobre o prêmio líquido.'
          }
        >
          <EntradaPercentual placeholder="Ex.: 15" {...register('comissaoPercentual')} />
        </Campo>
        <Campo rotulo="Forma de pagamento">
          <Entrada placeholder="Ex.: 10x no cartão" {...register('formaPagamento')} />
        </Campo>
        {!renovando && (
          <Campo rotulo="Renovação">
            <Selecao {...register('renovacao')}>
              {STATUS_RENOVACAO.map((s) => (
                <option key={s} value={s}>
                  {ROTULO_RENOVACAO[s]}
                </option>
              ))}
            </Selecao>
          </Campo>
        )}
        {apolice && (
          <Campo rotulo="Cancelamento">
            <Selecao {...register('cancelada', { setValueAs: (v) => v === true || v === 'true' })}>
              <option value="false">Não cancelada</option>
              <option value="true">Cancelada</option>
            </Selecao>
          </Campo>
        )}
        <SeletorResponsavel {...register('responsavelId')} />
        <Campo rotulo="Observações" className="span-todo">
          <AreaTexto {...register('observacoes')} />
        </Campo>
      </form>
      {apolice && (
        <ConfirmarAcao
          aberto={confirmarRemocao}
          titulo="Excluir a apólice?"
          mensagem={`A apólice ${apolice.numero ? `nº ${apolice.numero} ` : ''}sai da carteira e da fila de renovação. Não dá para desfazer.`}
          textoConfirmar="Excluir apólice"
          perigo
          carregando={remover.isPending}
          aoCancelar={() => setConfirmarRemocao(false)}
          aoConfirmar={() =>
            remover.mutate(apolice.id, {
              onSuccess: () => {
                avisar('Apólice excluída.');
                setConfirmarRemocao(false);
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
