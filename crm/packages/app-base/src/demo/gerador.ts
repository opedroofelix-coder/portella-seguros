import type {
  ClienteImportado,
  EstornoImportado,
  PagamentoImportado,
  PropostaImportada,
} from '@portella/core';

/**
 * Dados fictícios para a demonstração dos CRMs: só "Cliente Teste …", números inventados e
 * determinísticos (mesma semente, mesmo resultado). Nunca usar dados reais aqui.
 */

export interface ProdutoDemo {
  nome: string;
  /** Peso no sorteio. */
  peso: number;
  premio: [number, number];
  comissao: number[];
  /** Em quantas parcelas a seguradora paga a comissão. */
  parcelas: number[];
  vitalicio?: number;
}

export interface OpcoesDemo {
  hoje: Date;
  meses: number;
  quantidade: number;
  produtos: ProdutoDemo[];
  companhias: string[];
  semente?: number;
}

export interface VendaDemo {
  proposta: PropostaImportada;
  produto: ProdutoDemo;
  responsavel?: string;
}

export interface GeracaoDemo {
  clientes: ClienteImportado[];
  vendas: VendaDemo[];
  estornos: EstornoImportado[];
  pagamentos: PagamentoImportado[];
}

/** Produtores da demonstração (os mesmos nomes de `PRODUTORES_INICIAIS`) com o % usado. */
export const PRODUTORES_DEMO = [
  { nome: 'Deliziane', percentual: 40, peso: 5 },
  { nome: 'Gisele Costa', percentual: 50, peso: 4 },
  { nome: 'Jessica Naiane', percentual: 20, peso: 3 },
  { nome: 'Marielly', percentual: 15, peso: 2 },
  { nome: 'Danila', percentual: 50, peso: 2 },
  { nome: 'Luana', percentual: 50, peso: 2 },
];

const SOBRENOMES = [
  'Almeida',
  'Barbosa',
  'Cardoso',
  'Duarte',
  'Esteves',
  'Ferraz',
  'Gouveia',
  'Holanda',
  'Inácio',
  'Jardim',
  'Leme',
  'Macedo',
  'Nogueira',
  'Orsini',
  'Pacheco',
  'Quintela',
  'Rezende',
  'Sampaio',
  'Tavares',
  'Uchoa',
  'Valente',
  'Xavier',
  'Zanetti',
  'Arruda',
  'Bastos',
  'Coutinho',
  'Dantas',
  'Figueira',
  'Guedes',
  'Lacerda',
  'Moura',
  'Pimenta',
  'Rocha',
  'Siqueira',
  'Teles',
  'Vidal',
];
const EMPRESAS = ['Comércio', 'Serviços', 'Transportes', 'Padaria', 'Clínica', 'Oficina'];

/** Gerador pseudoaleatório com semente (mulberry32). */
export function sorteador(semente: number) {
  let s = semente >>> 0;
  const proximo = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    numero: proximo,
    entre: (a: number, b: number) => a + proximo() * (b - a),
    item: <T>(lista: readonly T[]): T => lista[Math.floor(proximo() * lista.length)]!,
    pesado: <T extends { peso: number }>(lista: readonly T[]): T => {
      let r = proximo() * lista.reduce((t, i) => t + i.peso, 0);
      for (const i of lista) if ((r -= i.peso) <= 0) return i;
      return lista[lista.length - 1]!;
    },
  };
}

export const isoData = (d: Date) => d.toISOString().slice(0, 10);
export function somarMeses(d: Date, meses: number, dia?: number): Date {
  const r = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + meses, 1));
  const ultimo = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate();
  r.setUTCDate(Math.min(dia ?? d.getUTCDate(), ultimo));
  return r;
}
const reais = (v: number) => Math.round(v * 100) / 100;

