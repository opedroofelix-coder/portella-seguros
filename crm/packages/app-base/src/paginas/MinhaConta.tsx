import { zodResolver } from '@hookform/resolvers/zod';
import { SENHA_PADRAO, SENHA_TAMANHO_MINIMO } from '@portella/core';
import { Botao, CabecalhoPagina, Campo, Cartao, Entrada, SeletorTema, useAvisos } from '@portella/ui';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useConfig, useRefinada, useRotuloPerfil } from '../config';
import { mensagemErro } from '../erros';
import { InstalarAplicativo } from '../instalacao';
import { useServicos } from '../servicos';
import { useSessao, useUsuario } from '../sessao/Sessao';
import styles from './Entrar.module.css';

const esquema = z
  .object({
    atual: z.string().min(1, 'Informe a senha atual.'),
    nova: z
      .string()
      .min(SENHA_TAMANHO_MINIMO, `Mínimo de ${SENHA_TAMANHO_MINIMO} caracteres.`)
      .refine((v) => v !== SENHA_PADRAO, 'Escolha uma senha diferente de 1234.'),
    confirmacao: z.string(),
  })
  .refine((d) => d.nova === d.confirmacao, { path: ['confirmacao'], message: 'As senhas não conferem.' });

function FormularioTrocarSenha({ senhaAtualConhecida }: { senhaAtualConhecida?: string }) {
  const usuario = useUsuario();
  const { usuarios } = useServicos();
  const { atualizar } = useSessao();
  const { avisar } = useAvisos();
  const refinada = useRefinada();
  const { register, handleSubmit, formState, reset } = useForm<z.infer<typeof esquema>>({
    resolver: zodResolver(esquema),
    defaultValues: { atual: senhaAtualConhecida ?? '', nova: '', confirmacao: '' },
  });

  const enviar = handleSubmit(async ({ atual, nova }) => {
    try {
      await usuarios.alterarPropriaSenha(usuario, atual, nova);
      reset();
      avisar('Senha alterada.');
      await atualizar();
    } catch (e) {
      avisar(mensagemErro(e), 'erro');
    }
  });

  return (
    <form className="grade" onSubmit={enviar} noValidate>
      {!senhaAtualConhecida && (
        <Campo rotulo="Senha atual" erro={formState.errors.atual?.message}>
          <Entrada type="password" autoComplete="current-password" {...register('atual')} />
        </Campo>
      )}
      <Campo
        rotulo="Nova senha"
        erro={formState.errors.nova?.message}
        dica={
          refinada
            ? `Mínimo de ${SENHA_TAMANHO_MINIMO} caracteres, diferente de ${SENHA_PADRAO}.`
            : `Mínimo de ${SENHA_TAMANHO_MINIMO} caracteres.`
        }
      >
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
  );
}

export function PaginaMinhaConta() {
  const usuario = useUsuario();
  const rotuloPerfil = useRotuloPerfil();
  return (
    <>
      <CabecalhoPagina
        titulo={
          <>
            Minha <em>conta</em>
          </>
        }
        descricao={`Usuário ${usuario.login} · ${rotuloPerfil(usuario.perfil)}${usuario.percentualRepasse != null ? ` · repasse padrão ${usuario.percentualRepasse}%` : ''}`}
      />
      <div className="grade-2" style={{ alignItems: 'start' }}>
        <Cartao titulo="Trocar senha">
          <FormularioTrocarSenha />
        </Cartao>
        <Cartao titulo="Aparência">
          <div className="grade">
            <p className="texto-suave" style={{ margin: 0 }}>
              Escolha o tema da tela. Automático segue o modo claro ou escuro do seu aparelho.
            </p>
            <SeletorTema />
          </div>
        </Cartao>
        <Cartao titulo="Aplicativo">
          <InstalarAplicativo />
        </Cartao>
      </div>
    </>
  );
}

/** Tela única para quem entrou com a senha provisória 1234: só segue depois de trocar. */
export function TrocaObrigatoria() {
  const usuario = useUsuario();
  const { sair } = useSessao();
  const { logo, sistema } = useConfig();
  return (
    <div className={styles.tela}>
      <main className={styles.caixa}>
        <div className={styles.marca}>
          <img src={logo} alt="Portella Corretora de Seguros" />
          <span className="rotulo">CRM {sistema}</span>
        </div>
        <h1 className={styles.titulo}>Crie sua senha</h1>
        <p className={styles.texto}>
          Olá, {usuario.nome.split(' ')[0]}. Você entrou com a senha provisória. Escolha uma senha só sua para
          continuar.
        </p>
        <FormularioTrocarSenha senhaAtualConhecida={SENHA_PADRAO} />
        <Botao variante="fantasma" onClick={() => sair()}>
          Sair
        </Botao>
      </main>
    </div>
  );
}
