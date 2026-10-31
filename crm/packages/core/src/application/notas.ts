import { ErroNaoEncontrado, ErroPermissao } from '../domain/erros';
import type { ItemChecklist, Recado } from '../domain/notas';
import { recadoPara, validarItemChecklist, validarRecado } from '../domain/notas';
import type { Usuario } from '../domain/usuario';
import type { Ambiente } from '../ports/relogio';
import { ambientePadrao } from '../ports/relogio';
import type { Repositorio } from '../ports/repositorio';
import { exigir, pode } from './permissoes';

/** Checklist pessoal: cada um lista, cria, marca e apaga só os próprios itens. */
export class ServicoChecklist {
  constructor(
    private readonly repositorio: Repositorio<ItemChecklist>,
    private readonly ambiente: Ambiente = ambientePadrao,
  ) {}

  async listar(usuario: Usuario): Promise<ItemChecklist[]> {
    return (await this.repositorio.listar())
      .filter((i) => i.responsavelId === usuario.id)
      .sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
  }

  async adicionar(usuario: Usuario, texto: string): Promise<ItemChecklist> {
    validarItemChecklist({ texto });
    const agora = this.ambiente.agora().toISOString();
    const item: ItemChecklist = {
      id: this.ambiente.gerarId(),
      responsavelId: usuario.id,
      texto: texto.trim(),
      criadoEm: agora,
      atualizadoEm: agora,
    };
    await this.repositorio.salvar(item);
    return item;
  }

  async marcar(usuario: Usuario, id: string, feito: boolean): Promise<ItemChecklist> {
    const item = await this.doUsuario(usuario, id);
    const agora = this.ambiente.agora().toISOString();
    const { feitoEm: _antes, ...resto } = item;
    const novo: ItemChecklist = feito
      ? { ...resto, feito: true, feitoEm: agora, atualizadoEm: agora }
      : { ...resto, feito: false, atualizadoEm: agora };
    await this.repositorio.salvar(novo);
    return novo;
  }

  async remover(usuario: Usuario, id: string): Promise<void> {
    await this.doUsuario(usuario, id);
    await this.repositorio.remover(id);
  }

  /** Apaga os itens já feitos. */
  async limparFeitos(usuario: Usuario): Promise<number> {
    const feitos = (await this.listar(usuario)).filter((i) => i.feito);
    for (const i of feitos) await this.repositorio.remover(i.id);
    return feitos.length;
  }

  private async doUsuario(usuario: Usuario, id: string): Promise<ItemChecklist> {
    const item = await this.repositorio.obter(id);
    // O item de outra pessoa nem aparece: para quem pergunta, ele não existe.
    if (!item || item.responsavelId !== usuario.id) throw new ErroNaoEncontrado('Item não encontrado.');
    return item;
  }
}

/**
 * Recados da equipe: a administração (e a gestão) escreve, apaga e vê todos; o produtor vê os recados
 * para ele e para toda a equipe e marca o próprio "feito".
 */
export class ServicoRecados {
  constructor(
    private readonly repositorio: Repositorio<Recado>,
    private readonly ambiente: Ambiente = ambientePadrao,
  ) {}

  async listar(usuario: Usuario): Promise<Recado[]> {
    const gestao = pode(usuario, 'financeiro:gerenciar');
    return (await this.repositorio.listar())
      .filter((r) => gestao || recadoPara(r, usuario.id))
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  }

  async enviar(usuario: Usuario, dados: Pick<Recado, 'texto' | 'para' | 'prazo'>): Promise<Recado> {
    exigir(usuario, 'financeiro:gerenciar');
    validarRecado(dados);
    const agora = this.ambiente.agora().toISOString();
    const recado: Recado = {
      id: this.ambiente.gerarId(),
      responsavelId: usuario.id,
      texto: dados.texto.trim(),
      para: dados.para,
      ...(dados.prazo ? { prazo: dados.prazo } : {}),
      criadoEm: agora,
      atualizadoEm: agora,
    };
    await this.repositorio.salvar(recado);
    return recado;
  }

  /** Marca (ou desmarca) o recado como feito por quem recebeu. */
  async marcarFeito(usuario: Usuario, id: string, feito: boolean): Promise<Recado> {
    const recado = await this.repositorio.obter(id);
    if (!recado || !(recadoPara(recado, usuario.id) || pode(usuario, 'financeiro:gerenciar')))
      throw new ErroNaoEncontrado('Recado não encontrado.');
    if (!recadoPara(recado, usuario.id))
      throw new ErroPermissao('Só quem recebeu o recado marca como feito.');
    const agora = this.ambiente.agora().toISOString();
    const { [usuario.id]: _antes, ...outros } = recado.feitos ?? {};
    const feitos = feito ? { ...outros, [usuario.id]: agora } : outros;
    const novo: Recado = { ...recado, feitos, atualizadoEm: agora };
    await this.repositorio.salvar(novo);
    return novo;
  }

  async remover(usuario: Usuario, id: string): Promise<void> {
    exigir(usuario, 'financeiro:gerenciar');
    await this.repositorio.remover(id);
  }
}
