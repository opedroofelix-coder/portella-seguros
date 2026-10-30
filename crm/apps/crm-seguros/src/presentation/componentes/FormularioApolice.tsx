import { zodResolver } from '@hookform/resolvers/zod';
import {
  aplicarErros,
  EntradaDinheiro,
  exportarPdf,
  limparVazios,
  mensagemErro,
  SeletorResponsavel,
  useColecao,
  useEquipe,
  useRemover,
  useSalvar,
  useSessao,
  useUsuario,
} from '@portella/app-base';
import type { DadosRegistro, TipoNegocio } from '@portella/core';
import {
  corresponde,
  formatarDinheiro,
  hojeISO,
  lerDinheiro,
  normalizar,
  ROTULO_TIPO_NEGOCIO,
  somarMeses,
  textoDinheiro,
  TIPOS_NEGOCIO,
} from '@portella/core';
import { AreaTexto, Botao, Campo, ConfirmarAcao, Entrada, Modal, Selecao, useAvisos } from '@portella/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { formaPagamentoDaApolice, montarChecklist, propostaDaApolice } from '../../application/checklist';
import { renovarApolice } from '../../application/renovacao';
import type { Apolice } from '../../domain/apolice';
import { gerarParcelas, MOTIVOS_CANCELAMENTO, normalizarPlaca, placaValida } from '../../domain/apolice';
import { RAMOS, RAMOS_ANUAIS, RAMOS_VEICULO, SEGURADORAS, seguradorasDoRamo } from '../../domain/catalogo';
import { useServicosSeguros } from '../hooks';
import styles from './FormularioApolice.module.css';

const dinheiro = z.string().refine((v) => !v.trim() || lerDinheiro(v) != null, 'Valor inválido.');
const OUTRO_MOTIVO = 'Outro';
const esquema = z
  .object({
    clienteId: z.string().min(1, 'Escolha o cliente.'),
    seguradora: z.string().min(1, 'Escolha a seguradora.'),
    outraSeguradora: z.string(),
    ramo: z.enum(RAMOS.map((r) => r.id) as [Apolice['ramo'], ...Apolice['ramo'][]]),
    tipo: z.enum(['', ...TIPOS_NEGOCIO]),
    numero: z.string(),
    numeroProposta: z.string(),
    item: z.string(),
    placa: z.string().refine((v) => !v.trim() || placaValida(v), 'Placa inválida (ex.: ABC1D23).'),
    inicioVigencia: z.string().min(1, 'Informe o início.'),
    fimVigencia: z.string(),
    vigenciaEstimada: z.enum(['sim', 'nao']),
    premioTotal: dinheiro,
    quantidadeParcelas: z
      .string()
      .refine((v) => !v.trim() || (/^\d+$/.test(v.trim()) && +v >= 1 && +v <= 24), 'De 1 a 24.'),
    primeiroVencimento: z.string(),
    parcelas: z.array(
      z.object({ valor: dinheiro, vencimento: z.string(), consulta: z.string(), pago: z.boolean() }),
    ),
    status: z.enum(['ativa', 'cancelada']),
    dataCancelamento: z.string(),
    motivoCancelamento: z.string(),
    outroMotivo: z.string(),
    ocorrencias: z.array(
      z.object({
        data: z.string().min(1, 'Data.'),
        descricao: z.string().trim().min(1, 'Descreva.'),
        atuacao: z.string(),
        dataComunicado: z.string(),
        responsavel: z.string(),
      }),
    ),
    observacoes: z.string(),
    responsavelId: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.status !== 'cancelada') return;
    if (!v.dataCancelamento)
      ctx.addIssue({
        code: 'custom',
        path: ['dataCancelamento'],
        message: 'Informe a data do cancelamento.',
      });
    const motivo = v.motivoCancelamento === OUTRO_MOTIVO ? v.outroMotivo.trim() : v.motivoCancelamento;
    if (!motivo)
      ctx.addIssue({
        code: 'custom',
        path: [v.motivoCancelamento === OUTRO_MOTIVO ? 'outroMotivo' : 'motivoCancelamento'],
        message: 'Informe o motivo.',
      });
  });
