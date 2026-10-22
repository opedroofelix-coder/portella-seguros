import type { GatewayAutenticacao, Repositorio, Usuario } from '@portella/core';
import { ErroAutenticacao } from '@portella/core';

export interface Credencial {
  id: string; // id do usuário
  email: string;
  sal: string;
  hash: string;
}

interface Sessao {
  usuarioId: string;
  expiraEm: number;
}

/** Armazenamento da sessão (localStorage no navegador; memória nos testes). */
export interface ArmazenamentoSessao {
  getItem(chave: string): string | null;
  setItem(chave: string, valor: string): void;
  removeItem(chave: string): void;
}

const ITERACOES = 210_000;
const DURACAO_SESSAO_MS = 12 * 60 * 60 * 1000;

const paraBase64 = (bytes: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes))));
const deBase64 = (texto: string) => Uint8Array.from(atob(texto), (c) => c.charCodeAt(0));

async function derivar(senha: string, sal: Uint8Array): Promise<string> {
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: ITERACOES }, chave, 256);
  return paraBase64(bits);
}

/**
 * Autenticação local: senhas com PBKDF2-SHA-256 e sal aleatório, guardadas no IndexedDB.
 * Serve para uso num único computador e para desenvolvimento. Em produção com vários
 * usuários, troque por um backend (a interface GatewayAutenticacao continua a mesma).
 */
export class AutenticacaoLocal implements GatewayAutenticacao {
  constructor(
    private readonly credenciais: Repositorio<Credencial>,
    private readonly armazenamento: ArmazenamentoSessao,
    private readonly chaveSessao: string,
    private readonly agora: () => number = Date.now,
  ) {}

  async verificarCredenciais(email: string, senha: string): Promise<string> {
    const todas = await this.credenciais.listar();
    const c = todas.find((x) => x.email === email);
    // Deriva mesmo sem usuário, para não revelar pelo tempo de resposta se o e-mail existe.
    const hash = await derivar(senha, c ? deBase64(c.sal) : new Uint8Array(16));
    if (!c || hash !== c.hash) throw new ErroAutenticacao();
    return c.id;
  }

  async definirSenha(usuario: Pick<Usuario, 'id' | 'email'>, senha: string): Promise<void> {
    const sal = crypto.getRandomValues(new Uint8Array(16));
    await this.credenciais.salvar({ id: usuario.id, email: usuario.email, sal: paraBase64(sal), hash: await derivar(senha, sal) });
  }

  async iniciarSessao(usuarioId: string): Promise<void> {
    const sessao: Sessao = { usuarioId, expiraEm: this.agora() + DURACAO_SESSAO_MS };
    this.armazenamento.setItem(this.chaveSessao, JSON.stringify(sessao));
  }

  async encerrarSessao(): Promise<void> {
    this.armazenamento.removeItem(this.chaveSessao);
  }

  async usuarioIdDaSessao(): Promise<string | null> {
    try {
      const bruto = this.armazenamento.getItem(this.chaveSessao);
      if (!bruto) return null;
      const sessao = JSON.parse(bruto) as Sessao;
      if (sessao.expiraEm < this.agora()) {
        this.armazenamento.removeItem(this.chaveSessao);
        return null;
      }
      return sessao.usuarioId;
    } catch {
      return null;
    }
  }
}

export class ArmazenamentoMemoria implements ArmazenamentoSessao {
  private readonly dados = new Map<string, string>();
  getItem(chave: string) {
    return this.dados.get(chave) ?? null;
  }
  setItem(chave: string, valor: string) {
    this.dados.set(chave, valor);
  }
  removeItem(chave: string) {
    this.dados.delete(chave);
  }
}

/** localStorage pode estar indisponível (modo privado, bloqueio); cai para memória. */
export function armazenamentoDoNavegador(): ArmazenamentoSessao {
  try {
    const teste = '__portella__';
    localStorage.setItem(teste, '1');
    localStorage.removeItem(teste);
    return localStorage;
  } catch {
    return new ArmazenamentoMemoria();
  }
}
