/**
 * Converte a planilha da Portella nos arquivos que as telas "Importar" dos CRMs leem.
 *
 *   PLANILHA_SENHA='…' npm run importar --silent -- caminho/planilha.xlsx [pasta-de-saida]
 *
 * Gera seguros.seed.json, consorcio.seed.json e relatorio.json (padrão: crm/dados/, fora do Git).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { converterComissoes, ehFormatoComissoes } from './comissoes';
import { converter } from './converter';
import { lerPlanilha } from './ler';

const n = (x: unknown) => (Array.isArray(x) ? x.length : 0);

async function principal() {
  const [planilha, saida = resolve(import.meta.dirname, '../../../dados')] = process.argv.slice(2);
  if (!planilha) {
    console.error('Uso: PLANILHA_SENHA=… npm run importar --silent -- planilha.xlsx [pasta-de-saida]');
    process.exit(1);
  }
  const abas = await lerPlanilha(resolve(process.env.INIT_CWD ?? process.cwd(), planilha), process.env.PLANILHA_SENHA);
  const formatoComissoes = ehFormatoComissoes(abas);
  const { seguros, consorcio, relatorio } = formatoComissoes
    ? converterComissoes(abas, basename(planilha))
    : converter(abas, basename(planilha));

  await mkdir(saida, { recursive: true });
  await writeFile(join(saida, 'seguros.seed.json'), JSON.stringify(seguros, null, 1));
  await writeFile(join(saida, 'consorcio.seed.json'), JSON.stringify(consorcio, null, 1));
  await writeFile(join(saida, 'relatorio.json'), JSON.stringify(relatorio, null, 2));

  console.log(`Formato: ${formatoComissoes ? 'controle de comissões' : 'cadastro (colunas por sinônimos)'}`);
  for (const aba of relatorio.abas) {
    if ('uso' in aba) console.log(`  "${aba.nome}": ${aba.uso} (${aba.linhas})`);
    else console.log(`  "${aba.nome}" (${aba.tipo}): ${aba.linhas} linhas, ${aba.seguros} seguro, ${aba.consorcios} consórcio, ${aba.ignoradas} ignoradas`);
  }
  console.log(
    `\nSeguros:   ${seguros.clientes.length} clientes, ${n(seguros.apolices)} apólices, ${n(seguros.comissoes)} comissões, ` +
      `${n(seguros.movimentos)} movimentos, ${n(seguros.despesas)} despesas, ${n(seguros.fechamentos)} meses de faturamento`,
  );
  console.log(`Consórcio: ${consorcio.clientes.length} clientes, ${n(consorcio.cotas)} cotas, ${n(consorcio.comissoes)} comissões`);
  console.log(`${relatorio.avisos.length} aviso(s) em relatorio.json. Arquivos em ${saida}`);
}

principal().catch((e: Error) => {
  console.error(e.message);
  process.exit(1);
});
