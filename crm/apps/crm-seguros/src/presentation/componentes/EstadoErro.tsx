import { Botao, EstadoVazio } from '@portella/ui';

/** Falha ao carregar: diz o que não carregou e oferece tentar de novo, em vez de uma lista vazia. */
export function EstadoErro({ oque, aoTentar }: { oque: string; aoTentar?: () => void }) {
  return (
    <div role="alert">
      <EstadoVazio
        titulo={`Não foi possível carregar ${oque}`}
        acao={
          aoTentar && (
            <Botao variante="secundario" onClick={aoTentar}>
              Tentar de novo
            </Botao>
          )
        }
      >
        Verifique se o navegador não está no modo privado e tente de novo. Se continuar, avise a
        administradora.
      </EstadoVazio>
    </div>
  );
}
