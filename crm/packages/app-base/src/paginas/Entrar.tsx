import { zodResolver } from '@hookform/resolvers/zod';
import { SENHA_TAMANHO_MINIMO } from '@portella/core';
import { Botao, Campo, Carregando, Entrada } from '@portella/ui';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useConfig, useRefinada } from '../config';
import { aplicarErros, mensagemErro } from '../erros';
import { useServicos } from '../servicos';
import { useSessao } from '../sessao/Sessao';
import styles from './Entrar.module.css';

const esquemaLogin = z.object({
  login: z.string().trim().min(1, 'Informe o usuário.'),
  senha: z.string().min(1, 'Informe a senha.'),
});

const esquemaAdmin = z
  .object({
    nome: z.string().trim().min(2, 'Informe o nome.'),
    login: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9._@-]{3,60}$/, 'Ao menos 3 letras ou números, sem espaços.'),
    senha: z.string().min(SENHA_TAMANHO_MINIMO, `Mínimo de ${SENHA_TAMANHO_MINIMO} caracteres.`),
    confirmacao: z.string(),
  })
  .refine((d) => d.senha === d.confirmacao, { path: ['confirmacao'], message: 'As senhas não conferem.' });

export function PaginaEntrar() {
  const { usuario, carregando, configurado } = useSessao();
  const { sistema, logo } = useConfig();
  const local = useLocation();
  const destino = (local.state as { de?: string } | null)?.de ?? '/';

  if (carregando) return <Carregando />;
  if (usuario) return <Navigate to={destino} replace />;

  return (
    <div className={styles.tela}>
      <main className={styles.caixa}>
        <div className={styles.marca}>
          <img src={logo} alt="Portella Corretora de Seguros" />
          <span className="rotulo">CRM {sistema}</span>
        </div>
        {configurado ? <FormularioLogin destino={destino} /> : <FormularioPrimeiroAcesso />}
      </main>
    </div>
  );
}

function FormularioLogin({ destino }: { destino: string }) {
  const { entrar } = useSessao();
  const navegar = useNavigate();
  const refinada = useRefinada();
  const [mostrar, setMostrar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<z.infer<typeof esquemaLogin>>({
    resolver: zodResolver(esquemaLogin),
  });

  const enviar = handleSubmit(async ({ login, senha }) => {
    setErro(null);
    try {
      await entrar(login, senha);
      navegar(destino, { replace: true });
    } catch (e) {
      setErro(mensagemErro(e));
    }
  });

  return (
    <>
      <h1 className={styles.titulo}>Entrar</h1>
      <form className={styles.form} onSubmit={enviar} noValidate>
        {erro && (
          <p className={styles.erro} role="alert">
            {erro}
          </p>
        )}
        <Campo rotulo="Usuário" erro={formState.errors.login?.message}>
          <Entrada autoComplete="username" autoCapitalize="none" spellCheck={false} {...register('login')} />
        </Campo>
        <Campo rotulo="Senha" erro={formState.errors.senha?.message}>
          <Entrada
            type={refinada && mostrar ? 'text' : 'password'}
            autoComplete="current-password"
            {...register('senha')}
          />
        </Campo>
        {refinada && (
          <label className="opcao-marcar">
            <input type="checkbox" checked={mostrar} onChange={(e) => setMostrar(e.target.checked)} />
            Mostrar a senha
          </label>
        )}
        <Botao type="submit" blocoInteiro carregando={formState.isSubmitting}>
          Entrar
        </Botao>
        {refinada && (
          <p className={styles.texto}>
            Esqueceu a senha? Peça à administradora para redefinir: você entra com 1234 e cria uma nova.
          </p>
        )}
      </form>
    </>
  );
}

function FormularioPrimeiroAcesso() {
  const { usuarios } = useServicos();
  const { produtoresIniciais } = useConfig();
  const refinada = useRefinada();
  const { entrar } = useSessao();
  const [erro, setErro] = useState<string | null>(null);
  const { register, handleSubmit, formState, setError } = useForm<z.infer<typeof esquemaAdmin>>({
    resolver: zodResolver(esquemaAdmin),
  });

  const enviar = handleSubmit(async ({ nome, login, senha }) => {
    setErro(null);
    try {
      const admin = await usuarios.configurarAdministrador({ nome, login, senha });
      // Equipe inicial de produtores (senha 1234, troca no primeiro acesso).
      if (produtoresIniciais?.length) await usuarios.criarProdutoresIniciais(admin, produtoresIniciais);
      await entrar(login, senha);
    } catch (e) {
      aplicarErros(e, setError);
      setErro(mensagemErro(e));
    }
  });

  return (
    <>
      <h1 className={styles.titulo}>Primeiro acesso</h1>
      {refinada && produtoresIniciais?.length ? (
        <p className={styles.texto}>
          Crie a conta de administrador. A equipe já entra cadastrada, com usuário igual ao primeiro nome e
          senha 1234: {produtoresIniciais.map((p) => p.nome).join(', ')}. Ajuste em Usuários depois.
        </p>
      ) : (
        <p className={styles.texto}>
          Crie a conta de administrador. Depois você cadastra a equipe em Usuários.
        </p>
      )}
      <form className={styles.form} onSubmit={enviar} noValidate>
        {erro && (
          <p className={styles.erro} role="alert">
            {erro}
          </p>
        )}
        <Campo rotulo="Nome" erro={formState.errors.nome?.message}>
          <Entrada autoComplete="name" {...register('nome')} />
        </Campo>
        <Campo
          rotulo="Usuário"
          erro={formState.errors.login?.message}
          dica={refinada ? 'Sem espaços. Use um nome diferente do da equipe (ex.: admin).' : 'Ex.: deliziane'}
        >
          <Entrada autoComplete="username" autoCapitalize="none" spellCheck={false} {...register('login')} />
        </Campo>
        <Campo
          rotulo="Senha"
          erro={formState.errors.senha?.message}
          dica={`Mínimo de ${SENHA_TAMANHO_MINIMO} caracteres.`}
        >
          <Entrada type="password" autoComplete="new-password" {...register('senha')} />
        </Campo>
        <Campo rotulo="Confirme a senha" erro={formState.errors.confirmacao?.message}>
          <Entrada type="password" autoComplete="new-password" {...register('confirmacao')} />
        </Campo>
        <Botao type="submit" blocoInteiro carregando={formState.isSubmitting}>
          Criar administrador
        </Botao>
      </form>
    </>
  );
}
