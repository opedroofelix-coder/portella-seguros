import { zodResolver } from '@hookform/resolvers/zod';
import { ROTULO_PERFIL, SENHA_TAMANHO_MINIMO } from '@portella/core';
import { Botao, CabecalhoPagina, Campo, Cartao, Entrada, useAvisos } from '@portella/ui';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { mensagemErro } from '../erros';
import { useServicos } from '../servicos';
import { useUsuario } from '../sessao/Sessao';

const esquema = z
  .object({
    atual: z.string().min(1, 'Informe a senha atual.'),
    nova: z.string().min(SENHA_TAMANHO_MINIMO, `Mínimo de ${SENHA_TAMANHO_MINIMO} caracteres.`),
    confirmacao: z.string(),
  })
  .refine((d) => d.nova === d.confirmacao, { path: ['confirmacao'], message: 'As senhas não conferem.' });

export function PaginaMinhaConta() {
  const usuario = useUsuario();
  const { usuarios } = useServicos();
  const { avisar } = useAvisos();
  const { register, handleSubmit, formState, reset } = useForm<z.infer<typeof esquema>>({
    resolver: zodResolver(esquema),
  });

  const enviar = handleSubmit(async ({ atual, nova }) => {
    try {
      await usuarios.alterarPropriaSenha(usuario, atual, nova);
      reset();
      avisar('Senha alterada.');
    } catch (e) {
      avisar(mensagemErro(e), 'erro');
    }
  });

  return (
    <>
      <CabecalhoPagina
        titulo={
          <>
            Minha <em>conta</em>
          </>
        }
        descricao={`${usuario.email} · ${ROTULO_PERFIL[usuario.perfil]}`}
      />
      <Cartao titulo="Trocar senha" style={{ maxWidth: 560 }}>
        <form className="grade" onSubmit={enviar} noValidate>
          <Campo rotulo="Senha atual" erro={formState.errors.atual?.message}>
            <Entrada type="password" autoComplete="current-password" {...register('atual')} />
          </Campo>
          <Campo rotulo="Nova senha" erro={formState.errors.nova?.message}>
            <Entrada type="password" autoComplete="new-password" {...register('nova')} />
          </Campo>
          <Campo rotulo="Confirme a nova senha" erro={formState.errors.confirmacao?.message}>
            <Entrada type="password" autoComplete="new-password" {...register('confirmacao')} />
          </Campo>
          <div>
            <Botao type="submit" carregando={formState.isSubmitting}>
              Salvar nova senha
            </Botao>
          </div>
        </form>
      </Cartao>
    </>
  );
}
