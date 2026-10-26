import CFB from 'cfb';
import ExcelJS from 'exceljs';
import type { Aba } from './converter';
import { sha512 } from './sha512';
import type { Celula } from './valores';

/**
 * Leitura da planilha a partir dos bytes do arquivo, sem nada do Node: serve à tela "Importar" do
 * navegador e ao importador de linha de comando. Planilhas protegidas por senha (criptografia
 * "agile" do Excel 2010 em diante) são abertas só em memória, com a criptografia nativa (Web Crypto).
 */

export class ErroSenhaPlanilha extends Error {
  constructor(readonly motivo: 'falta' | 'incorreta') {
    super(motivo === 'falta' ? 'A planilha está protegida por senha.' : 'Senha da planilha incorreta.');
    this.name = 'ErroSenhaPlanilha';
  }
}

const OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

/** Arquivo do Office protegido por senha (o .xlsx comum é um zip; o protegido, um contêiner OLE). */
export function planilhaProtegida(bytes: Uint8Array): boolean {
  return OLE.every((b, i) => bytes[i] === b);
}

/** Lê todas as abas visíveis. Com senha, decifra antes; sem a senha certa, lança ErroSenhaPlanilha. */
export async function lerAbas(bytes: Uint8Array, senha?: string): Promise<Aba[]> {
  let conteudo = bytes;
  if (planilhaProtegida(bytes)) {
    if (!senha) throw new ErroSenhaPlanilha('falta');
    conteudo = await decifrar(bytes, senha);
  }
  const livro = new ExcelJS.Workbook();
  await livro.xlsx.load(conteudo as unknown as ArrayBuffer);
  return livro.worksheets
    .filter((aba) => aba.state === 'visible')
    .map((aba) => {
      const linhas: Celula[][] = [];
      aba.eachRow({ includeEmpty: true }, (linha, numero) => {
        const valores = (linha.values as Celula[]).slice(1); // exceljs começa as colunas em 1
        linhas[numero - 1] = valores;
      });
      return { nome: aba.name, linhas: Array.from(linhas, (l) => l ?? []) };
    });
}

// ── Criptografia "agile" (MS-OFFCRYPTO 2.3.4.10 a 2.3.4.15) ────────────────────────────────────

const BLOCO_VERIFICADOR = [0xfe, 0xa7, 0xd2, 0x76, 0x3b, 0x4b, 0x9e, 0x79];
const BLOCO_HASH_VERIFICADOR = [0xd7, 0xaa, 0x0f, 0x6d, 0x30, 0x61, 0x34, 0x4e];
const BLOCO_CHAVE = [0x14, 0x6e, 0x0b, 0xe7, 0xab, 0xac, 0xd0, 0xd6];
const SEGMENTO = 4096;
const HASHES: Record<string, string> = {
  SHA1: 'SHA-1',
  SHA256: 'SHA-256',
  SHA384: 'SHA-384',
  SHA512: 'SHA-512',
};

interface ParametrosCifra {
  sal: Uint8Array;
  hash: string;
  bitsChave: number;
  bloco: number;
}

const sutil = () => {
  const s = globalThis.crypto?.subtle;
  if (!s) throw new Error('Este navegador não abre planilhas com senha. Use um navegador atualizado.');
  return s;
};

const juntar = (...partes: Uint8Array[]) => {
  const saida = new Uint8Array(partes.reduce((t, p) => t + p.length, 0));
  let i = 0;
  for (const p of partes) {
    saida.set(p, i);
    i += p.length;
  }
  return saida;
};

const uint32 = (n: number) => {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n, true);
  return b;
};

/** Corta no tamanho ou completa com 0x36, como pede a especificação. */
const ajustar = (b: Uint8Array, tamanho: number) =>
  b.length >= tamanho ? b.slice(0, tamanho) : juntar(b, new Uint8Array(tamanho - b.length).fill(0x36));

const base64 = (t: string) => Uint8Array.from(atob(t), (c) => c.charCodeAt(0));

async function resumo(algoritmo: string, ...partes: Uint8Array[]): Promise<Uint8Array> {
  // O Excel usa SHA-512; os demais (raros) vão pelo Web Crypto.
  if (algoritmo === 'SHA-512') return sha512(juntar(...partes));
  return new Uint8Array(await sutil().digest(algoritmo, juntar(...partes)));
}

/** AES-CBC sem preenchimento: o Web Crypto só decifra com PKCS#7, então anexa um bloco de preenchimento válido. */
async function decifrarAes(chave: Uint8Array, iv: Uint8Array, dados: Uint8Array): Promise<Uint8Array> {
  const k = await sutil().importKey('raw', chave, 'AES-CBC', false, ['encrypt', 'decrypt']);
  const ultimo = dados.slice(dados.length - 16);
  const preenchimento = new Uint8Array(16).fill(16);
  const extra = new Uint8Array(
    await sutil().encrypt({ name: 'AES-CBC', iv: ultimo }, k, preenchimento),
  ).slice(0, 16);
  return new Uint8Array(await sutil().decrypt({ name: 'AES-CBC', iv }, k, juntar(dados, extra)));
}

