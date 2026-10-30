import { normalizar } from '../domain/cliente';
import type { Oportunidade } from '../domain/oportunidade';
import { registrarMovimentacoes } from '../domain/oportunidade';
import type { DadosRegistro } from '../domain/registro';
import type { Usuario } from '../domain/usuario';
import type { Ambiente } from '../ports/relogio';
import { ambientePadrao } from '../ports/relogio';
import type { Repositorio } from '../ports/repositorio';
import { ServicoCarteira } from './carteira';
import { exigir } from './permissoes';

/** Quem atende as cotações novas do produto (ex.: Consórcio → Gabriel), pelos usuários ativos. */
export function responsavelDoProduto(usuarios: Usuario[], produto: string): Usuario | undefined {
  const alvo = normalizar(produto);
  return usuarios.find((u) => u.ativo && u.produtosAtendidos?.some((p) => normalizar(p) === alvo));
}

/**
 * Cotações (funil): além das regras da carteira, registra o histórico de movimentações e encaminha
 * a cotação nova ao responsável pelo produto, mesmo quando quem cadastra é um produtor.
 */
export class ServicoOportunidades extends ServicoCarteira<Oportunidade> {
  constructor(
    repositorio: Repositorio<Oportunidade>,
    validar: (dados: DadosRegistro<Oportunidade>) => void,
    private readonly usuarios: () => Promise<Usuario[]>,
    ambiente: Ambiente = ambientePadrao,
  ) {
    super(repositorio, validar, ambiente);
  }

  /** Para quem a cotação nova deste produto vai (para avisar na tela antes de salvar). */
  async encaminhamento(produto: string): Promise<Usuario | undefined> {
    return responsavelDoProduto(await this.usuarios(), produto);
  }

  override async salvar(usuario: Usuario, dados: DadosRegistro<Oportunidade>): Promise<Oportunidade> {
    const em = this.ambiente.agora().toISOString();
    const existente = dados.id ? await this.repositorio.obter(dados.id) : null;
    if (existente) {
      const responsavelId = dados.responsavelId ?? existente.responsavelId;
      const historico = registrarMovimentacoes(
        existente,
        { etapa: dados.etapa, responsavelId },
        usuario.id,
        em,
      );
      return super.salvar(usuario, { ...dados, historico });
    }

    // Cotação nova: quem escolheu o responsável à mão (gestão) decide; senão vale a regra do produto.
    const escolhido = dados.responsavelId && dados.responsavelId !== usuario.id;
    const destino = escolhido ? undefined : await this.encaminhamento(dados.produto);
    const responsavelId = escolhido ? dados.responsavelId! : (destino?.id ?? usuario.id);
    const historico = registrarMovimentacoes(null, { etapa: dados.etapa, responsavelId }, usuario.id, em);
    if (destino && destino.id !== usuario.id) {
      // Encaminhamento automático: qualquer perfil que cria cotações pode encaminhar ao responsável.
      exigir(usuario, 'registro:criar');
      this.validarDados({ ...dados, responsavelId });
      const item: Oportunidade = {
        ...dados,
        id: dados.id ?? this.ambiente.gerarId(),
        responsavelId,
        historico,
        criadoEm: em,
        atualizadoEm: em,
      };
      await this.repositorio.salvar(item);
      return item;
    }
    return super.salvar(usuario, { ...dados, responsavelId, historico });
  }
}