export function gerarDemo(o: OpcoesDemo): GeracaoDemo {
  const r = sorteador(o.semente ?? 2026);
  const hoje = new Date(Date.UTC(o.hoje.getFullYear(), o.hoje.getMonth(), o.hoje.getDate()));
  const clientes: ClienteImportado[] = [];
  const vendas: VendaDemo[] = [];
  const repassePorMes = new Map<string, number>();
  const somarRepasse = (produtor: string, data: string, valor: number) => {
    const k = `${produtor}|${data.slice(0, 7)}`;
    repassePorMes.set(k, reais((repassePorMes.get(k) ?? 0) + valor));
  };

  for (let i = 0; i < o.quantidade; i++) {
    // Mais vendas nos meses recentes: a produção cresce ao longo do período.
    const atras = Math.floor(Math.pow(r.numero(), 1.35) * o.meses);
    const data = somarMeses(hoje, -atras, 1 + Math.floor(r.numero() * 27));
    if (data > hoje) data.setTime(hoje.getTime());

    const pj = r.numero() < 0.15;
    const sobrenome = SOBRENOMES[i % SOBRENOMES.length]!;
    const nome = pj
      ? `Cliente Teste ${r.item(EMPRESAS)} ${sobrenome} Ltda.`
      : `Cliente Teste ${sobrenome}${i >= SOBRENOMES.length ? ` ${Math.floor(i / SOBRENOMES.length) + 1}` : ''}`;
    const clienteChave = `demo:cliente:${i}`;

    const sorte = r.numero();
    const principal = r.pesado(PRODUTORES_DEMO);
    const produtores =
      sorte < 0.14
        ? []
        : sorte < 0.24
          ? [
              { nome: 'Jessica Naiane', percentual: 20 },
              { nome: 'Deliziane', percentual: 20 },
            ]
          : [{ nome: principal.nome, percentual: principal.percentual }];
    const responsavel = produtores[0]?.nome;
    clientes.push({ chave: clienteChave, nome, tipoPessoa: pj ? 'PJ' : 'PF', responsavel });

    const produto = r.pesado(o.produtos);
    const premio = reais(r.entre(produto.premio[0], produto.premio[1]));
    const comissaoPercentual = r.item(produto.comissao);
    const comissaoReceber = reais((premio * comissaoPercentual) / 100);
    const n = r.item(produto.parcelas);
    const recebimentos: PropostaImportada['recebimentos'] = [];
    for (let k = 0; k < n; k++) {
      const quando = somarMeses(data, k + 1, 10 + Math.floor(r.numero() * 15));
      if (quando > hoje) break;
      const valor =
        k === n - 1
          ? reais(comissaoReceber - reais(comissaoReceber / n) * (n - 1))
          : reais(comissaoReceber / n);
      const dataRecebimento = isoData(quando);
      recebimentos.push({ chave: `demo:${i}:${k}`, data: dataRecebimento, valor, parcela: `${k + 1}/${n}` });
      for (const p of produtores) somarRepasse(p.nome, dataRecebimento, (valor * p.percentual) / 100);
    }

    vendas.push({
      produto,
      responsavel,
      proposta: {
        chave: `demo:proposta:${i}`,
        clienteChave,
        vendaChave: `demo:venda:${i}`,
        clienteNome: nome,
        numero: String(7_100_000 + i * 37),
        data: isoData(data),
        companhia: r.item(o.companhias),
        produto: produto.nome,
        tipoNegocio: r.numero() < 0.62 ? 'novo' : 'renovacao',
        premioLiquido: premio,
        comissaoPercentual,
        comissaoReceber,
        percentualVitalicio: produto.vitalicio,
        produtores,
        recebimentos,
      },
    });
  }

  // Estornos: algumas parcelas devolvidas à seguradora (cancelamento), descontadas do produtor.
  const estornos: EstornoImportado[] = [];
  const comProdutor = vendas.filter((v) => v.proposta.produtores.length && v.proposta.recebimentos.length);
  for (let i = 0; i < 6 && comProdutor.length; i++) {
    const v = comProdutor[Math.floor(r.numero() * comProdutor.length)]!;
    const rec = v.proposta.recebimentos[0]!;
    const p = v.proposta.produtores[0]!;
    const data = isoData(somarMeses(new Date(`${rec.data}T00:00:00Z`), 1, 20));
    if (data > isoData(hoje)) continue;
    const desconto = reais((rec.valor * p.percentual) / 100);
    estornos.push({
      chave: `demo:estorno:${i}`,
      produtor: p.nome,
      segurado: v.proposta.clienteNome,
      numeroApolice: v.proposta.numero,
      companhia: v.proposta.companhia,
      produto: v.proposta.produto,
      data,
      valor: rec.valor,
      descontoProdutor: desconto,
    });
    somarRepasse(p.nome, data, -desconto);
  }

  // Pagamentos já feitos aos produtores: todos os meses anteriores ao atual.
  const mesAtual = isoData(hoje).slice(0, 7);
  const pagamentos: PagamentoImportado[] = [...repassePorMes]
    .filter(([k, valor]) => k.split('|')[1]! < mesAtual && valor > 0)
    .map(([k, valor]) => {
      const [produtor, mes] = k.split('|') as [string, string];
      const [a, m] = mes.split('-').map(Number) as [number, number];
      return {
        chave: `demo:pagamento:${k}`,
        produtor,
        mes,
        data: isoData(new Date(Date.UTC(a, m, 5))),
        valor,
      };
    })
    .sort((a, b) => a.mes.localeCompare(b.mes) || a.produtor.localeCompare(b.produtor));

  return { clientes, vendas, estornos, pagamentos };
}
