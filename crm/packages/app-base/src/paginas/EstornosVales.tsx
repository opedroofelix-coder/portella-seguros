import { zodResolver } from '@hookform/resolvers/zod';
import type { DadosRegistro, Estorno, Proposta, Registro, Vale } from '@portella/core';
import {
  centavosParaTexto,
  corresponde,
  descontoDoEstorno,
  formatarData,
  formatarDinheiro,
  hojeISO,
  lerDinheiro,
  paraCentavos,
  percentualDe,
  propostaDoEstorno,
  textoDinheiro,
} from '@portella/core';
import {
  Abas,
  BarraFiltros,
  Botao,
  CabecalhoPagina,
  Campo,
  Cartao,
  Carregando,
  Entrada,
  EstadoVazio,
  ConfirmarAcao,
  Modal,
  Selecao,
  Tabela,
  useAvisos,
} from '@portella/ui';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { EntradaDinheiro, EntradaPercentual } from '../componentes/Entradas';
import { useRefinada } from '../config';
import { aplicarErros, mensagemErro } from '../erros';
import { useCatalogo, useColecao, useEquipe, useRemover, useSalvar } from '../hooks/dados';
import { useServicos } from '../servicos';
import { useSessao } from '../sessao/Sessao';

const valor = z.string().refine((v) => paraCentavos(v) != null && paraCentavos(v)! >= 0, 'Informe o valor.');
const cent = (t: string, refinada = false) => (refinada ? lerDinheiro : paraCentavos)(t) ?? 0;
const textoValor = (c: number | undefined, refinada: boolean) =>
  (refinada ? textoDinheiro : centavosParaTexto)(c);
const textoPct = (n?: number) => (n == null ? '' : String(n).replace('.', ','));
const lerPct = (t: string) => (t.trim() ? (lerDinheiro(t) ?? NaN) / 100 : undefined);

export function PaginaEstornosVales() {
  const [aba, setAba] = useState<'estornos' | 'vales'>('estornos');
  const { pode } = useSessao();
  return (
    <>
      <CabecalhoPagina
        titulo={
          <>
            Estornos e <em>vales</em>
          </>
        }
        descricao="Descontam do pagamento mensal do produtor, no mês da data informada."
      />
      <Abas
        rotulo="Lançamentos"
        ativa={aba}
        aoTrocar={setAba}
        abas={[
          { id: 'estornos', rotulo: 'Estornos' },
          { id: 'vales', rotulo: 'Vales' },
        ]}
      />
      <Cartao>
        {aba === 'estornos' ? (
          <ListaEstornos gestao={pode('financeiro:gerenciar')} />
        ) : (
          <ListaVales gestao={pode('financeiro:gerenciar')} />
        )}
      </Cartao>
    </>
  );
}

