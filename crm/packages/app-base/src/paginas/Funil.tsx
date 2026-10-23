import { zodResolver } from '@hookform/resolvers/zod';
import type { Etapa, Oportunidade } from '@portella/core';
import {
  centavosParaTexto,
  ETAPAS,
  formatarDinheiro,
  formatarTelefone,
  lerDinheiro,
  paraCentavos,
  resumirFunil,
  ROTULO_ETAPA,
  somenteDigitos,
  textoDinheiro,
} from '@portella/core';
import {
  AreaTexto,
  Botao,
  CabecalhoPagina,
  Campo,
  Carregando,
  ConfirmarAcao,
  Entrada,
  Indicador,
  Modal,
  Quadro,
  Selecao,
  useAvisos,
} from '@portella/ui';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { EntradaDinheiro, EntradaMascara } from '../componentes/Entradas';
import { SeletorResponsavel } from '../componentes/SeletorResponsavel';
import { useConfig, useRefinada } from '../config';
import { aplicarErros, limparVazios, mensagemErro } from '../erros';
import { useCatalogo, useColecao, useEquipe, useRemover, useSalvar } from '../hooks/dados';
import { useServicos } from '../servicos';
import { useSessao, useUsuario } from '../sessao/Sessao';
import styles from './Funil.module.css';

export function PaginaFunil() {
  const { oportunidades } = useServicos();
  const { nomeFunil } = useConfig();
  const { data, isPending } = useColecao('oportunidades', oportunidades);
  const [editando, setEditando] = useState<Oportunidade | 'nova' | null>(null);
  const resumo = useMemo(() => resumirFunil(data ?? []), [data]);

  const colunas = ETAPAS.map((etapa) => ({
    id: etapa,
    titulo: ROTULO_ETAPA[etapa],
    itens: (data ?? [])
      .filter((o) => o.etapa === etapa)
      .sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm)),
  }));

  return (
    <>
      <CabecalhoPagina
        titulo={nomeFunil}
        descricao="Acompanhe cada negociação do primeiro contato ao fechamento."
        acoes={
          <Botao icone="mais" onClick={() => setEditando('nova')}>
            Nova oportunidade
          </Botao>
        }
      />
      <div className="grade-4" style={{ marginBottom: 20 }}>
        <Indicador tom="primaria" icone="funil" rotulo="Em aberto" valor={resumo.emAberto} />
        <Indicador
          tom="info"
          icone="documento"
          rotulo="Propostas enviadas"
          valor={resumo.porEtapa.proposta}
        />
        <Indicador tom="sucesso" icone="aprovar" rotulo="Fechadas" valor={resumo.porEtapa.ganho} />
        <Indicador
          tom="destaque"
          icone="tendencia"
          rotulo="Conversão"
          valor={resumo.taxaConversao == null ? '—' : `${Math.round(resumo.taxaConversao * 100)}%`}
          detalhe="fechadas ÷ encerradas"
        />
      </div>
      {isPending ? (
        <Carregando />
      ) : (
        <Quadro
          rotulo={nomeFunil}
          colunas={colunas}
          chave={(o) => o.id}
          renderItem={(o) => <CartaoOportunidade oportunidade={o} aoAbrir={() => setEditando(o)} />}
        />
      )}
      {editando && (
        <FormularioOportunidade
          oportunidade={editando === 'nova' ? undefined : editando}
          aoFechar={() => setEditando(null)}
        />
      )}
    </>
  );
}

