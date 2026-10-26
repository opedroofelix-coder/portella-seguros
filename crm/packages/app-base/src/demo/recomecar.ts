/** "Recomeçar" da demonstração: marca o pedido e recarrega; o banco é apagado antes de reabrir. */
const chave = (banco: string) => `${banco}:recomecar`;

export function recomecarDemo(banco: string) {
  try {
    localStorage.setItem(chave(banco), '1');
  } catch {
    // Sem localStorage os dados já ficam só na memória: recarregar basta.
  }
  // Volta ao painel: na demonstração as rotas ficam depois do "#".
  history.replaceState(null, '', `${location.pathname}${location.search}#/`);
  location.reload();
}

export async function limparDemoSePedido(banco: string): Promise<void> {
  try {
    if (localStorage.getItem(chave(banco)) !== '1') return;
  } catch {
    return;
  }
  await apagarBanco(banco);
}

/** Apaga do navegador o banco e a sessão salva (não faz nada se o banco não existe). */
export async function apagarBanco(banco: string): Promise<void> {
  try {
    localStorage.removeItem(chave(banco));
    localStorage.removeItem(`${banco}:sessao`);
  } catch {
    // Sem localStorage não há sessão salva.
  }
  if (typeof indexedDB === 'undefined') return;
  await new Promise<void>((pronto) => {
    const pedidoExclusao = indexedDB.deleteDatabase(banco);
    pedidoExclusao.onsuccess = pedidoExclusao.onerror = pedidoExclusao.onblocked = () => pronto();
  });
}
