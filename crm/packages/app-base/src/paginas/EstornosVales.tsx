import { zodResolver } from '@hookform/resolvers/zod';
import type { DadosRegistro, Estorno, Registro, Vale } from '@portella/core';
import {
  centavosParaTexto,
  corresponde,
  formatarData,
  formatarDinheiro,
  hojeISO,
  paraCentavos,
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
  Modal,
  Selecao,
  Tabela,
  useAvisos,
} from '@portella/ui';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { aplicarErros, mensagemErro } from '../erros';
import { useCatalogo, useColecao, useEquipe, useRemover, useSalvar } from '../hooks/dados';
import { useServicos } from '../servicos';
import { useSessao } from '../sessao/Sessao';

const valor = z.string().refine((v) => paraCentavos(v) != null && paraCentavos(v)! >= 0, 'Informe o valor.');
const cent = (t: string) => paraCentavos(t) ?? 0;

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
  const filtros = (
    <>
      {pode('carteira:ver_todos') && (
        <Campo rotulo="Produtor">
          <Selecao value={produtor} onChange={(e) => setProdutor(e.target.value)}>
            <option value="">Todos</option>
            {equipe.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </Selecao>
        </Campo>
      )}
      <Campo rotulo="Buscar">
        <Entrada type="search" value={busca} onChange={(e) => setBusca(e.target.value)} />
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
  descontoProdutor: valor,
  observacoes: z.string(),
});

function FormularioEstorno({ estorno, aoFechar }: { estorno?: Estorno; aoFechar: () => void }) {
  const { estornos } = useServicos();
  const { equipe } = useEquipe();
  const produtos = useCatalogo('produtos');
  const seguradoras = useCatalogo('seguradoras');
  const salvar = useSalvar<Estorno>('estornos', estornos);
  const remover = useRemover<Estorno>('estornos', estornos);
  const { avisar } = useAvisos();
  const { register, handleSubmit, formState, setError } = useForm<z.infer<typeof esquemaEstorno>>({
    resolver: zodResolver(esquemaEstorno),
    defaultValues: {
      responsavelId: estorno?.responsavelId ?? '',
      segurado: estorno?.segurado ?? '',
      numeroApolice: estorno?.numeroApolice ?? '',
      companhia: estorno?.companhia ?? '',
      produto: estorno?.produto ?? '',
      data: estorno?.data ?? hojeISO(),
      valor: centavosParaTexto(estorno?.valor),
      descontoProdutor: centavosParaTexto(estorno?.descontoProdutor),
      observacoes: estorno?.observacoes ?? '',
    },
  });
  const enviar = handleSubmit(async (v) => {
    const dados: DadosRegistro<Estorno> = {
      ...(estorno ?? {}),
      ...v,
      numeroApolice: v.numeroApolice.trim() || undefined,
      observacoes: v.observacoes.trim() || undefined,
      valor: cent(v.valor),
      descontoProdutor: cent(v.descontoProdutor),
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
      rodape={
        <>
          {estorno && (
            <Botao
              variante="perigo"
              onClick={() =>
                remover.mutate(estorno.id, {
                  onSuccess: () => {
                    avisar('Estorno removido.');
                    aoFechar();
                  },
                })
              }
            >
              Remover
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
        <Campo rotulo="Nº da apólice">
          <Entrada {...register('numeroApolice')} />
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
          <Selecao {...register('responsavelId')}>
            <option value="">Escolha…</option>
            {equipe.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </Selecao>
        </Campo>
        <Campo rotulo="Comissão estornada pela seguradora (R$)" obrigatorio erro={erros.valor?.message}>
          <Entrada inputMode="decimal" {...register('valor')} />
        </Campo>
        <Campo rotulo="Desconto do produtor (R$)" obrigatorio erro={erros.descontoProdutor?.message}>
          <Entrada inputMode="decimal" {...register('descontoProdutor')} />
        </Campo>
        <Campo rotulo="Observações" className="span-todo">
          <Entrada {...register('observacoes')} />
        </Campo>
      </form>
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
  const { register, handleSubmit, formState, setError } = useForm<z.infer<typeof esquemaVale>>({
    resolver: zodResolver(esquemaVale),
    defaultValues: {
      responsavelId: vale?.responsavelId ?? '',
      data: vale?.data ?? hojeISO(),
      valor: centavosParaTexto(vale?.valor),
      motivo: vale?.motivo ?? '',
    },
  });
  const enviar = handleSubmit(async (v) => {
    try {
      await salvar.mutateAsync({
        ...(vale ?? {}),
        ...v,
        motivo: v.motivo.trim() || undefined,
        valor: cent(v.valor),
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
      rodape={
        <>
          {vale && (
            <Botao
              variante="perigo"
              onClick={() =>
                remover.mutate(vale.id, {
                  onSuccess: () => {
                    avisar('Vale removido.');
                    aoFechar();
                  },
                })
              }
            >
              Remover
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
            {equipe.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </Selecao>
        </Campo>
        <Campo rotulo="Data" obrigatorio erro={erros.data?.message}>
          <Entrada type="date" {...register('data')} />
        </Campo>
        <Campo rotulo="Valor (R$)" obrigatorio erro={erros.valor?.message}>
          <Entrada inputMode="decimal" {...register('valor')} />
        </Campo>
        <Campo rotulo="Motivo">
          <Entrada {...register('motivo')} />
        </Campo>
      </form>
    </Modal>
  );
}
