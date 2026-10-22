/**
 * Converte a planilha da Portella nos arquivos que as telas "Importar" dos CRMs leem.
 *
 *   PLANILHA_SENHA='…' npm run importar -- caminho/planilha.xlsx [pasta-de-saida]
 *
 * Gera seguros.seed.json, consorcio.seed.json e relatorio.json (padrão: crm/dados/, fora do Git).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { converter } from './converter';
import { lerPlanilha } from './ler';

async function principal() {
  const [planilha, saida = resolve(import.meta.dirname, '../../../dados')] = process.argv.slice(2);
  if (!planilha) {
    console.error('Uso: PLANILHA_SENHA=… npm run importar -- planilha.xlsx [pasta-de-saida]');
    process.exit(1);
  }
  const abas = await lerPlanilha(
    resolve(process.env.INIT_CWD ?? process.cwd(), planilha),
    process.env.PLANILHA_SENHA,
  );
  const { seguros, consorcio, relatorio } = converter(abas, basename(planilha));

  await mkdir(saida, { recursive: true });
  await writeFile(join(saida, 'seguros.seed.json'), JSON.stringify(seguros, null, 1));
  await writeFile(join(saida, 'consorcio.seed.json'), JSON.stringify(consorcio, null, 1));
  await writeFile(join(saida, 'relatorio.json'), JSON.stringify(relatorio, null, 2));

  for (const aba of relatorio.abas) {
    console.log(`\nAba "${aba.nome}" (${aba.tipo}) — cabeçalho na linha ${aba.linhaCabecalho ?? '—'}`);
    console.log(
      `  ${aba.linhas} linhas: ${aba.seguros} de seguro, ${aba.consorcios} de consórcio, ${aba.ignoradas} ignoradas`,
    );
    if (aba.naoReconhecidas.length) console.log(`  Colunas não usadas: ${aba.naoReconhecidas.join(', ')}`);
  }
  console.log(
    `\nSeguros:   ${seguros.clientes.length} clientes, ${(seguros.apolices as unknown[]).length} apólices`,
  );
  console.log(
    `Consórcio: ${consorcio.clientes.length} clientes, ${(consorcio.cotas as unknown[]).length} cotas`,
  );
  console.log(`${relatorio.avisos.length} aviso(s) em relatorio.json. Arquivos em ${saida}`);
}

principal().catch((e: Error) => {
  console.error(e.message);
  process.exit(1);
});
