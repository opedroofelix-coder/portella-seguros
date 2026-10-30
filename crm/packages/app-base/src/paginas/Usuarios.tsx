import { zodResolver } from '@hookform/resolvers/zod';
import type { Perfil, Usuario } from '@portella/core';
import { PERFIS, sugerirLogin } from '@portella/core';
import {
  Botao,
  CabecalhoPagina,
  Campo,
  Cartao,
  Carregando,
  ConfirmarAcao,
  Entrada,
  Modal,
  Selecao,
  Selo,
  Tabela,
  useAvisos,
} from '@portella/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useRefinada, useRotuloPerfil } from '../config';
import { aplicarErros, mensagemErro } from '../erros';
import { useCatalogo, useEquipe } from '../hooks/dados';
import { useServicos } from '../servicos';
import { CHAVE_SESSAO, useUsuario } from '../sessao/Sessao';

const TOM_PERFIL = { admin: 'dourado', gestor: 'info', corretor: 'neutro' } as const;
const percentual = z
  .string()
  .refine(
    (v) => !v.trim() || (/^\d+([.,]\d+)?$/.test(v.trim()) && Number(v.replace(',', '.')) <= 100),
    'Entre 0 e 100.',
  );
const paraNumero = (v: string) => (v.trim() ? Number(v.replace(',', '.')) : undefined);

export function PaginaUsuarios() {
  const { equipe, isPending } = useEquipe();
  const [editando, setEditando] = useState<Usuario | 'novo' | null>(null);
  const refinada = useRefinada();
  const rotuloPerfil = useRotuloPerfil();
  // Interface refinada: ativos primeiro, em ordem alfabética; desativados no fim.
  const lista = refinada
    ? [...equipe].sort((a, b) => Number(b.ativo) - Number(a.ativo) || a.nome.localeCompare(b.nome, 'pt-BR'))
    : equipe;

  return (
    <>
      <CabecalhoPagina
        titulo={
          <>
            Usuários e <em>produtores</em>
          </>
        }
        descricao="Todo usuário novo entra com a senha 1234 e cria a própria senha no primeiro acesso."
        acoes={
          <Botao icone="mais" onClick={() => setEditando('novo')}>
            Novo usuário
          </Botao>
        }
      />
      <Cartao>
        {isPending ? (
          <Carregando />
        ) : (
          <Tabela
            rotulo="Usuários"
            itens={lista}
            chave={(u) => u.id}
            aoClicar={setEditando}
            colunas={[
              { chave: 'nome', titulo: 'Nome', principal: true, render: (u) => u.nome },
              { chave: 'login', titulo: 'Usuário', render: (u) => u.login },
              {
                chave: 'perfil',
                titulo: 'Perfil',
                render: (u) => <Selo tom={TOM_PERFIL[u.perfil]}>{rotuloPerfil(u.perfil)}</Selo>,
              },
              {
                chave: 'repasse',
                titulo: 'Repasse padrão',
                alinharDireita: true,
                render: (u) => (u.percentualRepasse != null ? `${u.percentualRepasse}%` : '—'),
              },
              {
                chave: 'ativo',
                titulo: 'Situação',
                render: (u) =>
                  !u.ativo ? (
                    <Selo tom="perigo">Desativado</Selo>
                  ) : u.trocarSenha ? (
                    <Selo tom="alerta">{refinada ? 'Aguardando 1º acesso' : 'Senha 1234'}</Selo>
                  ) : (
                    <Selo tom="sucesso">Ativo</Selo>
                  ),
              },
            ]}
          />
        )}
      </Cartao>
      {editando === 'novo' && <ModalNovoUsuario aoFechar={() => setEditando(null)} />}
      {editando && editando !== 'novo' && (
        <ModalEditarUsuario usuario={editando} aoFechar={() => setEditando(null)} />
      )}
    </>
  );
}

const esquemaNovo = z.object({
  nome: z.string().trim().min(2, 'Informe o nome.'),
  login: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9._@-]{3,60}$/, 'Ao menos 3 letras ou números, sem espaços.'),
  perfil: z.enum(PERFIS),
  percentualRepasse: percentual,
});

