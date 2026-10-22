import { zodResolver } from '@hookform/resolvers/zod';
import type { Perfil, Usuario } from '@portella/core';
import { formatarData, PERFIS, ROTULO_PERFIL, SENHA_TAMANHO_MINIMO } from '@portella/core';
import {
  Botao,
  CabecalhoPagina,
  Campo,
  Cartao,
  Carregando,
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

export function PaginaUsuarios() {
  const { equipe, isPending } = useEquipe();
  const [editando, setEditando] = useState<Usuario | 'novo' | null>(null);

  return (
    <>
      <CabecalhoPagina
        titulo={
          <>
            Usuários e <em>perfis</em>
          </>
        }
        descricao="Administradores gerenciam a equipe; gestores veem toda a carteira; corretores, só a própria."
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
              { chave: 'email', titulo: 'E-mail', render: (u) => u.email },
              {
                chave: 'perfil',
                titulo: 'Perfil',
                render: (u) => <Selo tom={TOM_PERFIL[u.perfil]}>{ROTULO_PERFIL[u.perfil]}</Selo>,
              },
              {
                chave: 'ativo',
                titulo: 'Situação',
                render: (u) =>
                  u.ativo ? <Selo tom="sucesso">Ativo</Selo> : <Selo tom="perigo">Desativado</Selo>,
              },
              {
                chave: 'criado',
                titulo: 'Desde',
                ocultarNoMobile: true,
                render: (u) => formatarData(u.criadoEm),
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
  email: z.string().trim().email('Informe um e-mail válido.'),
  perfil: z.enum(PERFIS),
  senha: z.string().min(SENHA_TAMANHO_MINIMO, `Mínimo de ${SENHA_TAMANHO_MINIMO} caracteres.`),
});

function ModalNovoUsuario({ aoFechar }: { aoFechar: () => void }) {
  const ator = useUsuario();
  const { usuarios } = useServicos();
  const cliente = useQueryClient();
  const { avisar } = useAvisos();
  const { register, handleSubmit, formState, setError } = useForm<z.infer<typeof esquemaNovo>>({
    resolver: zodResolver(esquemaNovo),
    defaultValues: { perfil: 'corretor' },
  });
  const criar = useMutation({
    mutationFn: (d: z.infer<typeof esquemaNovo>) => usuarios.criar(ator, d),
    onSuccess: async (u) => {
      await cliente.invalidateQueries({ queryKey: ['usuarios'] });
      avisar(`${u.nome} foi cadastrado.`);
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
          <Entrada {...register('nome')} />
        </Campo>
        <Campo rotulo="E-mail" obrigatorio erro={formState.errors.email?.message}>
          <Entrada type="email" {...register('email')} />
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
          rotulo="Senha inicial"
          obrigatorio
          erro={formState.errors.senha?.message}
          dica="Combine com a pessoa para trocá-la no primeiro acesso."
        >
          <Entrada type="password" autoComplete="new-password" {...register('senha')} />
        </Campo>
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
  const [senha, setSenha] = useState('');

  const salvar = useMutation({
    mutationFn: async () => {
      await usuarios.atualizar(ator, usuario.id, { nome, perfil, ativo });
      if (senha) await usuarios.redefinirSenha(ator, usuario.id, senha);
    },
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: ['usuarios'] });
      if (usuario.id === ator.id) await cliente.invalidateQueries({ queryKey: CHAVE_SESSAO });
      avisar('Usuário atualizado.');
      aoFechar();
    },
    onError: (e) => avisar(mensagemErro(e), 'erro'),
  });

  return (
    <Modal
      aberto
      titulo={usuario.nome}
      aoFechar={aoFechar}
      rodape={
        <>
          <Botao variante="secundario" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao onClick={() => salvar.mutate()} carregando={salvar.isPending}>
            Salvar
          </Botao>
        </>
      }
    >
      <div className="grade-2">
        <Campo rotulo="Nome">
          <Entrada value={nome} onChange={(e) => setNome(e.target.value)} />
        </Campo>
        <Campo rotulo="E-mail">
          <Entrada value={usuario.email} disabled />
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
          <Selecao value={ativo ? 'ativo' : 'inativo'} onChange={(e) => setAtivo(e.target.value === 'ativo')}>
            <option value="ativo">Ativo</option>
            <option value="inativo">Desativado (não consegue entrar)</option>
          </Selecao>
        </Campo>
        <Campo rotulo="Nova senha" dica="Deixe em branco para manter a atual." className="span-todo">
          <Entrada
            type="password"
            autoComplete="new-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </Campo>
      </div>
    </Modal>
  );
}