function useFiltroProdutor() {
  const [produtor, setProdutor] = useState('');
  const [busca, setBusca] = useState('');
  const { equipe } = useEquipe();
  const { pode } = useSessao();
  const refinada = useRefinada();
  const filtros = (
    <>
      {pode('carteira:ver_todos') && (
        <Campo rotulo="Produtor">
          <Selecao value={produtor} onChange={(e) => setProdutor(e.target.value)}>
            <option value="">Todos</option>
            {equipe
              .filter((u) => !refinada || u.ativo || u.id === produtor)
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
          </Selecao>
        </Campo>
      )}
      <Campo rotulo="Buscar">
        <Entrada
          type="search"
          placeholder={refinada ? 'Segurado, apólice, motivo…' : undefined}
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </Campo>
    </>
  );
  const filtrar = <T extends Registro>(itens: T[], ...campos: Array<(i: T) => string | undefined>) =>
    itens
      .filter((i) => !produtor || i.responsavelId === produtor)
      .filter((i) => corresponde(busca, ...campos.map((c) => c(i))));
  return { filtros, filtrar };
}

function ListaEstornos({ gestao }: { gestao: boolean }) {
  const { estornos } = useServicos();
  const { data, isPending } = useColecao<Estorno>('estornos', estornos);
  const { nomeDe } = useEquipe();
  const { filtros, filtrar } = useFiltroProdutor();
  const refinada = useRefinada();
  const [editando, setEditando] = useState<Estorno | 'novo' | null>(null);
  const lista = filtrar(
    data ?? [],
    (e) => e.segurado,
    (e) => e.numeroApolice,
    (e) => e.companhia,
    (e) => e.produto,
  ).sort((a, b) => b.data.localeCompare(a.data));
  return (
    <>
      <BarraFiltros>
        {filtros}
        {gestao && (
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <Botao icone="mais" onClick={() => setEditando('novo')}>
              Novo estorno
            </Botao>
          </div>
        )}
      </BarraFiltros>
      {isPending ? (
        <Carregando />
      ) : (
        <Tabela
          rotulo="Estornos"
          itens={lista}
          chave={(e) => e.id}
          aoClicar={gestao ? setEditando : undefined}
          vazio={<EstadoVazio titulo="Nenhum estorno" />}
          colunas={[
            { chave: 'segurado', titulo: 'Segurado', principal: true, render: (e) => e.segurado },
            { chave: 'data', titulo: 'Data', render: (e) => formatarData(e.data) },
            {
              chave: 'apolice',
              titulo: 'Nº apólice',
              ocultarNoMobile: true,
              render: (e) => e.numeroApolice ?? '—',
            },
            { chave: 'cia', titulo: 'Seguradora · produto', render: (e) => `${e.companhia} · ${e.produto}` },
            { chave: 'produtor', titulo: 'Produtor', render: (e) => nomeDe(e.responsavelId) },
            ...(gestao
              ? [
                  {
                    chave: 'valor',
                    titulo: 'Estornado',
                    alinharDireita: true,
                    ocultarNoMobile: true,
                    render: (e: Estorno) => formatarDinheiro(e.valor),
                  },
                ]
              : []),
            ...(refinada
              ? [
                  {
                    chave: 'pct',
                    titulo: '% produtor',
                    alinharDireita: true,
                    ocultarNoMobile: true,
                    render: (e: Estorno) =>
                      e.percentualProdutor == null ? '—' : `${textoPct(e.percentualProdutor)}%`,
                  },
                ]
              : []),
            {
              chave: 'desconto',
              titulo: 'Desconto do produtor',
              alinharDireita: true,
              render: (e) => formatarDinheiro(e.descontoProdutor),
            },
          ]}
        />
      )}
      {editando && (
        <FormularioEstorno
          estorno={editando === 'novo' ? undefined : editando}
          aoFechar={() => setEditando(null)}
        />
      )}
    </>
  );
}

const esquemaEstorno = z.object({
  responsavelId: z.string().min(1, 'Escolha o produtor.'),
  segurado: z.string().trim().min(2, 'Informe o segurado.'),
  numeroApolice: z.string(),
  companhia: z.string().trim().min(1, 'Informe a seguradora.'),
  produto: z.string().trim().min(1, 'Informe o produto.'),
  data: z.string().min(1, 'Informe a data.'),
  valor,
  percentualProdutor: z.string().refine((v) => {
    const n = lerPct(v);
    return n == null || (n >= 0 && n <= 100);
  }, 'Entre 0 e 100.'),
  descontoProdutor: valor,
  observacoes: z.string(),
});

function FormularioEstorno({ estorno, aoFechar }: { estorno?: Estorno; aoFechar: () => void }) {
  const { estornos, propostas } = useServicos();
  const { equipe } = useEquipe();
  const vendas = useColecao<Proposta>('propostas', propostas).data;
  const produtos = useCatalogo('produtos');
  const seguradoras = useCatalogo('seguradoras');
  const salvar = useSalvar<Estorno>('estornos', estornos);
  const remover = useRemover<Estorno>('estornos', estornos);
  const { avisar } = useAvisos();
  const refinada = useRefinada();
  const [confirmarRemocao, setConfirmarRemocao] = useState(false);
  const removerAgora = () =>
    estorno &&
    remover.mutate(estorno.id, {
      onSuccess: () => {
        avisar(refinada ? 'Estorno excluído.' : 'Estorno removido.');
        aoFechar();
      },
      // Sem a interface refinada a exclusão ficava sem aviso de erro; mantido igual.
      onError: (e) => refinada && avisar(mensagemErro(e), 'erro'),
    });
  const { register, handleSubmit, formState, setError, getValues, setValue, watch } = useForm<
    z.infer<typeof esquemaEstorno>
  >({
    resolver: zodResolver(esquemaEstorno),
    defaultValues: {
      responsavelId: estorno?.responsavelId ?? '',
      segurado: estorno?.segurado ?? '',
      numeroApolice: estorno?.numeroApolice ?? '',
      companhia: estorno?.companhia ?? '',
      produto: estorno?.produto ?? '',
      data: estorno?.data ?? hojeISO(),
      valor: textoValor(estorno?.valor, refinada),
      percentualProdutor: textoPct(estorno?.percentualProdutor),
      descontoProdutor: textoValor(estorno?.descontoProdutor, refinada),
      observacoes: estorno?.observacoes ?? '',
    },
  });
  // Interface refinada: o % do produtor vem da venda (mesmo nº de apólice) ou do repasse padrão dele,
  // e o desconto é calculado: comissão estornada × %. O % digitado à mão não é trocado depois.
  const [pctDigitado, setPctDigitado] = useState(estorno?.percentualProdutor != null);
  const opcao = { shouldDirty: true, shouldValidate: true } as const;
  const recalcularDesconto = () => {
    const pct = lerPct(getValues('percentualProdutor'));
    const estornado = lerDinheiro(getValues('valor'));
    if (pct == null || Number.isNaN(pct) || estornado == null) return;
    setValue('descontoProdutor', textoDinheiro(descontoDoEstorno(estornado, pct)), opcao);
  };
  const venda = propostaDoEstorno(vendas ?? [], watch('numeroApolice'), watch('responsavelId'));
  const sugerirPercentual = () => {
    const produtorId = getValues('responsavelId');
    const achada = propostaDoEstorno(vendas ?? [], getValues('numeroApolice'), produtorId);
    if (achada) {
      // Completa o que estiver em branco com os dados da proposta.
      if (!getValues('segurado').trim()) setValue('segurado', achada.clienteNome, opcao);
      if (!getValues('companhia').trim()) setValue('companhia', achada.companhia, opcao);
      if (!getValues('produto').trim()) setValue('produto', achada.produto, opcao);
      if (!produtorId && achada.produtores.length === 1)
        setValue('responsavelId', achada.produtores[0]!.produtorId, opcao);
    }
    if (pctDigitado) return;
    const id = getValues('responsavelId');
    const pct =
      achada && id && achada.produtores.some((x) => x.produtorId === id)
        ? percentualDe(achada, id)
        : equipe.find((u) => u.id === id)?.percentualRepasse;
    if (pct == null) return;
    setValue('percentualProdutor', textoPct(pct), opcao);
    recalcularDesconto();
  };
  const origemPct = (() => {
    const id = watch('responsavelId');
    if (venda && id && venda.produtores.some((x) => x.produtorId === id))
      return `O % de ${equipe.find((u) => u.id === id)?.nome ?? 'produtor'} na proposta ${venda.numero}.`;
    return 'O repasse do produtor na venda. Sem a proposta, vem o % padrão dele.';
  })();
  const enviar = handleSubmit(async (v) => {
    const dados: DadosRegistro<Estorno> = {
      ...(estorno ?? {}),
      ...v,
      numeroApolice: v.numeroApolice.trim() || undefined,
      observacoes: v.observacoes.trim() || undefined,
      valor: cent(v.valor, refinada),
      percentualProdutor: refinada ? lerPct(v.percentualProdutor) : estorno?.percentualProdutor,
      descontoProdutor: cent(v.descontoProdutor, refinada),
    };
    try {
      await salvar.mutateAsync(dados);
      avisar('Estorno salvo.');
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
      titulo={estorno ? 'Editar estorno' : 'Novo estorno'}
      aoFechar={aoFechar}
      alterado={formState.isDirty}
      bloqueado={formState.isSubmitting}
      rodape={
        <>
          {estorno && (
            <Botao
              variante="perigo"
              icone={refinada ? 'lixeira' : undefined}
              onClick={refinada ? () => setConfirmarRemocao(true) : removerAgora}
            >
              {refinada ? 'Excluir' : 'Remover'}
            </Botao>
          )}
          <Botao variante="secundario" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" form="form-estorno" carregando={formState.isSubmitting}>
            Salvar
          </Botao>
        </>
      }
    >
      <form id="form-estorno" className="grade-2" onSubmit={enviar} noValidate>
        <Campo rotulo="Nome do segurado" obrigatorio erro={erros.segurado?.message} className="span-todo">
          <Entrada {...register('segurado')} />
        </Campo>
        <Campo
          rotulo="Nº da apólice"
          dica={refinada && venda ? `Proposta de ${venda.clienteNome} encontrada.` : undefined}
        >
          <Entrada {...register('numeroApolice', refinada ? { onBlur: sugerirPercentual } : undefined)} />
        </Campo>
        <Campo rotulo="Data" obrigatorio erro={erros.data?.message}>
          <Entrada type="date" {...register('data')} />
        </Campo>
        <Campo rotulo="Seguradora" obrigatorio erro={erros.companhia?.message}>
          <Entrada list="seguradoras-estorno" {...register('companhia')} />
        </Campo>
        <datalist id="seguradoras-estorno">
          {seguradoras.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <Campo rotulo="Produto" obrigatorio erro={erros.produto?.message}>
          <Entrada list="produtos-estorno" {...register('produto')} />
        </Campo>
        <datalist id="produtos-estorno">
          {produtos.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        <Campo rotulo="Produtor" obrigatorio erro={erros.responsavelId?.message}>
          <Selecao {...register('responsavelId', refinada ? { onChange: sugerirPercentual } : undefined)}>
            <option value="">Escolha…</option>
            {equipe
              .filter((u) => !refinada || u.ativo || u.id === estorno?.responsavelId)
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
          </Selecao>
        </Campo>
        {refinada ? (
          <>
            <Campo rotulo="Comissão estornada pela seguradora" obrigatorio erro={erros.valor?.message}>
              <EntradaDinheiro {...register('valor', { onChange: recalcularDesconto })} />
            </Campo>
            <Campo rotulo="% do produtor" erro={erros.percentualProdutor?.message} dica={origemPct}>
              <EntradaPercentual
                placeholder="Ex.: 40"
                {...register('percentualProdutor', {
                  onChange: () => {
                    setPctDigitado(true);
                    recalcularDesconto();
                  },
                })}
              />
            </Campo>
            <Campo
              rotulo="Desconto do produtor"
              obrigatorio
              erro={erros.descontoProdutor?.message}
              dica="Calculado: comissão estornada × % do produtor. Dá para ajustar."
            >
              <EntradaDinheiro {...register('descontoProdutor')} />
            </Campo>
          </>
        ) : (
          <>
            <Campo rotulo="Comissão estornada pela seguradora (R$)" obrigatorio erro={erros.valor?.message}>
              <Entrada inputMode="decimal" {...register('valor')} />
            </Campo>
            <Campo rotulo="Desconto do produtor (R$)" obrigatorio erro={erros.descontoProdutor?.message}>
              <Entrada inputMode="decimal" {...register('descontoProdutor')} />
            </Campo>
          </>
        )}
        <Campo rotulo="Observações" className="span-todo">
          <Entrada {...register('observacoes')} />
        </Campo>
      </form>
      {estorno && (
        <ConfirmarAcao
          aberto={confirmarRemocao}
          titulo="Excluir o estorno?"
          mensagem={`O estorno de ${estorno.segurado} deixa de descontar do pagamento do produtor.`}
          textoConfirmar="Excluir estorno"
          perigo
          carregando={remover.isPending}
          aoCancelar={() => setConfirmarRemocao(false)}
          aoConfirmar={removerAgora}
        />
      )}
    </Modal>
  );
}

function ListaVales({ gestao }: { gestao: boolean }) {
  const { vales } = useServicos();
  const { data, isPending } = useColecao<Vale>('vales', vales);
  const { nomeDe } = useEquipe();
  const { filtros, filtrar } = useFiltroProdutor();
  const [editando, setEditando] = useState<Vale | 'novo' | null>(null);
  const lista = filtrar(
    data ?? [],
    (v) => v.motivo,
    (v) => nomeDe(v.responsavelId),
  ).sort((a, b) => b.data.localeCompare(a.data));
  return (
    <>
      <BarraFiltros>
        {filtros}
        {gestao && (
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <Botao icone="mais" onClick={() => setEditando('novo')}>
              Novo vale
            </Botao>
          </div>
        )}
      </BarraFiltros>
      {isPending ? (
        <Carregando />
      ) : (
        <Tabela
          rotulo="Vales"
          itens={lista}
          chave={(v) => v.id}
          aoClicar={gestao ? setEditando : undefined}
          vazio={<EstadoVazio titulo="Nenhum vale" />}
          colunas={[
            {
              chave: 'produtor',
              titulo: 'Produtor',
              principal: true,
              render: (v) => nomeDe(v.responsavelId),
            },
            { chave: 'data', titulo: 'Data', render: (v) => formatarData(v.data) },
            { chave: 'motivo', titulo: 'Motivo', render: (v) => v.motivo ?? '—' },
            {
              chave: 'valor',
              titulo: 'Valor',
              alinharDireita: true,
              render: (v) => formatarDinheiro(v.valor),
            },
          ]}
        />
      )}
      {editando && (
        <FormularioVale
          vale={editando === 'novo' ? undefined : editando}
          aoFechar={() => setEditando(null)}
        />
      )}
    </>
  );
}

const esquemaVale = z.object({
  responsavelId: z.string().min(1, 'Escolha o produtor.'),
  data: z.string().min(1, 'Informe a data.'),
  valor: valor.refine((v) => cent(v) > 0, 'Informe o valor.'),
  motivo: z.string(),
});

function FormularioVale({ vale, aoFechar }: { vale?: Vale; aoFechar: () => void }) {
  const { vales } = useServicos();
  const { equipe } = useEquipe();
  const salvar = useSalvar<Vale>('vales', vales);
  const remover = useRemover<Vale>('vales', vales);
  const { avisar } = useAvisos();
  const refinada = useRefinada();
  const [confirmarRemocao, setConfirmarRemocao] = useState(false);
  const removerAgora = () =>
    vale &&
    remover.mutate(vale.id, {
      onSuccess: () => {
        avisar(refinada ? 'Vale excluído.' : 'Vale removido.');
        aoFechar();
      },
      // Sem a interface refinada a exclusão ficava sem aviso de erro; mantido igual.
      onError: (e) => refinada && avisar(mensagemErro(e), 'erro'),
    });
  const { register, handleSubmit, formState, setError } = useForm<z.infer<typeof esquemaVale>>({
    resolver: zodResolver(esquemaVale),
    defaultValues: {
      responsavelId: vale?.responsavelId ?? '',
      data: vale?.data ?? hojeISO(),
      valor: textoValor(vale?.valor, refinada),
      motivo: vale?.motivo ?? '',
    },
  });
  const enviar = handleSubmit(async (v) => {
    try {
      await salvar.mutateAsync({
        ...(vale ?? {}),
        ...v,
        motivo: v.motivo.trim() || undefined,
        valor: cent(v.valor, refinada),
      });
      avisar('Vale salvo.');
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
      largura={520}
      titulo={vale ? 'Editar vale' : 'Novo vale'}
      aoFechar={aoFechar}
      alterado={formState.isDirty}
      bloqueado={formState.isSubmitting}
      rodape={
        <>
          {vale && (
            <Botao
              variante="perigo"
              icone={refinada ? 'lixeira' : undefined}
              onClick={refinada ? () => setConfirmarRemocao(true) : removerAgora}
            >
              {refinada ? 'Excluir' : 'Remover'}
            </Botao>
          )}
          <Botao variante="secundario" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" form="form-vale" carregando={formState.isSubmitting}>
            Salvar
          </Botao>
        </>
      }
    >
      <form id="form-vale" className="grade" onSubmit={enviar} noValidate>
        <Campo rotulo="Produtor" obrigatorio erro={erros.responsavelId?.message}>
          <Selecao {...register('responsavelId')}>
            <option value="">Escolha…</option>
            {equipe
              .filter((u) => !refinada || u.ativo || u.id === vale?.responsavelId)
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
          </Selecao>
        </Campo>
        <Campo rotulo="Data" obrigatorio erro={erros.data?.message}>
          <Entrada type="date" {...register('data')} />
        </Campo>
        <Campo rotulo={refinada ? 'Valor' : 'Valor (R$)'} obrigatorio erro={erros.valor?.message}>
          {refinada ? (
            <EntradaDinheiro {...register('valor')} />
          ) : (
            <Entrada inputMode="decimal" {...register('valor')} />
          )}
        </Campo>
        <Campo rotulo="Motivo">
          <Entrada {...register('motivo')} />
        </Campo>
      </form>
      {vale && (
        <ConfirmarAcao
          aberto={confirmarRemocao}
          titulo="Excluir o vale?"
          mensagem="O vale deixa de descontar do pagamento do produtor."
          textoConfirmar="Excluir vale"
          perigo
          carregando={remover.isPending}
          aoCancelar={() => setConfirmarRemocao(false)}
          aoConfirmar={removerAgora}
        />
      )}
    </Modal>
  );
}