function ModalNovoUsuario({ aoFechar }: { aoFechar: () => void }) {
  const ator = useUsuario();
  const { usuarios } = useServicos();
  const { equipe } = useEquipe();
  const cliente = useQueryClient();
  const { avisar } = useAvisos();
  const rotuloPerfil = useRotuloPerfil();
  const { register, handleSubmit, formState, setError, setValue, getValues } = useForm<
    z.infer<typeof esquemaNovo>
  >({
    resolver: zodResolver(esquemaNovo),
    defaultValues: { perfil: 'corretor', login: '', percentualRepasse: '' },
  });
  const criar = useMutation({
    mutationFn: (d: z.infer<typeof esquemaNovo>) =>
      usuarios.criar(ator, {
        nome: d.nome,
        login: d.login,
        perfil: d.perfil,
        percentualRepasse: paraNumero(d.percentualRepasse),
      }),
    onSuccess: async (u) => {
      await cliente.invalidateQueries({ queryKey: ['usuarios'] });
      avisar(`${u.nome} foi cadastrado. Usuário: ${u.login} · senha inicial 1234.`);
      aoFechar();
    },
    onError: (e) => {
      aplicarErros(e, setError);
      avisar(mensagemErro(e), 'erro');
    },
  });

  return (
    <Modal
      aberto
      titulo="Novo usuário"
      aoFechar={aoFechar}
      alterado={formState.isDirty}
      bloqueado={criar.isPending}
      rodape={
        <>
          <Botao variante="secundario" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" form="form-usuario" carregando={criar.isPending}>
            Cadastrar
          </Botao>
        </>
      }
    >
      <form id="form-usuario" className="grade-2" onSubmit={handleSubmit((d) => criar.mutate(d))} noValidate>
        <Campo rotulo="Nome" obrigatorio erro={formState.errors.nome?.message}>
          <Entrada
            {...register('nome', {
              onBlur: (e) => {
                if (!getValues('login'))
                  setValue(
                    'login',
                    sugerirLogin(
                      e.target.value,
                      equipe.map((u) => u.login),
                    ),
                  );
              },
            })}
          />
        </Campo>
        <Campo
          rotulo="Usuário (para entrar)"
          obrigatorio
          erro={formState.errors.login?.message}
          dica="Sugerido pelo primeiro nome."
        >
          <Entrada autoCapitalize="none" spellCheck={false} {...register('login')} />
        </Campo>
        <Campo rotulo="Perfil" obrigatorio>
          <Selecao {...register('perfil')}>
            {PERFIS.map((p) => (
              <option key={p} value={p}>
                {rotuloPerfil(p)}
              </option>
            ))}
          </Selecao>
        </Campo>
        <Campo
          rotulo="Repasse padrão (%)"
          erro={formState.errors.percentualRepasse?.message}
          dica="Sugerido nas propostas deste produtor."
        >
          <Entrada inputMode="decimal" placeholder="Ex.: 40" {...register('percentualRepasse')} />
        </Campo>
        <p className="texto-suave span-todo" style={{ margin: 0 }}>
          Senha inicial: <strong>1234</strong>. A troca é obrigatória no primeiro acesso.
        </p>
      </form>
    </Modal>
  );
}

