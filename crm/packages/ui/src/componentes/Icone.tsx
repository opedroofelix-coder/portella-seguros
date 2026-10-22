import type { SVGProps } from 'react';

const CAMINHOS = {
  painel: 'M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z',
  clientes:
    'M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-8 0a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm0 2c-2.7 0-6 1.3-6 3.5V19h7v-2.5c0-1 .4-2 1.2-2.8A9 9 0 0 0 8 13Zm8 0c-3 0-7 1.5-7 4v2h14v-2c0-2.5-4-4-7-4Z',
  documento:
    'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Zm0 2.5L17.5 8H14ZM8 12h8v1.6H8Zm0 4h8v1.6H8Z',
  calendario:
    'M7 2v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2Zm-2 8h14v10H5Z',
  funil: 'M3 4h18l-7 9v6l-4 2v-8Z',
  usuarios: 'M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5Z',
  importar: 'M12 3v10.2l3.6-3.6 1.4 1.4-6 6-6-6 1.4-1.4 3.6 3.6V3ZM4 19h16v2H4Z',
  menu: 'M3 6h18v2H3Zm0 5h18v2H3Zm0 5h18v2H3Z',
  fechar: 'm6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4Z',
  mais: 'M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6Z',
  busca:
    'M10 3a7 7 0 0 1 5.6 11.2l5.1 5.1-1.4 1.4-5.1-5.1A7 7 0 1 1 10 3Zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z',
  sair: 'M10 3h9a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-9v-2h9V5h-9Zm-.6 5 1.4 1.4L9.2 11H16v2H9.2l1.6 1.6L9.4 16 5.4 12Z',
  editar: 'M4 17.2V20h2.8L17 9.8 14.2 7Zm15.7-9.5a1 1 0 0 0 0-1.4l-2-2a1 1 0 0 0-1.4 0L14.9 5.8l2.8 2.8Z',
  lixeira: 'M9 3h6l1 1h4v2H4V4h4Zm-3 5h12l-1 13H7Z',
  whatsapp:
    'M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.2 14.1c-.2.6-1.3 1.2-1.8 1.2s-1 .3-3.4-.7a11.6 11.6 0 0 1-4.5-4 5 5 0 0 1-1.1-2.7 2.9 2.9 0 0 1 1-2.2.9.9 0 0 1 .7-.3h.5c.2 0 .4 0 .6.5l.8 2a.6.6 0 0 1 0 .5l-.3.5-.5.5c-.1.2-.3.3-.1.6a8 8 0 0 0 1.5 1.9 7.4 7.4 0 0 0 2.2 1.3c.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.7-.1l1.8.9c.3.1.5.2.5.3a2.3 2.3 0 0 1-.1 1Z',
  carteira:
    'M21 7H5a1 1 0 0 1 0-2h14V3H5a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h16a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1Zm-3 8a1.5 1.5 0 1 1 1.5-1.5A1.5 1.5 0 0 1 18 15Z',
  seta: 'm9 6 6 6-6 6-1.4-1.4 4.6-4.6-4.6-4.6Z',
  voltar: 'm15 6-6 6 6 6 1.4-1.4L11.8 12l4.6-4.6Z',
  moeda:
    'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm1 15.9V19h-2v-1.1a3.9 3.9 0 0 1-3-3.6h2a2 2 0 0 0 2 1.7c1.3 0 2-.6 2-1.4s-.6-1.2-2.3-1.6C9.6 12.5 8.3 11.7 8.3 9.9A3.4 3.4 0 0 1 11 6.6V5h2v1.6a3.6 3.6 0 0 1 2.7 3.4h-2a1.6 1.6 0 0 0-1.8-1.5c-1.1 0-1.8.5-1.8 1.3s.5 1 2.3 1.5c2.1.5 3.6 1.3 3.6 3.3a3.4 3.4 0 0 1-3 3.3Z',
  sol: 'M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm-1-6h2v3h-2Zm0 19h2v3h-2ZM1 11h3v2H1Zm19 0h3v2h-3ZM4.2 5.6l1.4-1.4 2.1 2.1-1.4 1.4Zm12.1 12.1 1.4-1.4 2.1 2.1-1.4 1.4ZM4.2 18.4l2.1-2.1 1.4 1.4-2.1 2.1Zm12.1-12.1 2.1-2.1 1.4 1.4-2.1 2.1Z',
  lua: 'M20.5 14.6A8.5 8.5 0 1 1 9.4 3.5a7 7 0 0 0 11.1 11.1Z',
  automatico: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2v16a8 8 0 0 1 0-16Z',
  aprovar: 'M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4Z',
  tendencia: 'M3 17.6 9 11.6l4 4 6.6-6.6H16V7h7v7h-2V10.4l-8 8-4-4-4.6 4.6Z',
  estorno: 'M12 5V2L7 6l5 4V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8Z',
  ajustes: 'M3 6h10v2H3Zm14 0h4v2h-4Zm-2-2h2v6h-2ZM3 16h4v2H3Zm8 0h10v2H11Zm-2-2h2v6H9Z',
} as const;

export type NomeIcone = keyof typeof CAMINHOS;

export function Icone({
  nome,
  tamanho = 20,
  ...props
}: { nome: NomeIcone; tamanho?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d={CAMINHOS[nome]} />
    </svg>
  );
}
