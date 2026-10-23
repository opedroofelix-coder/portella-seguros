import { formatarData, formatarDinheiro, hojeISO } from '@portella/core';
import {
  Barras,
  BarraFiltros,
  Campo,
  Carregando,
  Cartao,
  EstadoVazio,
  Indicador,
  Selecao,
  Selo,
} from '@portella/ui';
import { useMemo, useState } from 'react';
import { CONTA_PRINCIPAL, resumirMes, saldosPorConta, situacaoDespesa } from '../../../domain/financeiro';
import { EstadoErro } from '../../componentes/EstadoErro';
import { mesesDe, mesPadrao, rotuloMes, rotuloMesCurto, useFinanceiro } from './comum';

export function ResumoFinanceiro() {
  const { movimentos, despesas, fechamentos } = useFinanceiro();
  const movs = useMemo(() => movimentos.data ?? [], [movimentos.data]);
  const desps = useMemo(() => despesas.data ?? [], [despesas.data]);
  const meses = useMemo(
    () => mesesDe([...movs.map((m) => m.data), ...desps.map((d) => d.vencimento)]),
    [movs, desps],
  );
  const [mes, setMes] = useState<string | null>(null);
  const hoje = hojeISO();
  const mesAtivo = mes ?? mesPadrao(meses, hoje);
  const fimDoMes = `${mesAtivo}-31`;

  const resumo = useMemo(() => resumirMes(movs, desps, mesAtivo), [movs, desps, mesAtivo]);
  const saldos = useMemo(
    () => [...saldosPorConta(movs, fimDoMes)].sort((a, b) => b[1] - a[1]),
    [movs, fimDoMes],
  );
  const aPagar = useMemo(
    () =>
      desps
        .filter((d) => situacaoDespesa(d, hoje) !== 'paga')
        .sort((a, b) => (a.vencimento ?? '').localeCompare(b.vencimento ?? ''))
        .slice(0, 8),
    [desps, hoje],
  );
  const faturamento = useMemo(
    () =>
      (fechamentos.data ?? [])
        .filter((f) => f.faturamento != null)
        .sort((a, b) => a.mes.localeCompare(b.mes))
        .slice(-12),
    [fechamentos.data],
  );
  const saldoPrincipal = saldos.find(([c]) => c === CONTA_PRINCIPAL)?.[1];
  const resultado = resumo.entradas - resumo.saidas;

  if (movimentos.isError || despesas.isError || fechamentos.isError) {
    return (
      <EstadoErro
        oque="o financeiro"
        aoTentar={() => {
          void movimentos.refetch();
          void despesas.refetch();
          void fechamentos.refetch();
        }}
      />
    );
  }
  if (movimentos.isPending || despesas.isPending || fechamentos.isPending) {
    return <Carregando texto="Carregando o financeiro…" />;
  }

  return (
    <div className="grade">
      <BarraFiltros>
        <Campo rotulo="Mês">
          <Selecao value={mesAtivo} onChange={(e) => setMes(e.target.value)}>
            {(meses.length ? meses : [mesAtivo]).map((m) => (
              <option key={m} value={m}>
                {rotuloMes(m)}
              </option>
            ))}
          </Selecao>
        </Campo>
      </BarraFiltros>
      <div className="grade-4">
        <Indicador
          tom="primaria"
          icone="carteira"
          rotulo={`Saldo ${CONTA_PRINCIPAL}`}
          valor={formatarDinheiro(saldoPrincipal ?? 0)}
          detalhe={`no fim de ${rotuloMesCurto(mesAtivo)}`}
        />
        <Indicador
          tom="sucesso"
          icone="tendencia"
          rotulo="Entradas"
          valor={formatarDinheiro(resumo.entradas)}
          detalhe="na conta principal"
        />
        <Indicador
          tom="primaria"
          icone="estorno"
          rotulo="Saídas"
          valor={formatarDinheiro(resumo.saidas)}
          detalhe={`resultado do mês: ${resultado >= 0 ? '+' : '−'} ${formatarDinheiro(Math.abs(resultado))}`}
        />
        <Indicador
          tom="alerta"
          icone="calendario"
          rotulo="Despesas em aberto"
          valor={formatarDinheiro(resumo.despesasAbertas)}
          detalhe={`de ${formatarDinheiro(resumo.despesas)} no mês`}
        />
      </div>
      <div className="grade-3">
        <Cartao titulo="Faturamento mensal">
          {faturamento.length ? (
            <Barras
              rotulo="Faturamento por mês"
              itens={faturamento.map((f) => ({
                rotulo: rotuloMesCurto(f.mes),
                valor: f.faturamento ?? 0,
                valorTexto: formatarDinheiro(f.faturamento),
              }))}
            />
          ) : (
            <EstadoVazio titulo="Nenhum fechamento">Feche o mês na aba Faturamento.</EstadoVazio>
          )}
        </Cartao>
        <Cartao titulo="Saldos por conta">
          {saldos.length ? (
            <dl className="lista-dados">
              {saldos.map(([conta, valor]) => (
                <div key={conta}>
                  <dt>{conta}</dt>
                  <dd>{formatarDinheiro(valor)}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <EstadoVazio titulo="Nenhum movimento">Lance os movimentos na aba Extrato.</EstadoVazio>
          )}
        </Cartao>
        <Cartao titulo="Despesas a pagar">
          {aPagar.length ? (
            <ul className="lista-simples">
              {aPagar.map((d) => (
                <li key={d.id}>
                  <div className="linha">
                    <span>
                      <strong>{d.descricao}</strong>
                      <small>
                        {situacaoDespesa(d, hoje) === 'vencida' ? 'venceu' : 'vence'}{' '}
                        {formatarData(d.vencimento)}
                      </small>
                    </span>
                    <span>
                      {situacaoDespesa(d, hoje) === 'vencida' && <Selo tom="perigo">Vencida</Selo>}{' '}
                      {formatarDinheiro(d.valor - d.pago)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EstadoVazio titulo="Nada a pagar" />
          )}
        </Cartao>
      </div>
    </div>
  );
}
