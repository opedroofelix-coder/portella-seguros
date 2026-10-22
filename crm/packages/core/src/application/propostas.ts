import { ErroNaoEncontrado, ErroPermissao } from '../domain/erros';
import type { Proposta, Recebimento } from '../domain/proposta';
import { participa, saldoReceber, validarProposta } from '../domain/proposta';
import type { DadosRegistro, Registro } from '../domain/registro';
import type { Usuario } from '../domain/usuario';
import type { Ambiente } from '../ports/relogio';
import type { Repositorio } from '../ports/repositorio';
import { ServicoCarteira } from './carteira';
import { enxerga, exigir, pode } from './permissoes';

const gestao = (u: Usuario) => pode(u, 'financeiro:gerenciar');

/**
 * Propostas:
 *  - o produtor lança → fica "pendente" até a administração aprovar; enquanto pendente, ele edita e exclui;
 *  - aprovada, só a administração altera (inclusive comissões adicionais que chegam depois);
 *  - só a administração lança os recebimentos da seguradora (baixa);
 *  - cada produtor vê as propostas que lançou e aquelas em que participa da divisão.
 */
export class ServicoPropostas extends ServicoCarteira<Proposta> {
  constructor(repositorio: Repositorio<Proposta>, ambiente?: Ambiente) {
    super(repositorio, validarProposta, ambiente);
  }

  private visivel(usuario: Usuario, p: Proposta) {
    return enxerga(usuario, p) || (usuario.ativo && participa(p, usuario.id));
  }

  override async listar(usuario: Usuario): Promise<Proposta[]> {
    return (await this.repositorio.listar()).filter((p) => this.visivel(usuario, p));
  }

  override async obter(usuario: Usuario, id: string): Promise<Proposta> {
    const p = await this.repositorio.obter(id);
    if (!p || !this.visivel(usuario, p)) throw new ErroNaoEncontrado('Proposta não encontrada.');
    return p;
  }

  override async salvar(usuario: Usuario, dados: DadosRegistro<Proposta>): Promise<Proposta> {
    const existente = dados.id ? await this.repositorio.obter(dados.id) : null;
    // A administração lança já aprovada; numa proposta existente, aprovar é uma ação à parte.
    if (gestao(usuario))
      return super.salvar(usuario, { ...dados, status: existente ? existente.status : 'aprovada' });

    if (existente) {
      if (existente.responsavelId !== usuario.id) throw new ErroPermissao();
      if (existente.status !== 'pendente') {
        throw new ErroPermissao('Proposta já aprovada: só a administração pode alterar.');
      }
    }
    // O produtor não lança recebimentos nem aprova: isso fica com a administração.
    return super.salvar(usuario, {
      ...dados,
      status: 'pendente',
      recebimentos: existente?.recebimentos ?? [],
      aprovadaEm: undefined,
      aprovadaPor: undefined,
    });
  }

  override async remover(usuario: Usuario, id: string): Promise<void> {
    const p = await this.obter(usuario, id);
    if (gestao(usuario)) return super.remover(usuario, id);
    if (p.responsavelId !== usuario.id || p.status !== 'pendente') {
      throw new ErroPermissao('Só é possível excluir a própria proposta enquanto está pendente.');
    }
    await this.repositorio.remover(id);
  }

  async aprovar(usuario: Usuario, id: string): Promise<Proposta> {
    exigir(usuario, 'financeiro:gerenciar');
    const p = await this.obter(usuario, id);
    const aprovada: Proposta = {
      ...p,
      status: 'aprovada',
      aprovadaEm: this.ambiente.agora().toISOString(),
      aprovadaPor: usuario.id,
      atualizadoEm: this.ambiente.agora().toISOString(),
    };
    validarProposta(aprovada);
    await this.repositorio.salvar(aprovada);
    return aprovada;
  }

  /** Baixa de um recebimento da seguradora. Quitada a comissão principal, o que entra é vitalício. */
  async registrarRecebimento(
    usuario: Usuario,
    id: string,
    recebimento: Omit<Recebimento, 'id'>,
  ): Promise<Proposta> {
    exigir(usuario, 'financeiro:gerenciar');
    const p = await this.obter(usuario, id);
    const vitalicio = recebimento.vitalicio ?? (saldoReceber(p) <= 0 && p.percentualVitalicio != null);
    const novo: Recebimento = {
      ...recebimento,
      id: this.ambiente.gerarId(),
      ...(vitalicio ? { vitalicio: true } : {}),
    };
    const atualizada: Proposta = {
      ...p,
      recebimentos: [...p.recebimentos, novo],
      atualizadoEm: this.ambiente.agora().toISOString(),
    };
    validarProposta(atualizada);
    await this.repositorio.salvar(atualizada);
    return atualizada;
  }
}

/**
 * Lançamentos da administração ligados a um produtor (estornos, vales, pagamentos): o produtor
 * consulta os seus; só administrador e gestor lançam e alteram.
 */
export class ServicoLancamentosGestao<T extends Registro> extends ServicoCarteira<T> {
  override async salvar(usuario: Usuario, dados: DadosRegistro<T>) {
    exigir(usuario, 'financeiro:gerenciar');
    return super.salvar(usuario, dados);
  }

  override async remover(usuario: Usuario, id: string) {
    exigir(usuario, 'financeiro:gerenciar');
    return super.remover(usuario, id);
  }
}

/** Coleção financeira da empresa (extrato, despesas, fechamentos): só administrador e gestor acessam. */
export class ServicoFinanceiro<T extends Registro> extends ServicoCarteira<T> {
  override async listar(usuario: Usuario) {
    exigir(usuario, 'financeiro:gerenciar');
    return super.listar(usuario);
  }

  override async obter(usuario: Usuario, id: string) {
    exigir(usuario, 'financeiro:gerenciar');
    return super.obter(usuario, id);
  }

  override async salvar(usuario: Usuario, dados: DadosRegistro<T>) {
    exigir(usuario, 'financeiro:gerenciar');
    return super.salvar(usuario, dados);
  }

  override async remover(usuario: Usuario, id: string) {
    exigir(usuario, 'financeiro:gerenciar');
    return super.remover(usuario, id);
  }
}
