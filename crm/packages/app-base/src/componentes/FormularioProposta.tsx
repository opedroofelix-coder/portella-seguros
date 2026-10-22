import { zodResolver } from '@hookform/resolvers/zod';
import type { DadosRegistro, Proposta, TipoNegocio } from '@portella/core';
import {
  centavosParaTexto,
  comissaoCalculada,
  formatarData,
  formatarDinheiro,
  hojeISO,
  marcarVitalicios,
  paraCentavos,
  recebidoTotal,
  repassePrevisto,
  ROTULO_STATUS_PROPOSTA,
  ROTULO_TIPO_NEGOCIO,
  saldoReceber,
  valorVitalicio,
} from '@portella/core';
import {
  AreaTexto,
  Botao,
  Campo,
  ConfirmarAcao,
  Entrada,
  Modal,
  Selecao,
  Selo,
  useAvisos,
} from '@portella/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { aplicarErros, mensagemErro } from '../erros';
import { useCatalogo, useColecao, useEquipe } from '../hooks/dados';
import { useServicos } from '../servicos';
import { useSessao, useUsuario } from '../sessao/Sessao';
import styles from './FormularioProposta.module.css';

const valor = z.string().refine((v) => !v.trim() || paraCentavos(v) != null, 'Valor inválido.');
const pct = (max: number) =>
  z
    .string()
    .refine(
      (v) => !v.trim() || (paraCentavos(v) != null && paraCentavos(v)! >= 0 && paraCentavos(v)! <= max * 100),
      `Entre 0 e ${max}.`,
    );

const esquema = z.object({
  clienteNome: z.string().trim().min(2, 'Informe o nome completo do cliente.'),
  numero: z.string(),
  data: z.string().min(1, 'Informe a data.'),
  companhia: z.string().trim().min(1, 'Informe a seguradora.'),
  produto: z.string().trim().min(1, 'Informe o produto.'),
  tipoNegocio: z.enum(['novo', 'renovacao', '']),
  premioLiquido: valor,
  comissaoPercentual: pct(1000),
  comissaoReceber: valor,
  regra: z.enum(['normal', 'vitalicio']),
  percentualVitalicio: pct(100),
  produtores: z.array(
    z.object({
      produtorId: z.string().min(1, 'Escolha o produtor.'),
      percentual: pct(100).refine((v) => v.trim() !== '', 'Informe o %.'),
    }),
  ),
  recebimentos: z.array(
    z.object({
      id: z.string(),
      data: z.string().min(1, 'Data.'),
      valor: valor.refine((v) => v.trim() !== '', 'Valor.'),
      parcela: z.string(),
      repasses: z.any().optional(),
    }),
  ),
  observacoes: z.string(),
});
type Valores = z.infer<typeof esquema>;

const numero = (t: string) => (t.trim() ? (paraCentavos(t) ?? 0) / 100 : undefined);
const centavos = (t: string) => (t.trim() ? (paraCentavos(t) ?? undefined) : undefined);
const textoPct = (n?: number) => (n == null ? '' : String(n).replace('.', ','));

function iniciais(
  p: Proposta | undefined,
  usuarioId: string,
  percentualPadrao?: number,
  ehProdutor?: boolean,
): Valores {
  return {
    clienteNome: p?.clienteNome ?? '',
    numero: p?.numero ?? '',
    data: p?.data ?? hojeISO(),
    companhia: p?.companhia ?? '',
    produto: p?.produto ?? '',
    tipoNegocio: p?.tipoNegocio ?? '',
    premioLiquido: centavosParaTexto(p?.premioLiquido),
    comissaoPercentual: textoPct(p?.comissaoPercentual),
    comissaoReceber: centavosParaTexto(p?.comissaoReceber),
    regra: p?.percentualVitalicio != null ? 'vitalicio' : 'normal',
    percentualVitalicio: textoPct(p?.percentualVitalicio),
    produtores: p
      ? p.produtores.map((x) => ({ produtorId: x.produtorId, percentual: textoPct(x.percentual) }))
      : ehProdutor
        ? [{ produtorId: usuarioId, percentual: textoPct(percentualPadrao) }]
        : [],
    recebimentos: (p?.recebimentos ?? []).map((r) => ({
      id: r.id,
      data: r.data,
      valor: centavosParaTexto(r.valor),
      parcela: r.parcela ?? '',
      repasses: r.repasses,
    })),
    observacoes: p?.observacoes ?? '',
  };
}

