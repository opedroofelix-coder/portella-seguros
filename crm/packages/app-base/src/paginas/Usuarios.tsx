import { zodResolver } from '@hookform/resolvers/zod';
import type { Perfil, Usuario } from '@portella/core';
import { PERFIS, ROTULO_PERFIL, sugerirLogin } from '@portella/core';
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
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { aplicarErros, mensagemErro } from '../erros';
import { useEquipe } from '../hooks/dados';
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
            itens={equipe}
            chave={(u) => u.id}
            aoClicar={setEditando}
            colunas={[
              { chave: 'nome', titulo: 'Nome', principal: true, render: (u) => u.nome },
              { chave: 'login', titulo: 'Usuário', render: (u) => u.login },
              {
                chave: 'perfil',
                titulo: 'Perfil',
                render: (u) => <Selo tom={TOM_PERFIL[u.perfil]}>{ROTULO_PERFIL[u.perfil]}</Selo>,
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
                    <Selo tom="alerta">Senha 1234</Selo>
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
                {ROTULO_PERFIL[p]}
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
  const [confirmarSenha, setConfirmarSenha] = useState(false);
  const repasseValido = percentual.safeParse(repasse).success;

  const atualizarCache = async () => {
    await cliente.invalidateQueries({ queryKey: ['usuarios'] });
    if (usuario.id === ator.id) await cliente.invalidateQueries({ queryKey: CHAVE_SESSAO });
  };
  const salvar = useMutation({
    mutationFn: () =>
      usuarios.atualizar(ator, usuario.id, { nome, perfil, ativo, percentualRepasse: paraNumero(repasse) }),
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
        rodape={
          <>
            <Botao variante="secundario" onClick={() => setConfirmarSenha(true)}>
              Redefinir senha para 1234
            </Botao>
            <Botao variante="secundario" onClick={aoFechar}>
              Cancelar
            </Botao>
            <Botao onClick={() => salvar.mutate()} carregando={salvar.isPending} disabled={!repasseValido}>
              Salvar
            </Botao>
          </>
        }
      >
        <div className="grade-2">
          <Campo rotulo="Nome">
            <Entrada value={nome} onChange={(e) => setNome(e.target.value)} />
          </Campo>
          <Campo rotulo="Usuário">
            <Entrada value={usuario.login} disabled />
          </Campo>
          <Campo rotulo="Perfil">
            <Selecao value={perfil} onChange={(e) => setPerfil(e.target.value as Perfil)}>
              {PERFIS.map((p) => (
                <option key={p} value={p}>
                  {ROTULO_PERFIL[p]}
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
        </div>
      </Modal>
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