type Valores = z.infer<typeof esquema>;

const OUTRA = '__outra__';
const parceira = (s?: string) => !s || SEGURADORAS.some((x) => x.id === s);
const motivoDaLista = (m?: string) => !m || (MOTIVOS_CANCELAMENTO as readonly string[]).includes(m);

export interface FormularioApoliceProps {
  apolice?: Apolice;
  /** Dados iniciais de uma apólice nova (cliente fixo, renovação, proposta aprovada…). */
  inicial?: Partial<DadosRegistro<Apolice>>;
  /** Quando informado, salvar registra a renovação desta apólice. */
  renovando?: Apolice;
  aoFechar: () => void;
}

export function FormularioApolice({ apolice, inicial, renovando, aoFechar }: FormularioApoliceProps) {
  const usuario = useUsuario();
  const { apolices, clientes, propostas } = useServicosSeguros();
  const { data: listaClientes = [] } = useColecao('clientes', clientes);
  const { data: listaPropostas = [] } = useColecao('propostas', propostas);
  const { nomeDe } = useEquipe();
  const salvar = useSalvar('apolices', apolices);
  const remover = useRemover('apolices', apolices);
  const { pode } = useSessao();
  const { avisar } = useAvisos();
  const consultas = useQueryClient();
  const [filtroCliente, setFiltroCliente] = useState('');
  const [confirmarRemocao, setConfirmarRemocao] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const base = { ...inicial, ...apolice };
  const hoje = hojeISO();

  const { register, handleSubmit, formState, setError, setValue, getValues, watch, control } =
    useForm<Valores>({
      resolver: zodResolver(esquema),
      defaultValues: {
        clienteId: base.clienteId ?? '',
        seguradora: parceira(base.seguradora) ? (base.seguradora ?? '') : OUTRA,
        outraSeguradora: parceira(base.seguradora) ? '' : (base.seguradora ?? ''),
        ramo: base.ramo ?? 'auto',
        tipo: base.tipo ?? '',
        numero: base.numero ?? '',
        numeroProposta: base.numeroProposta ?? '',
        item: base.item ?? '',
        placa: base.placa ?? '',
        inicioVigencia: base.inicioVigencia ?? hoje,
        fimVigencia: apolice ? (apolice.fimVigencia ?? '') : (base.fimVigencia ?? somarMeses(hoje, 12)),
        vigenciaEstimada: base.vigenciaEstimada ? 'sim' : 'nao',
        premioTotal: textoDinheiro(base.premioTotal),
        quantidadeParcelas: base.quantidadeParcelas == null ? '' : String(base.quantidadeParcelas),
        primeiroVencimento: base.parcelas?.[0]?.vencimento ?? '',
        parcelas: (base.parcelas ?? []).map((p) => ({
          valor: textoDinheiro(p.valor),
          vencimento: p.vencimento ?? '',
          consulta: p.consulta ?? '',
          pago: Boolean(p.pago),
        })),
        status: base.cancelada ? 'cancelada' : 'ativa',
        dataCancelamento: base.dataCancelamento ?? '',
        motivoCancelamento: motivoDaLista(base.motivoCancelamento)
          ? (base.motivoCancelamento ?? '')
          : OUTRO_MOTIVO,
        outroMotivo: motivoDaLista(base.motivoCancelamento) ? '' : (base.motivoCancelamento ?? ''),
        ocorrencias: (base.ocorrencias ?? []).map((o) => ({
          data: o.data,
          descricao: o.descricao,
          atuacao: o.atuacao ?? '',
          dataComunicado: o.dataComunicado ?? '',
          responsavel: o.responsavel ?? '',
        })),
        observacoes: base.observacoes ?? '',
        responsavelId: base.responsavelId ?? usuario.id,
      },
    });
  const parcelasCampos = useFieldArray({ control, name: 'parcelas' });
  const ocorrenciasCampos = useFieldArray({ control, name: 'ocorrencias' });

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

  /** Valores do formulário no formato da apólice (para salvar e para o checklist). */
  const montar = (v: Valores): DadosRegistro<Apolice> => {
    const {
      outraSeguradora,
      vigenciaEstimada,
      primeiroVencimento: _primeiro,
      status,
      outroMotivo,
      parcelas,
      ocorrencias,
      ...d
    } = limparVazios(v);
    const cancelada = status === 'cancelada';
    const parcelasLimpas = (parcelas ?? [])
      .map((p) =>
        limparVazios({
          valor: p.valor ? (lerDinheiro(p.valor) ?? undefined) : undefined,
          vencimento: p.vencimento,
          consulta: p.consulta,
          pago: p.pago || undefined,
        }),
      )
      .filter((p) => Object.values(p).some((x) => x !== undefined));
    return {
      ...(apolice ?? {}),
      ...d,
      seguradora: v.seguradora === OUTRA ? (outraSeguradora ?? '') : v.seguradora,
      tipo: (v.tipo || undefined) as TipoNegocio | undefined,
      placa: RAMOS_VEICULO.has(v.ramo) && d.placa ? normalizarPlaca(d.placa) : undefined,
      fimVigencia: d.fimVigencia,
      vigenciaEstimada: (Boolean(d.fimVigencia) && vigenciaEstimada === 'sim') || undefined,
      premioTotal: d.premioTotal ? (lerDinheiro(d.premioTotal) ?? undefined) : undefined,
      quantidadeParcelas: d.quantidadeParcelas ? Number(d.quantidadeParcelas) : undefined,
      parcelas: parcelasLimpas.length ? parcelasLimpas : undefined,
      cancelada: cancelada || undefined,
      dataCancelamento: cancelada ? d.dataCancelamento : undefined,
      motivoCancelamento: cancelada
        ? v.motivoCancelamento === OUTRO_MOTIVO
          ? outroMotivo?.trim()
          : v.motivoCancelamento
        : undefined,
      ocorrencias: ocorrencias?.length
        ? ocorrencias.map((o) => ({ ...limparVazios(o), data: o.data, descricao: o.descricao.trim() }))
        : undefined,
      renovacao: apolice?.renovacao ?? base.renovacao ?? 'pendente',
    };
  };

  const enviar = handleSubmit(async (v) => {
    const dados = montar(v);
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

  // Forma de pagamento: vem da proposta de mesmo número (decisão de 29/10/2026).
  const numeroProposta = watch('numeroProposta');
  const numeroApolice = watch('numero');
  const proposta = useMemo(
    () =>
      propostaDaApolice(
        { ...(base as Apolice), numeroProposta, numero: numeroApolice, clienteId: watch('clienteId') },
        listaPropostas,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [listaPropostas, numeroProposta, numeroApolice],
  );
  const formaPagamento = formaPagamentoDaApolice(base as Apolice, proposta);

  const gerar = () => {
    const quantidade = Number(getValues('quantidadeParcelas'));
    if (!quantidade || quantidade < 1 || quantidade > 24) {
      setError('quantidadeParcelas', { message: 'Informe de 1 a 24 parcelas.' });
      return;
    }
    const total = lerDinheiro(getValues('premioTotal') ?? '') ?? undefined;
    const primeiro = getValues('primeiroVencimento') || undefined;
    parcelasCampos.replace(
      gerarParcelas(total, quantidade, primeiro).map((p) => ({
        valor: textoDinheiro(p.valor),
        vencimento: p.vencimento ?? '',
        consulta: '',
        pago: false,
      })),
    );
  };
  const somaParcelas = (watch('parcelas') ?? []).reduce((t, p) => t + (lerDinheiro(p.valor ?? '') ?? 0), 0);
  const premioTotal = lerDinheiro(watch('premioTotal') ?? '');

  const baixarChecklist = async () => {
    setGerandoPdf(true);
    try {
      const dados = { ...montar(getValues()), id: apolice?.id ?? 'nova' } as Apolice;
      await exportarPdf(
        montarChecklist(dados, {
          cliente: listaClientes.find((c) => c.id === dados.clienteId),
          proposta,
          nomeDe,
        }),
      );
    } catch (e) {
      avisar(mensagemErro(e), 'erro');
    } finally {
      setGerandoPdf(false);
    }
  };

  const erros = formState.errors;
  const cancelada = watch('status') === 'cancelada';
  return (
    <Modal
      aberto
      largura={880}
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
          <Botao variante="secundario" icone="documento" carregando={gerandoPdf} onClick={baixarChecklist}>
            Checklist (PDF)
          </Botao>
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
        <Campo rotulo="Tipo" dica="Seguro novo, renovação ou endosso.">
          <Selecao {...register('tipo')}>
            <option value="">Escolha…</option>
            {TIPOS_NEGOCIO.map((t) => (
              <option key={t} value={t}>
                {ROTULO_TIPO_NEGOCIO[t]}
              </option>
            ))}
          </Selecao>
        </Campo>
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
        <Campo rotulo="Nº da proposta">
          <Entrada {...register('numeroProposta')} />
        </Campo>
        <Campo rotulo="Nº da apólice">
          <Entrada {...register('numero')} />
        </Campo>
        <Campo
          rotulo={RAMOS_VEICULO.has(ramo) ? 'Modelo do veículo' : 'Bem segurado'}
          dica={RAMOS_VEICULO.has(ramo) ? 'Ex.: Onix 1.0 2022' : 'Endereço do imóvel, aparelho…'}
        >
          <Entrada {...register('item')} />
        </Campo>
        {RAMOS_VEICULO.has(ramo) && (
          <Campo rotulo="Placa" erro={erros.placa?.message}>
            <Entrada
              autoComplete="off"
              placeholder="ABC1D23"
              style={{ textTransform: 'uppercase' }}
              {...register('placa')}
            />
          </Campo>
        )}
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
        <Campo rotulo="Status">
          <Selecao {...register('status')}>
            <option value="ativa">Ativa</option>
            <option value="cancelada">Cancelada</option>
          </Selecao>
        </Campo>
        {cancelada && (
          <>
            <Campo rotulo="Data do cancelamento" obrigatorio erro={erros.dataCancelamento?.message}>
              <Entrada type="date" {...register('dataCancelamento')} />
            </Campo>
            <Campo rotulo="Motivo do cancelamento" obrigatorio erro={erros.motivoCancelamento?.message}>
              <Selecao {...register('motivoCancelamento')}>
                <option value="">Escolha…</option>
                {MOTIVOS_CANCELAMENTO.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </Selecao>
            </Campo>
            {watch('motivoCancelamento') === OUTRO_MOTIVO && (
              <Campo rotulo="Qual motivo?" obrigatorio erro={erros.outroMotivo?.message}>
                <Entrada {...register('outroMotivo')} />
              </Campo>
            )}
          </>
        )}

        <section className={styles.bloco} aria-labelledby="titulo-pagamentos">
          <div className={styles.blocoTitulo}>
            <h3 id="titulo-pagamentos">Acompanhamento dos pagamentos</h3>
          </div>
          <p className={styles.nota}>
            Forma de pagamento: <strong>{formaPagamento ?? 'informe na proposta'}</strong>
            {proposta?.numero ? ` (proposta nº ${proposta.numero})` : ''}
          </p>
          <div className="grade-3">
            <Campo
              rotulo="Prêmio total"
              dica="Com IOF e juros do parcelamento."
              erro={erros.premioTotal?.message}
            >
              <EntradaDinheiro {...register('premioTotal')} />
            </Campo>
            <Campo rotulo="Quantidade de parcelas" erro={erros.quantidadeParcelas?.message}>
              <Entrada
                type="number"
                inputMode="numeric"
                min={1}
                max={24}
                {...register('quantidadeParcelas')}
              />
            </Campo>
            <Campo rotulo="1º vencimento">
              <Entrada type="date" {...register('primeiroVencimento')} />
            </Campo>
          </div>
          <div className={styles.acoesBloco}>
            <Botao pequeno variante="secundario" icone="calendario" onClick={gerar}>
              {parcelasCampos.fields.length ? 'Gerar parcelas de novo' : 'Gerar parcelas'}
            </Botao>
            <Botao
              pequeno
              variante="fantasma"
              icone="mais"
              onClick={() => parcelasCampos.append({ valor: '', vencimento: '', consulta: '', pago: false })}
            >
              Adicionar parcela
            </Botao>
          </div>
          {parcelasCampos.fields.map((campo, i) => (
            <div key={campo.id} className={`${styles.linha} ${styles.linhaParcela}`}>
              <p className={styles.numeroParcela}>{i + 1}ª</p>
              <Campo rotulo="Valor" erro={erros.parcelas?.[i]?.valor?.message}>
                <EntradaDinheiro {...register(`parcelas.${i}.valor`)} />
              </Campo>
              <Campo rotulo="Vencimento">
                <Entrada type="date" {...register(`parcelas.${i}.vencimento`)} />
              </Campo>
              <Campo
                rotulo="Data da consulta"
                dica={i === 0 ? 'Quando conferiu a baixa na seguradora.' : undefined}
              >
                <Entrada type="date" {...register(`parcelas.${i}.consulta`)} />
              </Campo>
              <label className={styles.pago}>
                <input type="checkbox" {...register(`parcelas.${i}.pago`)} />
                Pago
              </label>
              <Botao variante="fantasma" soIcone icone="lixeira" onClick={() => parcelasCampos.remove(i)}>
                {`Remover parcela ${i + 1}`}
              </Botao>
            </div>
          ))}
          {parcelasCampos.fields.length > 0 && premioTotal != null && (
            <p className={`${styles.nota} ${somaParcelas > premioTotal ? styles.alerta : ''}`} role="status">
              Soma das parcelas: {formatarDinheiro(somaParcelas)} de {formatarDinheiro(premioTotal)}
              {somaParcelas > premioTotal ? ' · passa do prêmio total.' : ''}
            </p>
          )}
        </section>

        <section className={styles.bloco} aria-labelledby="titulo-ocorrencias">
          <div className={styles.blocoTitulo}>
            <h3 id="titulo-ocorrencias">Ocorrências</h3>
            <Botao
              pequeno
              variante="secundario"
              icone="mais"
              onClick={() =>
                ocorrenciasCampos.append({
                  data: hojeISO(),
                  descricao: '',
                  atuacao: '',
                  dataComunicado: '',
                  responsavel: usuario.nome,
                })
              }
            >
              Adicionar ocorrência
            </Botao>
          </div>
          {!ocorrenciasCampos.fields.length && (
            <p className={styles.nota}>Atraso de parcela, aviso ao cliente, endosso, sinistro…</p>
          )}
          {ocorrenciasCampos.fields.map((campo, i) => (
            <div key={campo.id} className={`${styles.linha} ${styles.linhaOcorrencia}`}>
              {/* Duas linhas: datas e responsável em cima; descrição e atuação embaixo, com espaço para o texto. */}
              <Campo rotulo="Data" erro={erros.ocorrencias?.[i]?.data?.message}>
                <Entrada type="date" {...register(`ocorrencias.${i}.data`)} />
              </Campo>
              <Campo rotulo="Data do comunicado">
                <Entrada type="date" {...register(`ocorrencias.${i}.dataComunicado`)} />
              </Campo>
              <Campo rotulo="Responsável">
                <Entrada {...register(`ocorrencias.${i}.responsavel`)} />
              </Campo>
              <Botao variante="fantasma" soIcone icone="lixeira" onClick={() => ocorrenciasCampos.remove(i)}>
                {`Remover ocorrência ${i + 1}`}
              </Botao>
              <Campo
                rotulo="Descrição"
                className={styles.descricao}
                erro={erros.ocorrencias?.[i]?.descricao?.message}
              >
                <Entrada {...register(`ocorrencias.${i}.descricao`)} />
              </Campo>
              <Campo rotulo="Atuação" className={styles.atuacao}>
                <Entrada {...register(`ocorrencias.${i}.atuacao`)} />
              </Campo>
            </div>
          ))}
        </section>

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
