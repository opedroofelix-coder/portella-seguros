import { ErroNaoEncontrado } from '../domain/erros';
import type { DadosRegistro, Registro } from '../domain/registro';
import type { Usuario } from '../domain/usuario';
import type { Ambiente } from '../ports/relogio';
import { ambientePadrao } from '../ports/relogio';
import type { Repositorio } from '../ports/repositorio';
import { enxerga, exigir } from './permissoes';

/**
 * Casos de uso de uma coleção da carteira (clientes, apólices, cotas, oportunidades…),
 * aplicando as regras de visibilidade e edição por perfil.
 */
export class ServicoCarteira<T extends Registro> {
  constructor(
    private readonly repositorio: Repositorio<T>,
    private readonly validar: (dados: DadosRegistro<T>) => void = () => {},
    private readonly ambiente: Ambiente = ambientePadrao,
  ) {}

  async listar(usuario: Usuario): Promise<T[]> {
    const todos = await this.repositorio.listar();
    return todos.filter((item) => enxerga(usuario, item));
  }

  async obter(usuario: Usuario, id: string): Promise<T> {
    const item = await this.repositorio.obter(id);
    if (!item || !enxerga(usuario, item)) throw new ErroNaoEncontrado();
    return item;
  }

  async salvar(usuario: Usuario, dados: DadosRegistro<T>): Promise<T> {
    this.validar(dados);
    const agora = this.ambiente.agora().toISOString();
    const existente = dados.id ? await this.repositorio.obter(dados.id) : null;

    let item: T;
    if (existente) {
      exigir(usuario, 'registro:editar', existente);
      const responsavelId = dados.responsavelId ?? existente.responsavelId;
      if (responsavelId !== existente.responsavelId) exigir(usuario, 'registro:transferir');
      item = { ...existente, ...dados, id: existente.id, responsavelId, criadoEm: existente.criadoEm, atualizadoEm: agora } as T;
    } else {
      exigir(usuario, 'registro:criar');
      const responsavelId = dados.responsavelId ?? usuario.id;
      if (responsavelId !== usuario.id) exigir(usuario, 'registro:transferir');
      item = { ...dados, id: dados.id ?? this.ambiente.gerarId(), responsavelId, criadoEm: agora, atualizadoEm: agora } as T;
    }
    await this.repositorio.salvar(item);
    return item;
  }

  async remover(usuario: Usuario, id: string): Promise<void> {
    const item = await this.repositorio.obter(id);
    if (!item || !enxerga(usuario, item)) throw new ErroNaoEncontrado();
    exigir(usuario, 'registro:remover', item);
    await this.repositorio.remover(id);
  }

  /** Importação em lote (planilha). Só administradores. */
  async importar(usuario: Usuario, itens: T[]): Promise<number> {
    exigir(usuario, 'dados:importar');
    await this.repositorio.salvarVarios(itens);
    return itens.length;
  }
}
