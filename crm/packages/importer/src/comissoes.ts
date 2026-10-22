/**
 * Leitura do formato "Controle de Comissões" usado pela Portella:
 *  - "A Receber": todas as vendas com produtor, comissão a receber e recebida;
 *  - "Comissoes <corretor>": as vendas de cada corretor com o repasse, e a seção "Controle de Estornos";
 *  - "Essencial <…>": detalhamento da assessoria (os valores líquidos já estão em "A Receber");
 *  - "Bradesco", "Demonstrativo…" e "Faturamento": financeiro da empresa ("Poupanca" não é importada).
 *
 * Cada venda vira uma proposta: as parcelas recebidas são os recebimentos, com o repasse de cada
 * produtor; o "Comissão Paga" das abas de corretor vira o pagamento do produtor no mês.
 */
import type {
  ApoliceImportada,
  ArquivoImportacao,
  ClienteImportado,
  CotaImportada,
  DespesaImportada,
  EstornoImportado,
  FechamentoImportado,
  MovimentoImportado,
  PagamentoImportado,
  PropostaImportada,
} from '@portella/core';
import type { Aba } from './converter';
import type { Celula } from './valores';
import { data, dinheiro, normalizarCabecalho, semAcento, texto, valorCelula } from './valores';

export interface RelatorioComissoes {
  abas: Array<{ nome: string; uso: string; linhas: number }>;
  avisos: string[];
}

export interface ResultadoComissoes {
  seguros: ArquivoImportacao;
  consorcio: ArquivoImportacao;
  relatorio: RelatorioComissoes;
}

/** Ramos de vigência anual: o fim é estimado em proposta + 12 meses. */
const ANUAIS =
  /automovel|auto\b|resid|empresa|respons|\brc\b|fianca|aluguel|transporte|bike|celular|portat|camera|equip/;
const NAO_SAO_APOLICES = /endosso|estorno|cartao|rastreador/;
const PRODUTORES_CORRETORA = /^corret/;

