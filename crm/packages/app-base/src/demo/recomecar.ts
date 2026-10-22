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
  let pedido = false;
  try {
    pedido = localStorage.getItem(chave(banco)) === '1';
    if (pedido) {
      localStorage.removeItem(chave(banco));
      localStorage.removeItem(`${banco}:sessao`);
    }
  } catch {
    return;
  }
  if (!pedido || typeof indexedDB === 'undefined') return;
  await new Promise<void>((pronto) => {
    const pedidoExclusao = indexedDB.deleteDatabase(banco);
    pedidoExclusao.onsuccess = pedidoExclusao.onerror = pedidoExclusao.onblocked = () => pronto();
  });
}
