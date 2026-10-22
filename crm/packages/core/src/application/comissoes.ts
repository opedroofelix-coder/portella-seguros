import type { LancamentoComissao } from '../domain/comissao';
import { validarComissao } from '../domain/comissao';
import type { DadosRegistro, Registro } from '../domain/registro';
import type { Usuario } from '../domain/usuario';
import type { Ambiente } from '../ports/relogio';
import type { Repositorio } from '../ports/repositorio';
import { ServicoCarteira } from './carteira';
import { exigir } from './permissoes';

/**
 * Comissões são dados financeiros: o corretor consulta as suas, mas só administrador e gestor
 * lançam, dão baixa e registram repasses.
 */
export class ServicoComissoes extends ServicoCarteira<LancamentoComissao> {
  constructor(repositorio: Repositorio<LancamentoComissao>, ambiente?: Ambiente) {
    super(repositorio, validarComissao, ambiente);
  }

  override async salvar(usuario: Usuario, dados: DadosRegistro<LancamentoComissao>) {
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