function CartaoOportunidade({
  oportunidade: o,
  aoAbrir,
}: {
  oportunidade: Oportunidade;
  aoAbrir: () => void;
}) {
  const { oportunidades } = useServicos();
  const { pode } = useSessao();
  const { nomeDe } = useEquipe();
  const { avisar } = useAvisos();
  const salvar = useSalvar('oportunidades', oportunidades);
  const editavel = pode('registro:editar', o);
  const refinada = useRefinada();
  // Interface refinada: mover para "Perdido" pede o motivo (spec §3).
  const [perdendo, setPerdendo] = useState(false);
  const [motivo, setMotivo] = useState('');

  const mover = (etapa: Etapa, extra: Partial<Oportunidade> = {}) =>
    salvar.mutate(
      { ...o, ...extra, etapa },
      {
        onSuccess: () => {
          avisar(`Movido para "${ROTULO_ETAPA[etapa]}".`);
          setPerdendo(false);
        },
        onError: (e) => avisar(mensagemErro(e), 'erro'),
      },
    );

  return (
    <article className={styles.cartao}>
      <strong>{o.nomeContato}</strong>
      <div className={styles.meta}>
        <span>{o.produto}</span>
        {o.valorEstimado != null && <span>{formatarDinheiro(o.valorEstimado)}</span>}
        {o.telefone && <span>{formatarTelefone(o.telefone)}</span>}
        {pode('carteira:ver_todos') && <span>{nomeDe(o.responsavelId)}</span>}
      </div>
      <div className={styles.acoes}>
        {editavel && (
          <Selecao
            aria-label={`Etapa de ${o.nomeContato}`}
            value={o.etapa}
            onChange={(e) => {
              const etapa = e.target.value as Etapa;
              if (refinada && etapa === 'perdido') {
                setMotivo(o.motivoPerda ?? '');
                setPerdendo(true);
              } else mover(etapa);
            }}
            disabled={salvar.isPending}
          >
            {ETAPAS.map((e) => (
              <option key={e} value={e}>
                {ROTULO_ETAPA[e]}
              </option>
            ))}
          </Selecao>
        )}
        <Botao
          variante="secundario"
          pequeno
          soIcone
          icone="editar"
          onClick={aoAbrir}
        >{`Abrir ${o.nomeContato}`}</Botao>
      </div>
      {refinada && (
        <ConfirmarAcao
          aberto={perdendo}
          titulo={`Marcar ${o.nomeContato} como perdido?`}
          mensagem="Conte por que não fechou: ajuda a entender as perdas."
          textoConfirmar="Marcar como perdido"
          perigo
          carregando={salvar.isPending}
          aoCancelar={() => setPerdendo(false)}
          aoConfirmar={() => motivo.trim() && mover('perdido', { motivoPerda: motivo.trim() })}
        >
          <Campo rotulo="Motivo da perda" obrigatorio erro={motivo.trim() ? undefined : 'Informe o motivo.'}>
            <Entrada
              placeholder="Preço, fechou com outro corretor…"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </Campo>
        </ConfirmarAcao>
      )}
    </article>
  );
}

const esquema = z.object({
  nomeContato: z.string().trim().min(2, 'Informe o nome do contato.'),
  telefone: z.string(),
  email: z.string(),
  produto: z.string().min(1, 'Escolha o produto.'),
  etapa: z.enum(ETAPAS),
  valorEstimado: z.string().refine((v) => !v.trim() || paraCentavos(v) != null, 'Valor inválido.'),
  motivoPerda: z.string(),
  observacoes: z.string(),
  responsavelId: z.string().optional(),
});
type Valores = z.infer<typeof esquema>;
const esquemaRefinado = esquema.superRefine((v, ctx) => {
  if (v.etapa === 'perdido' && !v.motivoPerda.trim())
    ctx.addIssue({ code: 'custom', path: ['motivoPerda'], message: 'Informe o motivo da perda.' });
});

