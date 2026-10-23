import { Abas, CabecalhoPagina, Cartao } from '@portella/ui';
import { useSearchParams } from 'react-router-dom';
import { DespesasFinanceiro } from './financeiro/Despesas';
import { ExtratoFinanceiro } from './financeiro/Extrato';
import { FaturamentoFinanceiro } from './financeiro/Faturamento';
import { ResumoFinanceiro } from './financeiro/Resumo';

type Aba = 'resumo' | 'extrato' | 'despesas' | 'faturamento';
const ABAS: Aba[] = ['resumo', 'extrato', 'despesas', 'faturamento'];

export function PaginaFinanceiro() {
  // A aba fica no endereço: recarregar, voltar e mandar o link mantêm a mesma seção.
  const [parametros, setParametros] = useSearchParams();
  const pedida = parametros.get('aba') as Aba | null;
  const aba: Aba = pedida && ABAS.includes(pedida) ? pedida : 'resumo';
  const setAba = (nova: Aba) => setParametros(nova === 'resumo' ? {} : { aba: nova }, { replace: true });
  return (
    <>
      <CabecalhoPagina
        titulo={
          <>
            Financeiro da <em>corretora</em>
          </>
        }
        descricao="Conta corrente, despesas da empresa e faturamento mensal."
      />
      <Abas
        rotulo="Seções do financeiro"
        ativa={aba}
        aoTrocar={setAba}
        abas={[
          { id: 'resumo', rotulo: 'Resumo' },
          { id: 'extrato', rotulo: 'Extrato' },
          { id: 'despesas', rotulo: 'Despesas' },
          { id: 'faturamento', rotulo: 'Faturamento' },
        ]}
      />
      {aba === 'resumo' ? (
        <ResumoFinanceiro />
      ) : (
        <Cartao>
          {aba === 'extrato' && <ExtratoFinanceiro />}
          {aba === 'despesas' && <DespesasFinanceiro />}
          {aba === 'faturamento' && <FaturamentoFinanceiro />}
        </Cartao>
      )}
    </>
  );
}