const atributo = (xml: string, nome: string) => xml.match(new RegExp(`\\b${nome}="([^"]*)"`))?.[1];

function parametros(elemento: string): ParametrosCifra {
  const hash = HASHES[atributo(elemento, 'hashAlgorithm') ?? ''];
  if (!hash || atributo(elemento, 'cipherAlgorithm') !== 'AES')
    throw new Error('Criptografia da planilha não suportada. Tire a senha no Excel e tente de novo.');
  return {
    sal: base64(atributo(elemento, 'saltValue') ?? ''),
    hash,
    bitsChave: Number(atributo(elemento, 'keyBits')),
    bloco: Number(atributo(elemento, 'blockSize')),
  };
}

async function decifrar(bytes: Uint8Array, senha: string): Promise<Uint8Array> {
  const ole = CFB.read(bytes, { type: 'array' });
  const info = CFB.find(ole, 'EncryptionInfo')?.content;
  const pacote = CFB.find(ole, 'EncryptedPackage')?.content;
  if (!info || !pacote) throw new Error('Arquivo não reconhecido. Salve a planilha como .xlsx.');
  const infoBytes = Uint8Array.from(info as ArrayLike<number>);
  const versao = new DataView(infoBytes.buffer);
  if (versao.getUint16(0, true) !== 4 || versao.getUint16(2, true) !== 4)
    throw new Error('Criptografia da planilha não suportada. Tire a senha no Excel e tente de novo.');
  const xml = new TextDecoder().decode(infoBytes.slice(8));
  const dadosChave = parametros(xml.match(/<(?:\w+:)?keyData\b[^>]*>/)?.[0] ?? '');
  const elementoChave = xml.match(/<(?:\w+:)?encryptedKey\b[^>]*>/)?.[0] ?? '';
  const cifraSenha = parametros(elementoChave);

  // Hash da senha: H(sal + senha em UTF-16LE), repetido spinCount vezes com o contador na frente.
  const senhaUtf16 = new Uint8Array(senha.length * 2);
  for (let i = 0; i < senha.length; i++)
    new DataView(senhaUtf16.buffer).setUint16(i * 2, senha.charCodeAt(i), true);
  let h = await resumo(cifraSenha.hash, cifraSenha.sal, senhaUtf16);
  const voltas = Number(atributo(elementoChave, 'spinCount') ?? 100000);
  for (let i = 0; i < voltas; i++) h = await resumo(cifraSenha.hash, uint32(i), h);
  const chaveDoBloco = async (bloco: number[]) =>
    ajustar(await resumo(cifraSenha.hash, h, Uint8Array.from(bloco)), cifraSenha.bitsChave / 8);
  const valor = (nome: string) => base64(atributo(elementoChave, nome) ?? '');

  // Confere a senha pelo verificador antes de decifrar o arquivo.
  const entrada = await decifrarAes(
    await chaveDoBloco(BLOCO_VERIFICADOR),
    cifraSenha.sal,
    valor('encryptedVerifierHashInput'),
  );
  const esperado = await decifrarAes(
    await chaveDoBloco(BLOCO_HASH_VERIFICADOR),
    cifraSenha.sal,
    valor('encryptedVerifierHashValue'),
  );
  const obtido = await resumo(cifraSenha.hash, entrada.slice(0, cifraSenha.sal.length));
  if (obtido.some((b, i) => b !== esperado[i])) throw new ErroSenhaPlanilha('incorreta');

  const chave = (
    await decifrarAes(await chaveDoBloco(BLOCO_CHAVE), cifraSenha.sal, valor('encryptedKeyValue'))
  ).slice(0, dadosChave.bitsChave / 8);

  // Pacote: 8 bytes com o tamanho e depois segmentos de 4096 bytes, cada um com o próprio IV.
  const pacoteBytes = Uint8Array.from(pacote as ArrayLike<number>);
  const tamanho = Number(new DataView(pacoteBytes.buffer).getBigUint64(0, true));
  const partes: Uint8Array[] = [];
  for (let i = 0, inicio = 8; inicio < pacoteBytes.length; i++, inicio += SEGMENTO) {
    const iv = ajustar(await resumo(dadosChave.hash, dadosChave.sal, uint32(i)), dadosChave.bloco);
    partes.push(await decifrarAes(chave, iv, pacoteBytes.slice(inicio, inicio + SEGMENTO)));
  }
  return juntar(...partes).slice(0, tamanho);
}
