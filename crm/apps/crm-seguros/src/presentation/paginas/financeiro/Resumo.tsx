import { formatarData, formatarDinheiro, hojeISO } from '@portella/core';
import { Barras, BarraFiltros, Campo, Cartao, EstadoVazio, Indicador, Selecao } from '@portella/ui';
import { useMemo, useState } from 'react';
import { CONTA_PRINCIPAL, resumirMes, saldosPorConta, situacaoDespesa } from '../../../domain/financeiro';
import { mesesDe, rotuloMes, rotuloMesCurto, useFinanceiro } from './comum';

export function ResumoFinanceiro() {
  const { movimentos, despesas, fechamentos } = useFinanceiro();
  const movs = useMemo(() => movimentos.data ?? [], [movimentos.data]);
  const desps = useMemo(() => despesas.data ?? [], [despesas.data]);
  const meses = useMemo(
    () => mesesDe([...movs.map((m) => m.data), ...desps.map((d) => d.vencimento)]),
    [movs, desps],
  );
  const [mes, setMes] = useState<string | null>(null);
  const mesAtivo = mes ?? meses[0] ?? hojeISO().slice(0, 7);
  const fimDoMes = `${mesAtivo}-31`;
  const hoje = hojeISO();

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
          rotulo={`Saldo ${CONTA_PRINCIPAL}`}
          valor={formatarDinheiro(saldoPrincipal ?? 0)}
          detalhe={`no fim de ${rotuloMesCurto(mesAtivo)}`}
        />
        <Indicador rotulo="Entradas" valor={formatarDinheiro(resumo.entradas)} detalhe="na conta principal" />
        <Indicador
          rotulo="Saídas"
          valor={formatarDinheiro(resumo.saidas)}
          detalhe={`resultado ${formatarDinheiro(resumo.entradas - resumo.saidas)}`}
        />
        <Indicador
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
            <p className="texto-suave">Nenhum fechamento cadastrado.</p>
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
            <p className="texto-suave">Nenhum movimento cadastrado.</p>
          )}
        </Cartao>
        <Cartao titulo="Próximas despesas">
          {aPagar.length ? (
            <ul className="lista-simples">
              {aPagar.map((d) => (
                <li key={d.id}>
                  <div className="linha">
                    <span>
                      <strong>{d.descricao}</strong>
                      <small>vence {formatarData(d.vencimento)}</small>
                    </span>
                    <span>{formatarDinheiro(d.valor - d.pago)}</span>
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