export function FormularioProposta({ proposta, aoFechar }: { proposta?: Proposta; aoFechar: () => void }) {
  const usuario = useUsuario();
  const { propostas, clientes } = useServicos();
  const { pode } = useSessao();
  const { equipe, nomeDe } = useEquipe();
  const { data: listaClientes = [] } = useColecao('clientes', clientes);
  const produtos = useCatalogo('produtos');
  const seguradoras = useCatalogo('seguradoras');
  const consultas = useQueryClient();
  const { avisar } = useAvisos();
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  const gestao = pode('financeiro:gerenciar');
  const somenteLeitura = Boolean(
    proposta && !gestao && (proposta.status !== 'pendente' || proposta.responsavelId !== usuario.id),
  );
  const podeExcluir =
    proposta && (gestao || (proposta.status === 'pendente' && proposta.responsavelId === usuario.id));

  const { register, handleSubmit, formState, setError, watch, control, setValue } = useForm<Valores>({
    resolver: zodResolver(esquema),
    defaultValues: iniciais(proposta, usuario.id, usuario.percentualRepasse, usuario.perfil === 'corretor'),
  });
  const produtoresCampos = useFieldArray({ control, name: 'produtores' });
  const recebimentosCampos = useFieldArray({ control, name: 'recebimentos' });
  const v = watch();

  // Comissão a receber: o valor digitado, ou prêmio × % quando o campo fica em branco.
  const calculada = comissaoCalculada(centavos(v.premioLiquido), numero(v.comissaoPercentual));
  const comissaoReceber = centavos(v.comissaoReceber) ?? calculada ?? 0;
  const previa: Pick<Proposta, 'comissaoReceber' | 'recebimentos' | 'premioLiquido' | 'percentualVitalicio'> =
    {
      comissaoReceber,
      premioLiquido: centavos(v.premioLiquido),
      percentualVitalicio: v.regra === 'vitalicio' ? numero(v.percentualVitalicio) : undefined,
      recebimentos: v.recebimentos.map((r) => ({
        id: r.id,
        data: r.data || hojeISO(),
        valor: centavos(r.valor) ?? 0,
      })),
    };
  const ativos = useMemo(() => equipe.filter((u) => u.ativo), [equipe]);

  const montar = (valores: Valores): DadosRegistro<Proposta> => {
    const base: DadosRegistro<Proposta> = {
      ...(proposta ?? {}),
      status: proposta?.status ?? 'pendente',
      clienteNome: valores.clienteNome.trim(),
      clienteId:
        listaClientes.find((c) => c.nome.trim().toLowerCase() === valores.clienteNome.trim().toLowerCase())
          ?.id ?? proposta?.clienteId,
      numero: valores.numero.trim() || undefined,
      data: valores.data,
      companhia: valores.companhia.trim(),
      produto: valores.produto.trim(),
      tipoNegocio: (valores.tipoNegocio || undefined) as TipoNegocio | undefined,
      premioLiquido: centavos(valores.premioLiquido),
      comissaoPercentual: numero(valores.comissaoPercentual),
      comissaoReceber,
      percentualVitalicio: valores.regra === 'vitalicio' ? numero(valores.percentualVitalicio) : undefined,
      produtores: valores.produtores.map((x) => ({
        produtorId: x.produtorId,
        percentual: numero(x.percentual) ?? 0,
      })),
      recebimentos: valores.recebimentos.map((r) => ({
        id: r.id || crypto.randomUUID(),
        data: r.data,
        valor: centavos(r.valor) ?? 0,
        ...(r.parcela.trim() ? { parcela: r.parcela.trim() } : {}),
        ...(r.repasses ? { repasses: r.repasses } : {}),
      })),
      observacoes: valores.observacoes.trim() || undefined,
    };
    return { ...base, recebimentos: marcarVitalicios({ ...base, recebimentos: base.recebimentos }) };
  };

  const salvar = useMutation({
    mutationFn: async ({ valores, aprovar }: { valores: Valores; aprovar: boolean }) => {
      const salva = await propostas.salvar(usuario, montar(valores));
      return aprovar && salva.status === 'pendente' ? propostas.aprovar(usuario, salva.id) : salva;
    },
    onSuccess: async (p, { aprovar }) => {
      await consultas.invalidateQueries({ queryKey: ['propostas'] });
      avisar(
        aprovar
          ? 'Proposta aprovada.'
          : p.status === 'pendente'
            ? 'Proposta enviada para aprovação.'
            : 'Proposta salva.',
      );
      aoFechar();
    },
    onError: (e) => {
      aplicarErros(e, setError);
      avisar(mensagemErro(e), 'erro');
    },
  });
  const excluir = useMutation({
    mutationFn: () => propostas.remover(usuario, proposta!.id),
    onSuccess: async () => {
      await consultas.invalidateQueries({ queryKey: ['propostas'] });
      avisar('Proposta excluída.');
      aoFechar();
    },
    onError: (e) => avisar(mensagemErro(e), 'erro'),
  });

  const enviar = (aprovar: boolean) => handleSubmit((valores) => salvar.mutate({ valores, aprovar }));
  const erros = formState.errors;
  const titulo = proposta ? `Proposta · ${proposta.clienteNome}` : 'Nova proposta';

  return (
    <>
      <Modal
        aberto
        largura={880}
        titulo={titulo}
        aoFechar={aoFechar}
        rodape={
          <>
            {podeExcluir && (
              <Botao variante="perigo" onClick={() => setConfirmarExclusao(true)}>
                Excluir
              </Botao>
            )}
            <Botao variante="secundario" onClick={aoFechar}>
              {somenteLeitura ? 'Fechar' : 'Cancelar'}
            </Botao>
            {!somenteLeitura && (
              <Botao
                type="submit"
                form="form-proposta"
                variante={gestao && proposta?.status === 'pendente' ? 'secundario' : 'primario'}
                carregando={salvar.isPending}
              >
                {gestao ? 'Salvar' : 'Enviar para aprovação'}
              </Botao>
            )}
            {gestao && proposta?.status === 'pendente' && (
              <Botao onClick={enviar(true)} carregando={salvar.isPending}>
                Aprovar
              </Botao>
            )}
          </>
        }
      >
        <form id="form-proposta" onSubmit={enviar(false)} noValidate>
          <fieldset
            disabled={somenteLeitura}
            className="grade-2"
            style={{ border: 0, padding: 0, margin: 0 }}
          >
            {proposta && (
              <p
                className={styles.aviso}
                style={
                  proposta.status === 'aprovada'
                    ? { borderColor: 'var(--sucesso-borda)', background: 'var(--sucesso-fundo)' }
                    : undefined
                }
              >
                <Selo tom={proposta.status === 'aprovada' ? 'sucesso' : 'alerta'}>
                  {ROTULO_STATUS_PROPOSTA[proposta.status]}
                </Selo>{' '}
                Lançada por {nomeDe(proposta.responsavelId)}
                {proposta.aprovadaEm && ` · aprovada em ${formatarData(proposta.aprovadaEm)}`}
                {somenteLeitura && ' · só a administração altera propostas aprovadas.'}
              </p>
            )}
            <Campo
              rotulo="Nome completo do cliente"
              obrigatorio
              erro={erros.clienteNome?.message}
              className="span-todo"
            >
              <Entrada list="clientes-proposta" autoComplete="off" {...register('clienteNome')} />
            </Campo>
            <datalist id="clientes-proposta">
              {listaClientes.map((c) => (
                <option key={c.id} value={c.nome} />
              ))}
            </datalist>
            <Campo rotulo="Nº da proposta / apólice">
              <Entrada {...register('numero')} />
            </Campo>
            <Campo rotulo="Data da proposta" obrigatorio erro={erros.data?.message}>
              <Entrada type="date" {...register('data')} />
            </Campo>
            <Campo rotulo="Seguradora" obrigatorio erro={erros.companhia?.message}>
              <Entrada list="seguradoras-proposta" autoComplete="off" {...register('companhia')} />
            </Campo>
            <datalist id="seguradoras-proposta">
              {seguradoras.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            <Campo rotulo="Produto" obrigatorio erro={erros.produto?.message}>
              <Entrada list="produtos-proposta" autoComplete="off" {...register('produto')} />
            </Campo>
            <datalist id="produtos-proposta">
              {produtos.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
            <Campo rotulo="Tipo de negócio" dica="Renovação da própria carteira (não de congênere).">
              <Selecao {...register('tipoNegocio')}>
                <option value="">Não informado</option>
                <option value="novo">{ROTULO_TIPO_NEGOCIO.novo}</option>
                <option value="renovacao">{ROTULO_TIPO_NEGOCIO.renovacao}</option>
              </Selecao>
            </Campo>
            <Campo rotulo="Prêmio líquido (R$)" erro={erros.premioLiquido?.message}>
              <Entrada inputMode="decimal" placeholder="0,00" {...register('premioLiquido')} />
            </Campo>
            <Campo
              rotulo="Comissão trabalhada (%)"
              erro={erros.comissaoPercentual?.message}
              dica="Em saúde pode passar de 100% (ex.: 300)."
            >
              <Entrada inputMode="decimal" placeholder="Ex.: 15" {...register('comissaoPercentual')} />
            </Campo>
            <Campo
              rotulo="Comissão a receber (R$)"
              erro={erros.comissaoReceber?.message}
              dica={
                calculada != null
                  ? `Em branco: ${formatarDinheiro(calculada)} (prêmio × %).`
                  : 'Prêmio × % ou o valor combinado.'
              }
            >
              <Entrada
                inputMode="decimal"
                placeholder={calculada != null ? centavosParaTexto(calculada) : '0,00'}
                {...register('comissaoReceber')}
              />
            </Campo>
            <Campo rotulo="Regra de recebimento">
              <Selecao {...register('regra')}>
                <option value="normal">Normal (controle por saldo)</option>
                <option value="vitalicio">Com vitalício depois</option>
              </Selecao>
            </Campo>
            {v.regra === 'vitalicio' && (
              <Campo
                rotulo="% vitalício sobre o prêmio líquido"
                erro={erros.percentualVitalicio?.message}
                dica="Pago depois de quitada a comissão (ex.: 2)."
              >
                <Entrada inputMode="decimal" {...register('percentualVitalicio')} />
              </Campo>
            )}

            <section className={styles.bloco} aria-labelledby="titulo-produtores">
              <div className={styles.blocoTitulo}>
                <h3 id="titulo-produtores">Produtores e repasse</h3>
                <Botao
                  pequeno
                  variante="secundario"
                  icone="mais"
                  onClick={() => produtoresCampos.append({ produtorId: '', percentual: '' })}
                >
                  Produtor
                </Botao>
              </div>
              {!produtoresCampos.fields.length && (
                <p className="texto-suave" style={{ margin: 0 }}>
                  Sem produtor: venda da corretora, sem repasse.
                </p>
              )}
              {produtoresCampos.fields.map((campo, i) => {
                const pctAtual = numero(v.produtores[i]?.percentual ?? '') ?? 0;
                return (
                  <div key={campo.id} className={`${styles.linha} ${styles.linhaProdutor}`}>
                    <Campo rotulo="Produtor" erro={erros.produtores?.[i]?.produtorId?.message}>
                      <Selecao
                        {...register(`produtores.${i}.produtorId`, {
                          onChange: (e) => {
                            const padrao = ativos.find((u) => u.id === e.target.value)?.percentualRepasse;
                            if (padrao != null && !v.produtores[i]?.percentual)
                              setValue(`produtores.${i}.percentual`, textoPct(padrao));
                          },
                        })}
                      >
                        <option value="">Escolha…</option>
                        {ativos.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.nome}
                          </option>
                        ))}
                        {campo.produtorId && !ativos.some((u) => u.id === campo.produtorId) && (
                          <option value={campo.produtorId}>{nomeDe(campo.produtorId)}</option>
                        )}
                      </Selecao>
                    </Campo>
                    <Campo rotulo="Repasse (%)" erro={erros.produtores?.[i]?.percentual?.message}>
                      <Entrada inputMode="decimal" {...register(`produtores.${i}.percentual`)} />
                    </Campo>
                    <p className={styles.previa} aria-live="polite">
                      Receberá {formatarDinheiro(repassePrevisto({ comissaoReceber }, pctAtual))}
                    </p>
                    <Botao
                      variante="fantasma"
                      soIcone
                      icone="lixeira"
                      onClick={() => produtoresCampos.remove(i)}
                    >{`Remover produtor ${i + 1}`}</Botao>
                  </div>
                );
              })}
              {(erros.produtores as { message?: string } | undefined)?.message && (
                <p className="texto-suave" role="alert">
                  {(erros.produtores as { message?: string }).message}
                </p>
              )}
            </section>

            {gestao && (
              <section className={styles.bloco} aria-labelledby="titulo-recebimentos">
                <div className={styles.blocoTitulo}>
                  <h3 id="titulo-recebimentos">Recebimentos da seguradora (baixa)</h3>
                  <Botao
                    pequeno
                    variante="secundario"
                    icone="mais"
                    onClick={() =>
                      recebimentosCampos.append({ id: '', data: hojeISO(), valor: '', parcela: '' })
                    }
                  >
                    Recebimento
                  </Botao>
                </div>
                {!recebimentosCampos.fields.length && (
                  <p className="texto-suave" style={{ margin: 0 }}>
                    Nenhum recebimento lançado.
                  </p>
                )}
                {recebimentosCampos.fields.map((campo, i) => (
                  <div key={campo.id} className={`${styles.linha} ${styles.linhaRecebimento}`}>
                    <Campo rotulo="Data" erro={erros.recebimentos?.[i]?.data?.message}>
                      <Entrada type="date" {...register(`recebimentos.${i}.data`)} />
                    </Campo>
                    <Campo rotulo="Valor (R$)" erro={erros.recebimentos?.[i]?.valor?.message}>
                      <Entrada inputMode="decimal" {...register(`recebimentos.${i}.valor`)} />
                    </Campo>
                    <Campo rotulo="Parcela">
                      <Entrada placeholder="1ª, 6.6, 156…" {...register(`recebimentos.${i}.parcela`)} />
                    </Campo>
                    <Botao
                      variante="fantasma"
                      soIcone
                      icone="lixeira"
                      onClick={() => recebimentosCampos.remove(i)}
                    >{`Remover recebimento ${i + 1}`}</Botao>
                  </div>
                ))}
              </section>
            )}

            <dl className={styles.resumo}>
              <div>
                <dt>Comissão a receber</dt>
                <dd>{formatarDinheiro(comissaoReceber)}</dd>
              </div>
              {gestao && (
                <div>
                  <dt>Recebido</dt>
                  <dd>{formatarDinheiro(recebidoTotal(previa))}</dd>
                </div>
              )}
              {gestao && (
                <div>
                  <dt>Saldo a receber</dt>
                  <dd>{formatarDinheiro(saldoReceber(previa))}</dd>
                </div>
              )}
              {gestao && (
                <div>
                  <dt>Recebimentos</dt>
                  <dd>{v.recebimentos.length}</dd>
                </div>
              )}
              {previa.percentualVitalicio != null && (
                <div>
                  <dt>Vitalício por ciclo</dt>
                  <dd>{formatarDinheiro(valorVitalicio(previa))}</dd>
                </div>
              )}
            </dl>
            <Campo rotulo="Observações" className="span-todo">
              <AreaTexto {...register('observacoes')} />
            </Campo>
          </fieldset>
        </form>
      </Modal>
      <ConfirmarAcao
        aberto={confirmarExclusao}
        perigo
        titulo="Excluir proposta?"
        mensagem="A proposta e os recebimentos dela serão apagados."
        textoConfirmar="Excluir"
        carregando={excluir.isPending}
        aoConfirmar={() => excluir.mutate()}
        aoCancelar={() => setConfirmarExclusao(false)}
      />
    </>
  );
}
