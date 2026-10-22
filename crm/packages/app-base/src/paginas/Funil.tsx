import { zodResolver } from '@hookform/resolvers/zod';
import type { Etapa, Oportunidade } from '@portella/core';
import {
  centavosParaTexto,
  ETAPAS,
  formatarDinheiro,
  formatarTelefone,
  paraCentavos,
  resumirFunil,
  ROTULO_ETAPA,
  somenteDigitos,
} from '@portella/core';
import {
  AreaTexto,
  Botao,
  CabecalhoPagina,
  Campo,
  Carregando,
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
import { SeletorResponsavel } from '../componentes/SeletorResponsavel';
import { useConfig } from '../config';
import { aplicarErros, limparVazios, mensagemErro } from '../erros';
import { useColecao, useEquipe, useRemover, useSalvar } from '../hooks/dados';
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
        <Indicador rotulo="Em aberto" valor={resumo.emAberto} />
        <Indicador rotulo="Propostas enviadas" valor={resumo.porEtapa.proposta} />
        <Indicador rotulo="Fechadas" valor={resumo.porEtapa.ganho} />
        <Indicador
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

  const mover = (etapa: Etapa) =>
    salvar.mutate(
      { ...o, etapa },
      {
        onSuccess: () => avisar(`Movido para "${ROTULO_ETAPA[etapa]}".`),
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
            onChange={(e) => mover(e.target.value as Etapa)}
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

function FormularioOportunidade({
  oportunidade,
  aoFechar,
}: {
  oportunidade?: Oportunidade;
  aoFechar: () => void;
}) {
  const usuario = useUsuario();
  const { oportunidades } = useServicos();
  const { produtos } = useConfig();
  const { pode } = useSessao();
  const { avisar } = useAvisos();
  const salvar = useSalvar('oportunidades', oportunidades);
  const remover = useRemover('oportunidades', oportunidades);
  const somenteLeitura = oportunidade ? !pode('registro:editar', oportunidade) : false;
  const { register, handleSubmit, formState, setError, watch } = useForm<Valores>({
    resolver: zodResolver(esquema),
    defaultValues: {
      nomeContato: oportunidade?.nomeContato ?? '',
      telefone: oportunidade?.telefone ? formatarTelefone(oportunidade.telefone) : '',
      email: oportunidade?.email ?? '',
      produto: oportunidade?.produto ?? produtos[0] ?? '',
      etapa: oportunidade?.etapa ?? 'novo',
      valorEstimado: centavosParaTexto(oportunidade?.valorEstimado),
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
        valorEstimado: d.valorEstimado ? (paraCentavos(d.valorEstimado) ?? undefined) : undefined,
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
      titulo={oportunidade ? oportunidade.nomeContato : 'Nova oportunidade'}
      aoFechar={aoFechar}
      rodape={
        <>
          {oportunidade && pode('registro:remover', oportunidade) && (
            <Botao
              variante="perigo"
              carregando={remover.isPending}
              onClick={() =>
                remover.mutate(oportunidade.id, {
                  onSuccess: () => {
                    avisar('Oportunidade removida.');
                    aoFechar();
                  },
                })
              }
            >
              Remover
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
            <Entrada type="tel" inputMode="tel" {...register('telefone')} />
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
          <Campo rotulo="Valor estimado (R$)" erro={erros.valorEstimado?.message}>
            <Entrada inputMode="decimal" placeholder="0,00" {...register('valorEstimado')} />
          </Campo>
          {watch('etapa') === 'perdido' && (
            <Campo rotulo="Motivo da perda" className="span-todo">
              <Entrada {...register('motivoPerda')} />
            </Campo>
          )}
          <SeletorResponsavel {...register('responsavelId')} />
          <Campo rotulo="Observações" className="span-todo">
            <AreaTexto {...register('observacoes')} />
          </Campo>
        </fieldset>
      </form>
    </Modal>
  );
}