const norm = (t?: string) =>
  semAcento(t ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

export function ehFormatoComissoes(abas: Aba[]): boolean {
  return abas.some((a) => norm(a.nome) === 'a receber') || abas.some((a) => /^comiss/.test(norm(a.nome)));
}

/** Índices das colunas na linha de cabeçalho, pelo começo do título normalizado. */
function colunas(cabecalho: Celula[]) {
  const titulos = cabecalho.map((c) => normalizarCabecalho(texto(c) ?? ''));
  // Título idêntico tem prioridade sobre começo igual ("comissao descontada" × "comissao descontada segurado").
  return (...nomes: string[]) => {
    const exato = titulos.findIndex((t) => nomes.includes(t));
    return exato >= 0 ? exato : titulos.findIndex((t) => nomes.some((p) => t.startsWith(p)));
  };
}

function acharLinha(linhas: Celula[][], teste: (titulos: string[]) => boolean, de = 0): number {
  for (let i = de; i < linhas.length; i++) {
    if (teste((linhas[i] ?? []).map((c) => normalizarCabecalho(texto(c) ?? '')))) return i;
  }
  return -1;
}

const ehConsorcio = (produto?: string, companhia?: string) =>
  /cons?o?rcio|cnsorcio/.test(norm(produto)) || norm(companhia) === 'magalu';

/** "8.10" → "8/10"; número 14 → "14". */
function parcela(c: Celula): string | undefined {
  const v = valorCelula(c);
  if (v == null || v === '' || v === '-') return undefined;
  const t = typeof v === 'number' ? String(v) : String(v).trim();
  const par = t.match(/^(\d+)\.(\d+)$/);
  return par ? `${par[1]}/${par[2]}` : t;
}

const proposta = (c: Celula) => {
  const t = texto(c);
  return t && t !== '-' ? t.replace(/\s+/g, ' ') : undefined;
};

export interface Venda {
  dataProposta?: string;
  numeroProposta?: string;
  nome: string;
  produto: string;
  companhia: string;
  parcela?: string;
  dataRecebimento?: string;
  premio?: number;
  comissaoReceber: number;
  comissaoRecebida: number;
  repasse?: number;
  repassePago?: number;
  estorno?: boolean;
  produtor?: string;
  /** Data do repasse ao corretor (coluna "Dt. Recebto." das abas de corretor). */
  dataRepasse?: string;
  observacoes?: string;
  /** Corretor cujo repasse já foi aplicado à parcela. */
  repasseDe?: string;
  /** Repasses de outros corretores sobre a mesma parcela (ex.: supervisão). */
  adicionais?: Array<{ produtor: string; repasse?: number; repassePago?: number; dataRepasse?: string }>;
  origem: string;
}

/** 0,4001 → 40 (arredondamento da planilha); 0,3083 → 30,83. */
function percentual(fracao: number): number {
  const p = Math.round(fracao * 10000) / 100;
  return Math.abs(p - Math.round(p)) < 0.05 ? Math.round(p) : p;
}

const chaveCliente = (nome: string) => `n:${normalizarCabecalho(nome)}`;
const chaveVenda = (v: Pick<Venda, 'numeroProposta' | 'nome' | 'companhia' | 'produto' | 'dataProposta'>) =>
  v.numeroProposta
    ? `${normalizarCabecalho(v.companhia)}|${normalizarCabecalho(v.numeroProposta)}`
    : `${chaveCliente(v.nome)}|${normalizarCabecalho(v.companhia)}|${normalizarCabecalho(v.produto)}|${v.dataProposta ?? ''}`;
/**
 * Identifica a mesma parcela nas abas "A Receber" e "Comissões <corretor>". Não usa a data de
 * recebimento (na aba do corretor ela é a data do repasse) nem o produto (escrito de formas diferentes).
 */
export const chaveParcela = (v: Venda) =>
  v.numeroProposta
    ? `${normalizarCabecalho(v.companhia)}|${normalizarCabecalho(v.numeroProposta)}|${v.parcela ?? ''}`
    : `${chaveCliente(v.nome)}|${normalizarCabecalho(v.companhia)}|${v.parcela ?? ''}|${v.dataProposta ?? ''}`;

/** Linhas de venda de uma aba no formato de comissões (até a próxima seção). */
export function lerVendas(aba: Aba, avisos: string[]): { vendas: Venda[]; estornos: Venda[] } {
  const vendas: Venda[] = [];
  const estornos: Venda[] = [];
  const corretorDaAba = /^comiss/.test(norm(aba.nome))
    ? texto(aba.nome.replace(/^comiss(o|õ)es\s*/i, ''))
    : undefined;

  const ler = (inicio: number, estorno: boolean, destino: Venda[]) => {
    const cab = aba.linhas[inicio] ?? [];
    const col = colunas(cab);
    const c = {
      data: col('data'),
      proposta: col('nr'),
      nome: col('nome'),
      produto: col('produto'),
      cia: col('cia'),
      produtor: col('produtor'),
      parcela: col('parcela'),
      receb: col('dt recebto', 'dt desconto'),
      premio: col('premio', 'prêmio'),
      receber: col('comissao a receber', 'comissao recebida seguradora', 'comissao descontada segurado'),
      recebida: col('comissao recebida'),
      repasse: col('comissao a pagar', 'comissao a descontar'),
      pago: col('comissao paga', 'comissao descontada'),
    };
    // Em "A Receber", "Comissão Recebida" é o valor já pago pela seguradora; nas abas de corretor,
    // "Comissao Recebida Seguradora" é o valor da parcela (a receber) e não há coluna separada.
    if (c.recebida === c.receber) c.recebida = -1;
    for (let i = inicio + 1; i < aba.linhas.length; i++) {
      const l = aba.linhas[i] ?? [];
      const primeira = norm(texto(l[0]));
      if (/^(total|saldo|controle de estornos|estorno por)/.test(primeira)) break;
      const nome = texto(l[c.nome])?.replace(/\s+/g, ' ');
      if (!nome) continue;
      const produto = texto(l[c.produto]) ?? (c.produto < 0 ? 'Não informado' : 'Não informado');
      // Estornos às vezes vêm sem seguradora (descontos combinados com o corretor).
      const companhia = texto(l[c.cia]) ?? (estorno ? 'Não informada' : undefined);
      if (!companhia) {
        avisos.push(`Aba "${aba.nome}", linha ${i + 1}: sem seguradora; linha ignorada.`);
        continue;
      }
      const receber = dinheiro(l[c.receber]) ?? 0;
      const produtorPlanilha = c.produtor >= 0 ? texto(l[c.produtor]) : corretorDaAba;
      destino.push({
        dataProposta: data(l[c.data]),
        numeroProposta: proposta(l[c.proposta]),
        nome,
        produto: estorno && produto === 'Não informado' ? 'Estorno' : produto,
        companhia,
        parcela: parcela(l[c.parcela]),
        dataRecebimento: data(l[c.receb]),
        premio: dinheiro(l[c.premio]) || undefined,
        comissaoReceber: receber,
        // Nas abas de corretor, a parcela recebida é a que tem data de recebimento.
        comissaoRecebida:
          c.recebida >= 0 ? (dinheiro(l[c.recebida]) ?? 0) : data(l[c.receb]) || estorno ? receber : 0,
        repasse: c.repasse >= 0 ? dinheiro(l[c.repasse]) : undefined,
        repassePago: c.pago >= 0 ? dinheiro(l[c.pago]) : undefined,
        estorno: estorno || /estorno/.test(norm(produto)) || undefined,
        produtor: produtorPlanilha,
        origem: aba.nome,
      });
    }
  };

  const cab = acharLinha(
    aba.linhas,
    (t) => t.some((x) => x.startsWith('nome')) && t.some((x) => x.startsWith('parcela')),
  );
  if (cab >= 0) ler(cab, false, vendas);
  const est = acharLinha(aba.linhas, (t) => /^(controle de estornos|estorno por)/.test(t[0] ?? ''), cab + 1);
  if (est >= 0) {
    const cabEst = acharLinha(
      aba.linhas,
      (t) => t.some((x) => x.startsWith('nome')) && t.some((x) => x.startsWith('parcela')),
      est,
    );
    if (cabEst >= 0) ler(cabEst, true, estornos);
  }
  return { vendas, estornos };
}

/** Extrato do Bradesco: Data | Histórico | Doc. | Crédito | Débito | Saldo. */
function lerExtrato(aba: Aba, conta: string): MovimentoImportado[] {
  const cab = acharLinha(aba.linhas, (t) => t[0] === 'data' && t.some((x) => x.startsWith('historico')));
  if (cab < 0) return [];
  const col = colunas(aba.linhas[cab]!);
  const [iData, iHist, iDoc, iCred, iDeb, iSaldo] = [
    col('data'),
    col('historico'),
    col('doc'),
    col('credito'),
    col('debito'),
    col('saldo'),
  ];
  const movimentos: MovimentoImportado[] = [];
  for (let i = cab + 1; i < aba.linhas.length; i++) {
    const l = aba.linhas[i] ?? [];
    if (/resumo/.test(norm(texto(l[iHist])))) break;
    const dia = data(l[iData]);
    const descricao = texto(l[iHist]);
    if (!dia || !descricao) continue;
    const base = { conta, data: dia, descricao, documento: texto(l[iDoc]) };
    if (/saldo anterior/.test(norm(descricao))) {
      movimentos.push({
        ...base,
        chave: `${conta}|${i}`,
        tipo: 'saldo_inicial',
        valor: dinheiro(l[iSaldo]) ?? 0,
      });
      continue;
    }
    const credito = dinheiro(l[iCred]) ?? 0;
    const debito = dinheiro(l[iDeb]) ?? 0;
    if (credito) movimentos.push({ ...base, chave: `${conta}|${i}|c`, tipo: 'entrada', valor: credito });
    if (debito) movimentos.push({ ...base, chave: `${conta}|${i}|d`, tipo: 'saida', valor: debito });
  }
  return movimentos;
}

/** Duas colunas de depósitos lado a lado (Poupança Portella | Tracker; Faturamento | Consórcio). */
function lerPares(aba: Aba): Array<{ titulo: string; itens: Array<{ data: string; valor: number }> }> {
  const titulos = aba.linhas[0] ?? [];
  const cab = acharLinha(aba.linhas, (t) => t.filter((x) => x.startsWith('data deposito')).length >= 1);
  if (cab < 0) return [];
  const pares: Array<{ titulo: string; itens: Array<{ data: string; valor: number }> }> = [];
  (aba.linhas[cab] ?? []).forEach((c, i) => {
    if (!normalizarCabecalho(texto(c) ?? '').startsWith('data deposito')) return;
    const itens: Array<{ data: string; valor: number }> = [];
    for (const l of aba.linhas.slice(cab + 1)) {
      const dia = data(l[i]);
      const valor = dinheiro(l[i + 1]);
      if (dia && valor) itens.push({ data: dia, valor });
    }
    pares.push({ titulo: texto(titulos[i]) ?? aba.nome, itens });
  });
  return pares;
}

/** Seção "DESPESAS EMPRESA" do Demonstrativo: Item | Venc. | Data Pgto | Histórico | Débito | Pago. */
function lerDespesas(aba: Aba): DespesaImportada[] {
  const secao = acharLinha(aba.linhas, (t) => t[0] === 'despesas empresa');
  if (secao < 0) return [];
  const cab = acharLinha(aba.linhas, (t) => t[0] === 'item' && t.some((x) => x.startsWith('venc')), secao);
  if (cab < 0) return [];
  const col = colunas(aba.linhas[cab]!);
  const [iVenc, iPgto, iHist, iDeb, iPago] = [
    col('venc'),
    col('data pgto'),
    col('historico'),
    col('debito'),
    col('pago'),
  ];
  const despesas: DespesaImportada[] = [];
  for (let i = cab + 1; i < aba.linhas.length; i++) {
    const l = aba.linhas[i] ?? [];
    if (/^comissoes parceiros/.test(norm(texto(l[0])))) break;
    const descricao = texto(l[iHist]);
    const valor = dinheiro(l[iDeb]);
    if (!descricao || !valor) continue;
    const vencimento = data(l[iVenc]);
    despesas.push({
      chave: `${vencimento ?? ''}|${normalizarCabecalho(descricao)}|${texto(l[0]) ?? i}`,
      descricao,
      vencimento,
      pagamento: data(l[iPgto]),
      valor,
      pago: dinheiro(l[iPago]) ?? 0,
    });
  }
  return despesas;
}

export function converterComissoes(abas: Aba[], origem: string, agora = new Date()): ResultadoComissoes {
  const avisos: string[] = [];
  const relatorio: RelatorioComissoes['abas'] = [];

  // 1) "A Receber" é a base (valores da seguradora e produtor). As abas de cada corretor completam o
  //    repasse; parcelas que só existem nelas (e os estornos) entram como novas.
  const parcelas: Array<{ chave: string; venda: Venda }> = [];
  const porChave = new Map<string, Venda[]>();
  const ocorrencias = new Map<string, number>();
  const incluir = (v: Venda, prefixo: string) => {
    const base = `${prefixo}${chaveParcela(v)}${v.estorno ? '|estorno' : ''}`;
    const n = (ocorrencias.get(base) ?? 0) + 1;
    ocorrencias.set(base, n);
    parcelas.push({ chave: n > 1 ? `${base}|${n}` : base, venda: v });
  };
  const movimentos: MovimentoImportado[] = [];
  let despesas: DespesaImportada[] = [];
  const fechamentos = new Map<string, FechamentoImportado>();
  const abaAReceber = abas.find((a) => norm(a.nome) === 'a receber');
  if (abaAReceber) {
    const { vendas, estornos } = lerVendas(abaAReceber, avisos);
    for (const v of [...vendas, ...estornos]) {
      incluir(v, '');
      porChave.set(chaveParcela(v), [...(porChave.get(chaveParcela(v)) ?? []), v]);
    }
    relatorio.push({
      nome: abaAReceber.nome,
      uso: 'vendas e comissões',
      linhas: vendas.length + estornos.length,
    });
  }

  for (const aba of abas) {
    const nome = norm(aba.nome);
    if (aba === abaAReceber) continue;
    if (/^comiss/.test(nome)) {
      const { vendas, estornos } = lerVendas(aba, avisos);
      let completadas = 0;
      let adicionais = 0;
      const casadas = new Set<Venda>();
      for (const v of vendas) {
        const candidatas = (porChave.get(chaveParcela(v)) ?? []).filter((r) => !casadas.has(r) && !r.estorno);
        const par =
          candidatas.find((r) => Math.abs(r.comissaoReceber - v.comissaoReceber) < 0.01) ??
          candidatas.find((r) => norm(r.produto) === norm(v.produto)) ??
          candidatas[0];
        const corretorDaParcela =
          par && !PRODUTORES_CORRETORA.test(norm(par.produtor)) ? norm(par.produtor) : undefined;
        if (
          par &&
          v.produtor &&
          (par.repasseDe != null || (corretorDaParcela != null && corretorDaParcela !== norm(v.produtor)))
        ) {
          // A mesma parcela já tem repasse de outro corretor (ex.: supervisão): o corretor desta aba
          // entra como mais um produtor da proposta, sem repetir o valor recebido da seguradora.
          casadas.add(par);
          par.adicionais = [
            ...(par.adicionais ?? []),
            {
              produtor: v.produtor,
              repasse: v.repasse,
              repassePago: v.repassePago,
              dataRepasse: v.dataRecebimento,
            },
          ];
          adicionais++;
        } else if (par) {
          casadas.add(par);
          par.repasseDe = v.produtor;
          par.repasse = v.repasse;
          par.repassePago = v.repassePago;
          par.dataRepasse = v.dataRecebimento;
          par.produtor = v.produtor;
          completadas++;
        } else {
          incluir(v, `${norm(aba.nome)}|`);
        }
      }
      for (const e of estornos) incluir(e, `${norm(aba.nome)}|`);
      relatorio.push({
        nome: aba.nome,
        uso: `repasses do corretor: ${completadas} ligadas a "A Receber", ${adicionais} repasse(s) adicional(is) sobre parcelas de outro corretor, ${vendas.length - completadas - adicionais} só nesta aba, ${estornos.length} estorno(s)`,
        linhas: vendas.length + estornos.length,
      });
    } else if (/^essencial/.test(nome)) {
      relatorio.push({
        nome: aba.nome,
        uso: 'ignorada: detalhamento da assessoria (valores líquidos já estão em "A Receber")',
        linhas: 0,
      });
    } else if (/bradesco/.test(nome)) {
      const m = lerExtrato(aba, 'Bradesco');
      movimentos.push(...m);
      relatorio.push({ nome: aba.nome, uso: 'extrato da conta corrente', linhas: m.length });
    } else if (/poupanca/.test(nome)) {
      relatorio.push({ nome: aba.nome, uso: 'ignorada: a poupança não entra no CRM', linhas: 0 });
    } else if (/faturamento/.test(nome)) {
      const [fat, cons] = lerPares(aba);
      for (const it of fat?.itens ?? [])
        fechamentos.set(it.data.slice(0, 7), {
          ...fechamentos.get(it.data.slice(0, 7)),
          mes: it.data.slice(0, 7),
          faturamento: it.valor,
        });
      for (const it of cons?.itens ?? [])
        fechamentos.set(it.data.slice(0, 7), {
          ...fechamentos.get(it.data.slice(0, 7)),
          mes: it.data.slice(0, 7),
          creditoConsorcio: it.valor,
        });
      relatorio.push({ nome: aba.nome, uso: 'faturamento mensal', linhas: fechamentos.size });
    } else if (/demonstrativo/.test(nome)) {
      despesas = lerDespesas(aba);
      relatorio.push({
        nome: aba.nome,
        uso: 'despesas da empresa (receitas e repasses são calculados pelo CRM)',
        linhas: despesas.length,
      });
    } else {
      relatorio.push({ nome: aba.nome, uso: 'ignorada: formato não reconhecido', linhas: 0 });
      avisos.push(`Aba "${aba.nome}" não reconhecida; ignorada.`);
    }
  }

  // 2) Clientes, vendas (apólices/cotas), propostas, estornos e pagamentos de cada sistema.
  const novoSistema = <V>() => ({
    clientes: new Map<string, ClienteImportado>(),
    vendas: new Map<string, V>(),
    parcelas: new Map<string, Array<{ chave: string; venda: Venda }>>(),
    estornos: [] as EstornoImportado[],
    pagamentos: new Map<string, PagamentoImportado>(),
  });
  const sistemas = { seguros: novoSistema<ApoliceImportada>(), consorcio: novoSistema<CotaImportada>() };
  const doProdutor = (nome?: string) => (nome && !PRODUTORES_CORRETORA.test(norm(nome)) ? nome : undefined);

  for (const { chave, venda: v } of parcelas) {
    const consorcio = ehConsorcio(v.produto, v.companhia);
    const s = consorcio ? sistemas.consorcio : sistemas.seguros;
    const responsavel = doProdutor(v.produtor);
    const clienteChave = chaveCliente(v.nome);
    if (!s.clientes.has(clienteChave)) {
      s.clientes.set(clienteChave, {
        chave: clienteChave,
        nome: v.nome,
        tipoPessoa: /ltda|eirel|s\/?a\b|\bme\b|epp|servicos|comercio/i.test(semAcento(v.nome)) ? 'PJ' : 'PF',
        responsavel,
      });
    }

    // Comissão paga a cada produtor, pelo mês em que a seguradora pagou a parcela.
    const pagos = [
      { produtor: responsavel, valor: v.repassePago, data: v.dataRepasse ?? v.dataRecebimento },
      ...(v.adicionais ?? []).map((a) => ({
        produtor: doProdutor(a.produtor),
        valor: a.repassePago,
        data: a.dataRepasse ?? v.dataRecebimento,
      })),
    ];
    for (const pago of pagos) {
      const mes = (v.dataRecebimento ?? pago.data)?.slice(0, 7);
      if (!pago.produtor || !pago.valor || !mes || !pago.data) continue;
      const k = `${normalizarCabecalho(pago.produtor)}|${mes}`;
      const atual = s.pagamentos.get(k);
      s.pagamentos.set(k, {
        chave: k,
        produtor: pago.produtor,
        mes,
        data: atual && atual.data > pago.data ? atual.data : pago.data,
        valor: Math.round(((atual?.valor ?? 0) + pago.valor) * 100) / 100,
      });
    }

    if (v.estorno) {
      const dataEstorno = v.dataRecebimento ?? v.dataProposta;
      if (!dataEstorno) {
        avisos.push(`Estorno de "${v.nome}" (${v.origem}) sem data; não importado.`);
        continue;
      }
      s.estornos.push({
        chave,
        produtor: responsavel,
        segurado: v.nome,
        numeroApolice: v.numeroProposta,
        companhia: v.companhia,
        produto: v.produto,
        data: dataEstorno,
        valor: Math.abs(v.comissaoRecebida || v.comissaoReceber),
        descontoProdutor: Math.abs(v.repasse ?? 0),
      });
      continue;
    }

    const vendaChave = chaveVenda(v);
    if (consorcio) {
      if (!sistemas.consorcio.vendas.has(vendaChave) && v.premio && v.dataProposta) {
        sistemas.consorcio.vendas.set(vendaChave, {
          chave: vendaChave,
          clienteChave,
          administradora: v.companhia,
          numeroProposta: v.numeroProposta,
          tipoBem: v.produto,
          valorCredito: v.premio,
          dataAdesao: v.dataProposta,
          responsavel,
        });
      }
    } else if (!NAO_SAO_APOLICES.test(norm(v.produto))) {
      if (!sistemas.seguros.vendas.has(vendaChave) && v.dataProposta) {
        const anual = ANUAIS.test(norm(v.produto));
        sistemas.seguros.vendas.set(vendaChave, {
          chave: vendaChave,
          clienteChave,
          seguradora: v.companhia,
          ramo: v.produto,
          numero: v.numeroProposta,
          inicioVigencia: v.dataProposta,
          fimVigencia: anual
            ? `${Number(v.dataProposta.slice(0, 4)) + 1}${v.dataProposta.slice(4)}`
            : undefined,
          vigenciaEstimada: anual || undefined,
          premioLiquido: v.premio,
          responsavel,
        });
      }
    }
    s.parcelas.set(vendaChave, [...(s.parcelas.get(vendaChave) ?? []), { chave, venda: v }]);
  }

  const paraPropostas = (s: (typeof sistemas)['seguros'] | (typeof sistemas)['consorcio']) => {
    const propostas: PropostaImportada[] = [];
    for (const [vendaChave, itens] of s.parcelas) {
      const vendas = itens.map((i) => i.venda);
      const primeira = vendas[0]!;
      const dataProposta =
        vendas.find((v) => v.dataProposta)?.dataProposta ??
        vendas
          .map((v) => v.dataRecebimento)
          .filter((d): d is string => !!d)
          .sort()[0];
      if (!dataProposta) {
        avisos.push(`Venda de "${primeira.nome}" (${primeira.origem}) sem data; não importada.`);
        continue;
      }
      const soma = (f: (v: Venda) => number | undefined) =>
        Math.round(vendas.reduce((t, v) => t + (f(v) ?? 0), 0) * 100) / 100;
      const comissaoReceber = soma((v) => v.comissaoReceber);
      const premio = soma((v) => v.premio);

      // Produtores com o % de repasse, calculado só nas parcelas que já têm o repasse preenchido.
      const repasses = new Map<string, { valor: number; base: number }>();
      const somar = (nome: string | undefined, repasse: number | undefined, base: number) => {
        const p = doProdutor(nome);
        if (!p) return;
        const atual = repasses.get(p) ?? { valor: 0, base: 0 };
        if (repasse && base) {
          atual.valor += repasse;
          atual.base += base;
        }
        repasses.set(p, atual);
      };
      for (const v of vendas) {
        somar(v.produtor, v.repasse, v.comissaoReceber);
        for (const a of v.adicionais ?? []) somar(a.produtor, a.repasse, v.comissaoReceber);
      }
      const produtores = [...repasses].map(([nome, { valor, base }]) => ({
        nome,
        percentual: base > 0 ? percentual(valor / base) : 0,
      }));

      const recebimentos = itens
        .filter(({ venda: v }) => v.comissaoRecebida !== 0)
        .map(({ chave, venda: v }) => {
          const porProdutor: Record<string, number> = {};
          const p = doProdutor(v.produtor);
          if (p && v.repasse != null) porProdutor[p] = v.repasse;
          for (const a of v.adicionais ?? []) {
            const pa = doProdutor(a.produtor);
            if (pa && a.repasse != null) porProdutor[pa] = (porProdutor[pa] ?? 0) + a.repasse;
          }
          return {
            chave,
            data: v.dataRecebimento ?? v.dataRepasse ?? dataProposta,
            valor: v.comissaoRecebida,
            parcela: v.parcela,
            repasses: Object.keys(porProdutor).length ? porProdutor : undefined,
          };
        });

      const observacoes = [...new Set(vendas.map((v) => v.observacoes).filter(Boolean))].join(' ');
      propostas.push({
        chave: vendaChave,
        clienteChave: chaveCliente(primeira.nome),
        vendaChave: s.vendas.has(vendaChave) ? vendaChave : undefined,
        clienteNome: primeira.nome,
        numero: primeira.numeroProposta,
        data: dataProposta,
        companhia: primeira.companhia,
        produto: primeira.produto,
        premioLiquido: premio || undefined,
        comissaoPercentual:
          premio > 0 && comissaoReceber > 0 ? percentual(comissaoReceber / premio) : undefined,
        comissaoReceber,
        produtores,
        recebimentos,
        observacoes: observacoes || undefined,
      });
    }
    return propostas;
  };

  const ordenarPagamentos = (m: Map<string, PagamentoImportado>) =>
    [...m.values()].sort((a, b) => a.mes.localeCompare(b.mes) || a.produtor.localeCompare(b.produtor));
  const base = { versao: 1 as const, origem, geradoEm: agora.toISOString() };
  return {
    seguros: {
      ...base,
      sistema: 'seguros',
      clientes: [...sistemas.seguros.clientes.values()],
      apolices: [...sistemas.seguros.vendas.values()],
      propostas: paraPropostas(sistemas.seguros),
      estornos: sistemas.seguros.estornos,
      pagamentos: ordenarPagamentos(sistemas.seguros.pagamentos),
      movimentos,
      despesas,
      fechamentos: [...fechamentos.values()].sort((a, b) => a.mes.localeCompare(b.mes)),
    },
    consorcio: {
      ...base,
      sistema: 'consorcio',
      clientes: [...sistemas.consorcio.clientes.values()],
      cotas: [...sistemas.consorcio.vendas.values()],
      propostas: paraPropostas(sistemas.consorcio),
      estornos: sistemas.consorcio.estornos,
      pagamentos: ordenarPagamentos(sistemas.consorcio.pagamentos),
    },
    relatorio: { abas: relatorio, avisos },
  };
}
