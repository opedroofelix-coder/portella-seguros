/**
 * SHA-512 síncrono (FIPS 180-4), com palavras de 64 bits em pares de 32. A senha da planilha passa por
 * 100 mil rodadas de hash: com o Web Crypto, que é assíncrono, isso leva segundos; aqui, uma fração.
 */
const K = [
  '428a2f98d728ae22',
  '7137449123ef65cd',
  'b5c0fbcfec4d3b2f',
  'e9b5dba58189dbbc',
  '3956c25bf348b538',
  '59f111f1b605d019',
  '923f82a4af194f9b',
  'ab1c5ed5da6d8118',
  'd807aa98a3030242',
  '12835b0145706fbe',
  '243185be4ee4b28c',
  '550c7dc3d5ffb4e2',
  '72be5d74f27b896f',
  '80deb1fe3b1696b1',
  '9bdc06a725c71235',
  'c19bf174cf692694',
  'e49b69c19ef14ad2',
  'efbe4786384f25e3',
  '0fc19dc68b8cd5b5',
  '240ca1cc77ac9c65',
  '2de92c6f592b0275',
  '4a7484aa6ea6e483',
  '5cb0a9dcbd41fbd4',
  '76f988da831153b5',
  '983e5152ee66dfab',
  'a831c66d2db43210',
  'b00327c898fb213f',
  'bf597fc7beef0ee4',
  'c6e00bf33da88fc2',
  'd5a79147930aa725',
  '06ca6351e003826f',
  '142929670a0e6e70',
  '27b70a8546d22ffc',
  '2e1b21385c26c926',
  '4d2c6dfc5ac42aed',
  '53380d139d95b3df',
  '650a73548baf63de',
  '766a0abb3c77b2a8',
  '81c2c92e47edaee6',
  '92722c851482353b',
  'a2bfe8a14cf10364',
  'a81a664bbc423001',
  'c24b8b70d0f89791',
  'c76c51a30654be30',
  'd192e819d6ef5218',
  'd69906245565a910',
  'f40e35855771202a',
  '106aa07032bbd1b8',
  '19a4c116b8d2d0c8',
  '1e376c085141ab53',
  '2748774cdf8eeb99',
  '34b0bcb5e19b48a8',
  '391c0cb3c5c95a63',
  '4ed8aa4ae3418acb',
  '5b9cca4f7763e373',
  '682e6ff3d6b2b8a3',
  '748f82ee5defb2fc',
  '78a5636f43172f60',
  '84c87814a1f0ab72',
  '8cc702081a6439ec',
  '90befffa23631e28',
  'a4506cebde82bde9',
  'bef9a3f7b2c67915',
  'c67178f2e372532b',
  'ca273eceea26619c',
  'd186b8c721c0c207',
  'eada7dd6cde0eb1e',
  'f57d4f7fee6ed178',
  '06f067aa72176fba',
  '0a637dc5a2c898a6',
  '113f9804bef90dae',
  '1b710b35131c471b',
  '28db77f523047d84',
  '32caab7b40c72493',
  '3c9ebe0a15c9bebc',
  '431d67c49c100d4c',
  '4cc5d4becb3e42b6',
  '597f299cfc657e2a',
  '5fcb6fab3ad6faec',
  '6c44198c4a475817',
];
const KH = new Int32Array(K.map((k) => parseInt(k.slice(0, 8), 16) | 0));
const KL = new Int32Array(K.map((k) => parseInt(k.slice(8), 16) | 0));
const INICIAL = [
  0x6a09e667, 0xf3bcc908, 0xbb67ae85, 0x84caa73b, 0x3c6ef372, 0xfe94f82b, 0xa54ff53a, 0x5f1d36f1, 0x510e527f,
  0xade682d1, 0x9b05688c, 0x2b3e6c1f, 0x1f83d9ab, 0xfb41bd6b, 0x5be0cd19, 0x137e2179,
];
const WH = new Int32Array(80);
const WL = new Int32Array(80);

