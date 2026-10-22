import type { Cliente } from '../domain/cliente';
import { paraCentavos } from '../domain/dinheiro';
import { normalizar } from '../domain/cliente';
import { ErroValidacao } from '../domain/erros';
import type {
  ArquivoImportacao,
  ClienteImportado,
  EstornoImportado,
  PagamentoImportado,
  PropostaImportada,
} from '../domain/importacao';
import type { Estorno, PagamentoProdutor, Proposta } from '../domain/proposta';
import { idImportado } from '../domain/importacao';
import type { Usuario } from '../domain/usuario';
import { exigir } from './permissoes';

export function lerArquivoImportacao(
  dados: unknown,
  sistema: ArquivoImportacao['sistema'],
): ArquivoImportacao {
  const a = dados as Partial<ArquivoImportacao> | null;
  if (!a || typeof a !== 'object' || a.versao !== 1 || !Array.isArray(a.clientes)) {
    throw new ErroValidacao('Arquivo não reconhecido. Gere-o com o importador da planilha.');
  }
  if (a.sistema !== sistema) {
    throw new ErroValidacao(`Este arquivo é do CRM de ${a.sistema === 'seguros' ? 'seguros' : 'consórcio'}.`);
  }
  return a as ArquivoImportacao;
}

/** Associa o nome do corretor na planilha a um usuário; sem correspondência, fica com quem importa. */
export function resolverResponsavel(equipe: Usuario[], ator: Usuario) {
  const porNome = new Map(equipe.map((u) => [normalizar(u.nome), u.id]));
  const porPrimeiroNome = new Map<string, string | null>();
  for (const u of equipe) {
    const primeiro = normalizar(u.nome).split(' ')[0] ?? '';
    porPrimeiroNome.set(primeiro, porPrimeiroNome.has(primeiro) ? null : u.id); // null = ambíguo
  }
  const naoEncontrados = new Set<string>();
  const resolver = (nome?: string): string => {
    if (!nome?.trim()) return ator.id;
    const n = normalizar(nome);
    const id = porNome.get(n) ?? porPrimeiroNome.get(n.split(' ')[0] ?? '') ?? null;
    if (!id) naoEncontrados.add(nome.trim());
    return id ?? ator.id;
  };
  return { resolver, naoEncontrados };
}

export function prepararClientes(
  arquivo: ArquivoImportacao,
  ator: Usuario,
  resolver: (nome?: string) => string,
  agora: string,
): { clientes: Cliente[]; idPorChave: Map<string, string> } {
  exigir(ator, 'dados:importar');
  const idPorChave = new Map<string, string>();
  const clientes = arquivo.clientes.map((c: ClienteImportado): Cliente => {
    const id = idImportado('cliente', c.chave);
    idPorChave.set(c.chave, id);
    const { chave: _chave, responsavel, ...dados } = c;
    return {
      ...dados,
      tipoPessoa: c.tipoPessoa ?? 'PF',
      id,
      responsavelId: resolver(responsavel),
      criadoEm: agora,
      atualizadoEm: agora,
    };
  });
  return { clientes, idPorChave };
}

const centavos = (reais?: number) => (reais == null ? undefined : (paraCentavos(reais) ?? undefined));

/** Converte as propostas do arquivo, ligando clientes e produtores (pelo nome) aos cadastros do CRM. */
export function prepararPropostas(
  itens: PropostaImportada[],
  ator: Usuario,
  resolver: (nome?: string) => string,
  idClientePorChave: Map<string, string>,
  agora: string,
  /** % padrão do produtor, usado quando a planilha ainda não tem o repasse da venda. */
  percentualPadrao: (produtorId: string) => number | undefined = () => undefined,
): Proposta[] {
  exigir(ator, 'dados:importar');
  return itens.map((p) => {
    const produtores = p.produtores.map((x) => {
      const produtorId = resolver(x.nome);
      return { produtorId, percentual: x.percentual || (percentualPadrao(produtorId) ?? 0) };
    });
    const idPorNome = new Map(p.produtores.map((x, i) => [x.nome, produtores[i]!.produtorId]));
    return {
      id: idImportado('proposta', p.chave),
      responsavelId: produtores[0]?.produtorId ?? ator.id,
      criadoEm: agora,
      atualizadoEm: agora,
      clienteId: idClientePorChave.get(p.clienteChave),
      clienteNome: p.clienteNome,
      numero: p.numero,
      data: p.data,
      companhia: p.companhia,
      produto: p.produto,
      tipoNegocio: p.tipoNegocio,
      premioLiquido: centavos(p.premioLiquido),
      comissaoPercentual: p.comissaoPercentual,
      comissaoReceber: centavos(p.comissaoReceber) ?? 0,
      percentualVitalicio: p.percentualVitalicio,
      produtores,
      recebimentos: p.recebimentos.map((r) => ({
        id: idImportado('recebimento', r.chave),
        data: r.data,
        valor: centavos(r.valor) ?? 0,
        parcela: r.parcela,
        repasses: r.repasses
          ? Object.fromEntries(
              Object.entries(r.repasses).map(([nome, v]) => [
                idPorNome.get(nome) ?? resolver(nome),
                centavos(v) ?? 0,
              ]),
            )
          : undefined,
      })),
      status: 'aprovada',
      aprovadaEm: agora,
      aprovadaPor: ator.id,
      observacoes: p.observacoes,
    };
  });
}

export function prepararEstornos(
  itens: EstornoImportado[],
  ator: Usuario,
  resolver: (nome?: string) => string,
  agora: string,
): Estorno[] {
  exigir(ator, 'dados:importar');
  return itens.map(({ chave, produtor, valor, descontoProdutor, ...e }) => ({
    ...e,
    id: idImportado('estorno', chave),
    responsavelId: resolver(produtor),
    valor: centavos(valor) ?? 0,
    descontoProdutor: centavos(descontoProdutor) ?? 0,
    criadoEm: agora,
    atualizadoEm: agora,
  }));
}

export function prepararPagamentos(
  itens: PagamentoImportado[],
  ator: Usuario,
  resolver: (nome?: string) => string,
  agora: string,
): PagamentoProdutor[] {
  exigir(ator, 'dados:importar');
  return itens.map(({ chave, produtor, valor, ...p }) => ({
    ...p,
    id: idImportado('pagamento', chave),
    responsavelId: resolver(produtor),
    valor: centavos(valor) ?? 0,
    criadoEm: agora,
    atualizadoEm: agora,
    observacoes: 'Importado da planilha (Comissão Paga).',
  }));
}