function ModalEditarUsuario({ usuario, aoFechar }: { usuario: Usuario; aoFechar: () => void }) {
  const ator = useUsuario();
  const { usuarios } = useServicos();
  const cliente = useQueryClient();
  const { avisar } = useAvisos();
  const [nome, setNome] = useState(usuario.nome);
  const [perfil, setPerfil] = useState<Perfil>(usuario.perfil);
  const [ativo, setAtivo] = useState(usuario.ativo);
  const [repasse, setRepasse] = useState(
    usuario.percentualRepasse != null ? String(usuario.percentualRepasse) : '',
  );
  const [atendidos, setAtendidos] = useState<string[]>(usuario.produtosAtendidos ?? []);
  const produtos = useCatalogo('produtos');
  const { equipe } = useEquipe();
  const [confirmarSenha, setConfirmarSenha] = useState(false);
  const [confirmarDesativar, setConfirmarDesativar] = useState(false);
  const refinada = useRefinada();
  const rotuloPerfil = useRotuloPerfil();
  const proprio = usuario.id === ator.id;
  const Envoltorio = refinada ? 'form' : 'div';
  const repasseValido = percentual.safeParse(repasse).success;
  const nomeValido = !refinada || nome.trim().length >= 2;
  const alterado =
    nome !== usuario.nome ||
    perfil !== usuario.perfil ||
    ativo !== usuario.ativo ||
    repasse !== (usuario.percentualRepasse != null ? String(usuario.percentualRepasse) : '') ||
    [...atendidos].sort().join('|') !== [...(usuario.produtosAtendidos ?? [])].sort().join('|');
  /** Quem já atende cada produto (um produto vai para uma pessoa só). */
  const atendidoPor = (produto: string) =>
    equipe.find((u) => u.id !== usuario.id && u.ativo && u.produtosAtendidos?.includes(produto));
  // Desativar tira o acesso na hora (e derruba a sessão aberta): confirma antes.
  const pedirSalvar = () => {
    if (!repasseValido || !nomeValido) return;
    if (refinada && usuario.ativo && !ativo) setConfirmarDesativar(true);
    else salvar.mutate();
  };

  const atualizarCache = async () => {
    await cliente.invalidateQueries({ queryKey: ['usuarios'] });
    if (usuario.id === ator.id) await cliente.invalidateQueries({ queryKey: CHAVE_SESSAO });
  };
  const salvar = useMutation({
    mutationFn: () =>
      usuarios.atualizar(ator, usuario.id, {
        nome: refinada ? nome.trim() : nome,
        perfil,
        ativo,
        percentualRepasse: paraNumero(repasse),
        produtosAtendidos: atendidos.length ? atendidos : undefined,
      }),
    onSuccess: async () => {
      await atualizarCache();
      avisar('Usuário atualizado.');
      aoFechar();
    },
    onError: (e) => avisar(mensagemErro(e), 'erro'),
  });
  const redefinir = useMutation({
    mutationFn: () => usuarios.redefinirSenhaPadrao(ator, usuario.id),
    onSuccess: async () => {
      await atualizarCache();
      setConfirmarSenha(false);
      avisar(`Senha de ${usuario.nome} redefinida para 1234.`);
    },
    onError: (e) => avisar(mensagemErro(e), 'erro'),
  });

  return (
    <>
      <Modal
        aberto
        titulo={usuario.nome}
        aoFechar={aoFechar}
        alterado={alterado}
        bloqueado={salvar.isPending}
        rodape={
          <>
            {!(refinada && proprio) && (
              <Botao variante="secundario" onClick={() => setConfirmarSenha(true)}>
                Redefinir senha para 1234
              </Botao>
            )}
            <Botao variante="secundario" onClick={aoFechar}>
              Cancelar
            </Botao>
            <Botao
              type={refinada ? 'submit' : 'button'}
              form={refinada ? 'form-editar-usuario' : undefined}
              onClick={refinada ? undefined : () => salvar.mutate()}
              carregando={salvar.isPending}
              disabled={!repasseValido || !nomeValido}
            >
              Salvar
            </Botao>
          </>
        }
      >
        {/* Com a interface refinada é um <form>: Enter salva. */}
        <Envoltorio
          {...(refinada
            ? {
                id: 'form-editar-usuario',
                noValidate: true,
                onSubmit: (e: FormEvent) => {
                  e.preventDefault();
                  pedirSalvar();
                },
              }
            : {})}
          className="grade-2"
        >
          <Campo rotulo="Nome" obrigatorio={refinada} erro={nomeValido ? undefined : 'Informe o nome.'}>
            <Entrada value={nome} onChange={(e) => setNome(e.target.value)} />
          </Campo>
          <Campo rotulo="Usuário">
            <Entrada value={usuario.login} disabled />
          </Campo>
          <Campo rotulo="Perfil">
            <Selecao value={perfil} onChange={(e) => setPerfil(e.target.value as Perfil)}>
              {PERFIS.map((p) => (
                <option key={p} value={p}>
                  {rotuloPerfil(p)}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Situação">
            <Selecao
              value={ativo ? 'ativo' : 'inativo'}
              onChange={(e) => setAtivo(e.target.value === 'ativo')}
            >
              <option value="ativo">Ativo</option>
              <option value="inativo">Desativado (não consegue entrar)</option>
            </Selecao>
          </Campo>
          <Campo rotulo="Repasse padrão (%)" erro={repasseValido ? undefined : 'Entre 0 e 100.'}>
            <Entrada inputMode="decimal" value={repasse} onChange={(e) => setRepasse(e.target.value)} />
          </Campo>
          <fieldset className="span-todo" style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
            <legend style={{ fontSize: 13, fontWeight: 500, marginBottom: 4, padding: 0 }}>
              Recebe as cotações novas de
            </legend>
            <p className="texto-suave" style={{ margin: '0 0 8px', fontSize: 13 }}>
              A cotação nova destes produtos vai direto para {nome.trim().split(' ')[0] || 'esta pessoa'},
              mesmo quando outro produtor cadastra (ex.: Consórcio → Gabriel).
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
              {[...new Set([...produtos, ...atendidos])].map((p) => {
                const outro = atendidoPor(p);
                return (
                  <label
                    key={p}
                    style={{
                      display: 'inline-flex',
                      gap: 8,
                      alignItems: 'center',
                      fontSize: 14,
                      minHeight: 44,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={atendidos.includes(p)}
                      onChange={(e) =>
                        setAtendidos((a) => (e.target.checked ? [...a, p] : a.filter((x) => x !== p)))
                      }
                    />
                    {p}
                    {outro && <span className="texto-suave">({outro.nome})</span>}
                  </label>
                );
              })}
            </div>
          </fieldset>
        </Envoltorio>
      </Modal>
      {refinada && (
        <ConfirmarAcao
          aberto={confirmarDesativar}
          titulo={`Desativar ${usuario.nome}?`}
          mensagem="A pessoa perde o acesso na hora, inclusive se estiver com o sistema aberto. As propostas e clientes dela continuam no sistema."
          textoConfirmar="Desativar e salvar"
          perigo
          carregando={salvar.isPending}
          aoCancelar={() => setConfirmarDesativar(false)}
          aoConfirmar={() => salvar.mutate()}
        />
      )}
      <ConfirmarAcao
        aberto={confirmarSenha}
        titulo="Redefinir senha?"
        mensagem={`A senha de ${usuario.nome} volta a ser 1234 e será trocada no próximo acesso.`}
        textoConfirmar="Redefinir"
        carregando={redefinir.isPending}
        aoConfirmar={() => redefinir.mutate()}
        aoCancelar={() => setConfirmarSenha(false)}
      />
    </>
  );
}