function FormularioOportunidade({
  oportunidade,
  aoFechar,
}: {
  oportunidade?: Oportunidade;
  aoFechar: () => void;
}) {
  const usuario = useUsuario();
  const { oportunidades } = useServicos();
  const { produtos: produtosApp } = useConfig();
  const refinada = useRefinada();
  // Interface refinada: os mesmos produtos de Propostas (lista editável em Configurações).
  const catalogo = useCatalogo('produtos');
  const produtos = refinada && catalogo.length ? catalogo : produtosApp;
  const { pode } = useSessao();
  const { avisar } = useAvisos();
  const salvar = useSalvar('oportunidades', oportunidades);
  const remover = useRemover('oportunidades', oportunidades);
  const [confirmarRemocao, setConfirmarRemocao] = useState(false);
  const removerAgora = () =>
    oportunidade &&
    remover.mutate(oportunidade.id, {
      onSuccess: () => {
        avisar(refinada ? 'Oportunidade excluída.' : 'Oportunidade removida.');
        aoFechar();
      },
      // Sem a interface refinada a exclusão ficava sem aviso de erro; mantido igual.
      onError: (e) => refinada && avisar(mensagemErro(e), 'erro'),
    });
  const somenteLeitura = oportunidade ? !pode('registro:editar', oportunidade) : false;
  const { register, handleSubmit, formState, setError, watch } = useForm<Valores>({
    resolver: zodResolver(refinada ? esquemaRefinado : esquema),
    defaultValues: {
      nomeContato: oportunidade?.nomeContato ?? '',
      telefone: oportunidade?.telefone ? formatarTelefone(oportunidade.telefone) : '',
      email: oportunidade?.email ?? '',
      produto: oportunidade?.produto ?? produtos[0] ?? '',
      etapa: oportunidade?.etapa ?? 'novo',
      valorEstimado: (refinada ? textoDinheiro : centavosParaTexto)(oportunidade?.valorEstimado),
      motivoPerda: oportunidade?.motivoPerda ?? '',
      observacoes: oportunidade?.observacoes ?? '',
      responsavelId: oportunidade?.responsavelId ?? usuario.id,
    },
  });

  const enviar = handleSubmit(async (v) => {
    const d = limparVazios(v);
    try {
      await salvar.mutateAsync({
        ...(oportunidade ?? {}),
        ...d,
        telefone: d.telefone ? somenteDigitos(d.telefone) : undefined,
        valorEstimado: d.valorEstimado
          ? ((refinada ? lerDinheiro : paraCentavos)(d.valorEstimado) ?? undefined)
          : undefined,
      });
      avisar(oportunidade ? 'Oportunidade atualizada.' : 'Oportunidade criada.');
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
      titulo={
        oportunidade
          ? refinada
            ? `${somenteLeitura ? 'Oportunidade' : 'Editar oportunidade'} · ${oportunidade.nomeContato}`
            : oportunidade.nomeContato
          : 'Nova oportunidade'
      }
      aoFechar={aoFechar}
      alterado={!somenteLeitura && formState.isDirty}
      bloqueado={formState.isSubmitting}
      rodape={
        <>
          {oportunidade && pode('registro:remover', oportunidade) && (
            <Botao
              variante="perigo"
              icone={refinada ? 'lixeira' : undefined}
              carregando={!refinada && remover.isPending}
              onClick={refinada ? () => setConfirmarRemocao(true) : removerAgora}
            >
              {refinada ? 'Excluir' : 'Remover'}
            </Botao>
          )}
          <Botao variante="secundario" onClick={aoFechar}>
            {somenteLeitura ? 'Fechar' : 'Cancelar'}
          </Botao>
          {!somenteLeitura && (
            <Botao type="submit" form="form-oportunidade" carregando={formState.isSubmitting}>
              Salvar
            </Botao>
          )}
        </>
      }
    >
      <form id="form-oportunidade" onSubmit={enviar} noValidate>
        <fieldset disabled={somenteLeitura} className="grade-2" style={{ border: 0, padding: 0, margin: 0 }}>
          <Campo rotulo="Contato" obrigatorio erro={erros.nomeContato?.message}>
            <Entrada {...register('nomeContato')} />
          </Campo>
          <Campo rotulo="Telefone">
            {refinada ? (
              <EntradaMascara mascara="telefone" type="tel" {...register('telefone')} />
            ) : (
              <Entrada type="tel" inputMode="tel" {...register('telefone')} />
            )}
          </Campo>
          <Campo rotulo="E-mail">
            <Entrada type="email" {...register('email')} />
          </Campo>
          <Campo rotulo="Produto" obrigatorio erro={erros.produto?.message}>
            <Selecao {...register('produto')}>
              {[...new Set([...produtos, oportunidade?.produto].filter(Boolean) as string[])].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Etapa">
            <Selecao {...register('etapa')}>
              {ETAPAS.map((e) => (
                <option key={e} value={e}>
                  {ROTULO_ETAPA[e]}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo
            rotulo={refinada ? 'Valor estimado' : 'Valor estimado (R$)'}
            erro={erros.valorEstimado?.message}
          >
            {refinada ? (
              <EntradaDinheiro {...register('valorEstimado')} />
            ) : (
              <Entrada inputMode="decimal" placeholder="0,00" {...register('valorEstimado')} />
            )}
          </Campo>
          {watch('etapa') === 'perdido' && (
            <Campo
              rotulo="Motivo da perda"
              className="span-todo"
              obrigatorio={refinada}
              erro={erros.motivoPerda?.message}
            >
              <Entrada {...register('motivoPerda')} />
            </Campo>
          )}
          <SeletorResponsavel {...register('responsavelId')} />
          <Campo rotulo="Observações" className="span-todo">
            <AreaTexto {...register('observacoes')} />
          </Campo>
        </fieldset>
      </form>
      {oportunidade && (
        <ConfirmarAcao
          aberto={confirmarRemocao}
          titulo="Excluir a oportunidade?"
          mensagem={`${oportunidade.nomeContato} sai do funil. Não dá para desfazer.`}
          textoConfirmar="Excluir oportunidade"
          perigo
          carregando={remover.isPending}
          aoCancelar={() => setConfirmarRemocao(false)}
          aoConfirmar={removerAgora}
        />
      )}
    </Modal>
  );
}
