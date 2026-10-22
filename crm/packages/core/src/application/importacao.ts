import type { Cliente } from '../domain/cliente';
import { normalizar } from '../domain/cliente';
import { ErroValidacao } from '../domain/erros';
import type { ArquivoImportacao, ClienteImportado } from '../domain/importacao';
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
