import { zodResolver } from '@hookform/resolvers/zod';
import {
  aplicarErros,
  limparVazios,
  mensagemErro,
  SeletorResponsavel,
  useColecao,
  useSalvar,
  useUsuario,
} from '@portella/app-base';
import type { DadosRegistro } from '@portella/core';
import {
  centavosParaTexto,
  corresponde,
  hojeISO,
  normalizar,
  paraCentavos,
  somarMeses,
} from '@portella/core';
import { AreaTexto, Botao, Campo, Entrada, Modal, Selecao, useAvisos } from '@portella/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { renovarApolice } from '../../application/renovacao';
import type { Apolice } from '../../domain/apolice';
import { ROTULO_RENOVACAO, STATUS_RENOVACAO } from '../../domain/apolice';
import { RAMOS, SEGURADORAS } from '../../domain/catalogo';
import { useServicosSeguros } from '../hooks';

const dinheiro = z.string().refine((v) => !v.trim() || paraCentavos(v) != null, 'Valor inválido.');
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
  comissaoPercentual: z.string().refine((v) => !v.trim() || paraCentavos(v) != null, 'Percentual inválido.'),
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
  const { avisar } = useAvisos();
  const consultas = useQueryClient();
  const [filtroCliente, setFiltroCliente] = useState('');
  const base = { ...inicial, ...apolice };
  const hoje = hojeISO();

  const { register, handleSubmit, formState, setError, watch } = useForm<Valores>({
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
      premioLiquido: centavosParaTexto(base.premioLiquido),
      premioTotal: centavosParaTexto(base.premioTotal),
      comissaoPercentual:
        base.comissaoPercentual == null ? '' : String(base.comissaoPercentual).replace('.', ','),
      formaPagamento: base.formaPagamento ?? '',
      renovacao: base.renovacao ?? 'pendente',
      cancelada: base.cancelada ?? false,
      observacoes: base.observacoes ?? '',
      responsavelId: base.responsavelId ?? usuario.id,
    },
  });

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
      premioLiquido: d.premioLiquido ? (paraCentavos(d.premioLiquido) ?? undefined) : undefined,
      premioTotal: d.premioTotal ? (paraCentavos(d.premioTotal) ?? undefined) : undefined,
      comissaoPercentual: d.comissaoPercentual ? (paraCentavos(d.comissaoPercentual) ?? 0) / 100 : undefined,
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
      rodape={
        <>
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
            {SEGURADORAS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
            <option value={OUTRA}>Outra…</option>
          </Selecao>
        </Campo>
        {watch('seguradora') === OUTRA && (
          <Campo rotulo="Nome da seguradora" obrigatorio>
            <Entrada {...register('outraSeguradora')} />
          </Campo>
        )}
        <Campo rotulo="Ramo" obrigatorio>
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
        <Campo rotulo="Fim da vigência" dica="Em branco para contratos contínuos (vida, saúde…)." erro={erros.fimVigencia?.message}>
          <Entrada type="date" {...register('fimVigencia')} />
        </Campo>
        {base.vigenciaEstimada && (
          <Campo rotulo="Vigência" dica="Calculada na importação (proposta + 12 meses).">
            <Selecao {...register('vigenciaEstimada')}>
              <option value="sim">Estimada — confirmar</option>
              <option value="nao">Confirmada</option>
            </Selecao>
          </Campo>
        )}
        <Campo rotulo="Prêmio líquido (R$)" erro={erros.premioLiquido?.message}>
          <Entrada inputMode="decimal" placeholder="0,00" {...register('premioLiquido')} />
        </Campo>
        <Campo rotulo="Prêmio total (R$)" erro={erros.premioTotal?.message}>
          <Entrada inputMode="decimal" placeholder="0,00" {...register('premioTotal')} />
        </Campo>
        <Campo rotulo="Comissão (%)" erro={erros.comissaoPercentual?.message}>
          <Entrada inputMode="decimal" placeholder="Ex.: 15" {...register('comissaoPercentual')} />
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
          <Campo rotulo="Situação">
            <Selecao {...register('cancelada', { setValueAs: (v) => v === true || v === 'true' })}>
              <option value="false">Ativa</option>
              <option value="true">Cancelada</option>
            </Selecao>
          </Campo>
        )}
        <SeletorResponsavel {...register('responsavelId')} />
        <Campo rotulo="Observações" className="span-todo">
          <AreaTexto {...register('observacoes')} />
        </Campo>
      </form>
    </Modal>
  );
}