export function sha512(dados: Uint8Array): Uint8Array {
  const bits = dados.length * 8;
  const total = Math.ceil((dados.length + 17) / 128) * 128;
  const m = new Uint8Array(total);
  m.set(dados);
  m[dados.length] = 0x80;
  const v = new DataView(m.buffer);
  v.setUint32(total - 8, Math.floor(bits / 2 ** 32));
  v.setUint32(total - 4, bits >>> 0);
  const h = Int32Array.from(INICIAL, (x) => x | 0);

  for (let bloco = 0; bloco < total; bloco += 128) {
    for (let i = 0; i < 16; i++) {
      WH[i] = v.getInt32(bloco + i * 8);
      WL[i] = v.getInt32(bloco + i * 8 + 4);
    }
    for (let i = 16; i < 80; i++) {
      // σ0 = ROTR1 ^ ROTR8 ^ SHR7; σ1 = ROTR19 ^ ROTR61 ^ SHR6
      let xh = WH[i - 15]!;
      let xl = WL[i - 15]!;
      const s0h = ((xh >>> 1) | (xl << 31)) ^ ((xh >>> 8) | (xl << 24)) ^ (xh >>> 7);
      const s0l = ((xl >>> 1) | (xh << 31)) ^ ((xl >>> 8) | (xh << 24)) ^ ((xl >>> 7) | (xh << 25));
      xh = WH[i - 2]!;
      xl = WL[i - 2]!;
      const s1h = ((xh >>> 19) | (xl << 13)) ^ ((xl >>> 29) | (xh << 3)) ^ (xh >>> 6);
      const s1l = ((xl >>> 19) | (xh << 13)) ^ ((xh >>> 29) | (xl << 3)) ^ ((xl >>> 6) | (xh << 26));
      const l = (s0l >>> 0) + (s1l >>> 0) + (WL[i - 7]! >>> 0) + (WL[i - 16]! >>> 0);
      WL[i] = l | 0;
      WH[i] = (s0h + s1h + WH[i - 7]! + WH[i - 16]! + Math.floor(l / 2 ** 32)) | 0;
    }
    let [ah, al, bh, bl, ch, cl, dh, dl, eh, el, fh, fl, gh, gl, hh, hl] = h as unknown as number[];
    for (let i = 0; i < 80; i++) {
      // Σ1(e) = ROTR14 ^ ROTR18 ^ ROTR41; Σ0(a) = ROTR28 ^ ROTR34 ^ ROTR39
      const S1h = ((eh! >>> 14) | (el! << 18)) ^ ((eh! >>> 18) | (el! << 14)) ^ ((el! >>> 9) | (eh! << 23));
      const S1l = ((el! >>> 14) | (eh! << 18)) ^ ((el! >>> 18) | (eh! << 14)) ^ ((eh! >>> 9) | (el! << 23));
      const chh = (eh! & fh!) ^ (~eh! & gh!);
      const chl = (el! & fl!) ^ (~el! & gl!);
      const t1l = (hl! >>> 0) + (S1l >>> 0) + (chl >>> 0) + (KL[i]! >>> 0) + (WL[i]! >>> 0);
      const t1h = hh! + S1h + chh + KH[i]! + WH[i]! + Math.floor(t1l / 2 ** 32);
      const S0h = ((ah! >>> 28) | (al! << 4)) ^ ((al! >>> 2) | (ah! << 30)) ^ ((al! >>> 7) | (ah! << 25));
      const S0l = ((al! >>> 28) | (ah! << 4)) ^ ((ah! >>> 2) | (al! << 30)) ^ ((ah! >>> 7) | (al! << 25));
      const majh = (ah! & bh!) ^ (ah! & ch!) ^ (bh! & ch!);
      const majl = (al! & bl!) ^ (al! & cl!) ^ (bl! & cl!);
      const t2l = (S0l >>> 0) + (majl >>> 0);
      const t2h = S0h + majh + Math.floor(t2l / 2 ** 32);
      hh = gh;
      hl = gl;
      gh = fh;
      gl = fl;
      fh = eh;
      fl = el;
      const nel = (dl! >>> 0) + (t1l >>> 0);
      eh = (dh! + t1h + Math.floor(nel / 2 ** 32)) | 0;
      el = nel | 0;
      dh = ch;
      dl = cl;
      ch = bh;
      cl = bl;
      bh = ah;
      bl = al;
      const nal = (t1l >>> 0) + (t2l >>> 0);
      ah = (t1h + t2h + Math.floor(nal / 2 ** 32)) | 0;
      al = nal | 0;
    }
    const soma = [ah, al, bh, bl, ch, cl, dh, dl, eh, el, fh, fl, gh, gl, hh, hl] as number[];
    for (let i = 0; i < 16; i += 2) {
      const l = (h[i + 1]! >>> 0) + (soma[i + 1]! >>> 0);
      h[i] = (h[i]! + soma[i]! + Math.floor(l / 2 ** 32)) | 0;
      h[i + 1] = l | 0;
    }
  }
  const saida = new Uint8Array(64);
  const sv = new DataView(saida.buffer);
  for (let i = 0; i < 16; i++) sv.setInt32(i * 4, h[i]!);
  return saida;
}
