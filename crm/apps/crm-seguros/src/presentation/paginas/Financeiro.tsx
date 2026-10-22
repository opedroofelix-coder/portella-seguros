import { Abas, CabecalhoPagina, Cartao } from '@portella/ui';
import { useState } from 'react';
import { DespesasFinanceiro } from './financeiro/Despesas';
import { ExtratoFinanceiro } from './financeiro/Extrato';
import { FaturamentoFinanceiro } from './financeiro/Faturamento';
import { ResumoFinanceiro } from './financeiro/Resumo';

type Aba = 'resumo' | 'extrato' | 'despesas' | 'faturamento';

export function PaginaFinanceiro() {
  const [aba, setAba] = useState<Aba>('resumo');
  return (
    <>
      <CabecalhoPagina titulo={<>Financeiro da <em>corretora</em></>} descricao="Conta corrente, despesas da empresa e faturamento mensal." />
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
