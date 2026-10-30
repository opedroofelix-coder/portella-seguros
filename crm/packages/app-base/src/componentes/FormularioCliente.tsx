import { zodResolver } from '@hookform/resolvers/zod';
import type { Cliente, DadosRegistro } from '@portella/core';
import {
  cnpjValido,
  formatarDocumento,
  formatarTelefone,
  mascararCep,
  ORIGEM_INDICACAO,
  somenteDigitos,
} from '@portella/core';
import { AreaTexto, Botao, Campo, Entrada, Modal, Selecao, useAvisos } from '@portella/ui';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useRefinada } from '../config';
import { consultarCep, consultarCnpj } from '../consultas';
import { aplicarErros, limparVazios, mensagemErro } from '../erros';
import { useCatalogo, useColecao, useSalvar } from '../hooks/dados';
import { useServicos } from '../servicos';
import { useUsuario } from '../sessao/Sessao';
import { EntradaMascara } from './Entradas';
import { SeletorResponsavel } from './SeletorResponsavel';

const UFS = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');

const esquema = z.object({
  tipoPessoa: z.enum(['PF', 'PJ']),
  nome: z.string().trim().min(2, 'Informe o nome.'),
  documento: z.string(),
  telefone: z.string(),
  email: z
    .string()
    .trim()
    .refine((v) => !v || z.string().email().safeParse(v).success, 'E-mail inválido.'),
  dataNascimento: z.string(),
  cep: z.string(),
  logradouro: z.string(),
  numero: z.string(),
  complemento: z.string(),
  bairro: z.string(),
  cidade: z.string(),
  uf: z.string().max(2),
  origem: z.string(),
  indicadoPor: z.string(),
  observacoes: z.string(),
  responsavelId: z.string().optional(),
});
type Valores = z.infer<typeof esquema>;

function valoresIniciais(c: Partial<Cliente> | undefined, usuarioId: string): Valores {
  const e = c?.endereco ?? {};
  return {
    tipoPessoa: c?.tipoPessoa ?? 'PF',
    nome: c?.nome ?? '',
    documento: c?.documento ? formatarDocumento(c.documento) : '',
    telefone: c?.telefone ? formatarTelefone(c.telefone) : '',
    email: c?.email ?? '',
    dataNascimento: c?.dataNascimento ?? '',
    cep: e.cep ?? '',
    logradouro: e.logradouro ?? '',
    numero: e.numero ?? '',
    complemento: e.complemento ?? '',
    bairro: e.bairro ?? '',
    cidade: e.cidade ?? '',
    uf: e.uf ?? '',
    origem: c?.origem ?? '',
    indicadoPor: c?.indicadoPor ?? '',
    observacoes: c?.observacoes ?? '',
    responsavelId: c?.responsavelId ?? usuarioId,
  };
}

type Consulta = 'cep' | 'cnpj';

export function FormularioCliente({
  cliente,
  inicial,
  aoFechar,
  aoSalvar,
}: {
  cliente?: Cliente;
  /** Dados de um cliente novo (ex.: o lead de uma cotação). */
  inicial?: Partial<DadosRegistro<Cliente>>;
  aoFechar: () => void;
  aoSalvar?: (c: Cliente) => void;
}) {
  const usuario = useUsuario();
  const { clientes } = useServicos();
  const { avisar } = useAvisos();
  const salvar = useSalvar('clientes', clientes);
  const refinada = useRefinada();
  const origens = useCatalogo('origensLead');
  const { data: listaClientes = [] } = useColecao('clientes', clientes);
  const { register, handleSubmit, formState, setError, watch, getValues, setValue } = useForm<Valores>({
    resolver: zodResolver(esquema),
    defaultValues: valoresIniciais(cliente ?? inicial, usuario.id),
  });
  const tipo = watch('tipoPessoa');

  // Endereço pelo CEP e dados da empresa pelo CNPJ: só preenchem os campos vazios.
  const [consultando, setConsultando] = useState<Consulta | null>(null);
  const [falhou, setFalhou] = useState<Consulta | null>(null);
  const consultados = useRef({ cep: cliente?.endereco?.cep ?? '', cnpj: cliente?.documento ?? '' });
  const preencher = (campo: keyof Valores, valor?: string) => {
    if (valor && !getValues(campo)?.trim()) setValue(campo, valor, { shouldDirty: true });
  };
  const cep = somenteDigitos(watch('cep') ?? '');
  const documento = somenteDigitos(watch('documento') ?? '');
  useEffect(() => {
    if (cep.length !== 8 || consultados.current.cep === cep) return;
    consultados.current.cep = cep;
    setConsultando('cep');
    setFalhou(null);
    void consultarCep(cep).then((e) => {
      setConsultando(null);
      if (!e) return setFalhou('cep');
      preencher('logradouro', e.logradouro);
      preencher('bairro', e.bairro);
      preencher('cidade', e.cidade);
      preencher('uf', e.uf);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cep]);
  useEffect(() => {
    if (tipo !== 'PJ' || !cnpjValido(documento) || consultados.current.cnpj === documento) return;
    consultados.current.cnpj = documento;
    setConsultando('cnpj');
    setFalhou(null);
    void consultarCnpj(documento).then((d) => {
      setConsultando(null);
      if (!d) return setFalhou('cnpj');
      preencher('nome', d.razaoSocial);
      preencher('email', d.email);
      if (d.telefone) preencher('telefone', formatarTelefone(d.telefone));
      const e = d.endereco;
      if (e.cep && !getValues('cep')) {
        consultados.current.cep = e.cep;
        setValue('cep', mascararCep(e.cep), { shouldDirty: true });
      }
      preencher('logradouro', e.logradouro);
      preencher('numero', e.numero);
      preencher('complemento', e.complemento);
      preencher('bairro', e.bairro);
      preencher('cidade', e.cidade);
      preencher('uf', e.uf);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, documento]);
  const avisoConsulta = (c: Consulta) =>
    consultando === c
      ? 'Consultando…'
      : falhou === c
        ? 'Não foi possível consultar agora; preencha à mão.'
        : undefined;

  const enviar = handleSubmit(async (v) => {
    const { cep, logradouro, numero, complemento, bairro, cidade, uf, ...resto } = limparVazios(v);
    const endereco = limparVazios({
      cep,
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      uf: uf?.toUpperCase(),
    });
    try {
      const salvo = await salvar.mutateAsync({
        ...(cliente ?? inicial ?? {}),
        ...resto,
        indicadoPor: resto.origem === ORIGEM_INDICACAO ? resto.indicadoPor : undefined,
        // Pessoa jurídica não tem data de nascimento (o campo some, o valor não fica guardado).
        ...(refinada && resto.tipoPessoa === 'PJ' ? { dataNascimento: undefined } : {}),
        documento: resto.documento ? somenteDigitos(resto.documento) : undefined,
        telefone: resto.telefone ? somenteDigitos(resto.telefone) : undefined,
        endereco: Object.values(endereco).some(Boolean) ? endereco : undefined,
      });
      avisar(cliente ? 'Cliente atualizado.' : 'Cliente cadastrado.');
      aoSalvar?.(salvo);
      aoFechar();
    } catch (e) {
      aplicarErros(e, setError);
      avisar(mensagemErro(e), 'erro');
    }
  });

  const erros = formState.errors;
  return (
    <Modal
      aberto
      largura={760}
      titulo={cliente ? 'Editar cliente' : 'Novo cliente'}
      aoFechar={aoFechar}
      alterado={formState.isDirty}
      bloqueado={formState.isSubmitting}
      rodape={
        <>
          <Botao variante="secundario" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" form="form-cliente" carregando={formState.isSubmitting}>
            Salvar
          </Botao>
        </>
      }
    >
      <form id="form-cliente" className="grade-2" onSubmit={enviar} noValidate>
        <Campo rotulo="Tipo">
          <Selecao {...register('tipoPessoa')}>
            <option value="PF">Pessoa física</option>
            <option value="PJ">Pessoa jurídica</option>
          </Selecao>
        </Campo>
        <Campo
          rotulo={tipo === 'PF' ? 'Nome completo' : 'Razão social'}
          obrigatorio
          erro={erros.nome?.message}
        >
          <Entrada autoComplete="off" {...register('nome')} />
        </Campo>
        <Campo
          rotulo={tipo === 'PF' ? 'CPF' : 'CNPJ'}
          erro={erros.documento?.message}
          dica={
            tipo === 'PJ'
              ? (avisoConsulta('cnpj') ?? 'O CNPJ preenche a razão social e o endereço.')
              : undefined
          }
        >
          {refinada ? (
            <EntradaMascara
              mascara="documento"
              placeholder={tipo === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'}
              {...register('documento')}
            />
          ) : (
            <Entrada inputMode="numeric" {...register('documento')} />
          )}
        </Campo>
        <Campo rotulo="Telefone / WhatsApp" erro={erros.telefone?.message}>
          {refinada ? (
            <EntradaMascara
              mascara="telefone"
              type="tel"
              placeholder="(11) 90000-0000"
              {...register('telefone')}
            />
          ) : (
            <Entrada type="tel" inputMode="tel" placeholder="(11) 90000-0000" {...register('telefone')} />
          )}
        </Campo>
        <Campo rotulo="E-mail" erro={erros.email?.message}>
          <Entrada type="email" inputMode="email" {...register('email')} />
        </Campo>
        {tipo === 'PF' && (
          <Campo rotulo="Data de nascimento">
            <Entrada type="date" {...register('dataNascimento')} />
          </Campo>
        )}
        <Campo rotulo="CEP" dica={avisoConsulta('cep') ?? 'O CEP preenche o endereço.'}>
          {refinada ? (
            <EntradaMascara mascara="cep" placeholder="00000-000" {...register('cep')} />
          ) : (
            <Entrada inputMode="numeric" {...register('cep')} />
          )}
        </Campo>
        <Campo rotulo="Endereço">
          <Entrada {...register('logradouro')} />
        </Campo>
        <Campo rotulo="Número">
          <Entrada {...register('numero')} />
        </Campo>
        <Campo rotulo="Complemento">
          <Entrada {...register('complemento')} />
        </Campo>
        <Campo rotulo="Bairro">
          <Entrada {...register('bairro')} />
        </Campo>
        <Campo rotulo="Cidade">
          <Entrada {...register('cidade')} />
        </Campo>
        <Campo rotulo="UF" erro={erros.uf?.message}>
          {refinada ? (
            <Selecao {...register('uf')}>
              <option value="">—</option>
              {UFS.map((uf) => (
                <option key={uf}>{uf}</option>
              ))}
            </Selecao>
          ) : (
            <Entrada maxLength={2} {...register('uf')} />
          )}
        </Campo>
        <Campo rotulo="Origem" dica="Como o cliente chegou à corretora.">
          <Selecao {...register('origem')}>
            <option value="">—</option>
            {[...new Set([...origens, cliente?.origem ?? inicial?.origem].filter(Boolean) as string[])].map(
              (o) => (
                <option key={o}>{o}</option>
              ),
            )}
          </Selecao>
        </Campo>
        {watch('origem') === ORIGEM_INDICACAO && (
          <Campo rotulo="Indicado por" dica="Cliente ou não: quem fez a indicação.">
            <Entrada list="indicacao-cliente" autoComplete="off" {...register('indicadoPor')} />
          </Campo>
        )}
        <datalist id="indicacao-cliente">
          {listaClientes
            .filter((c) => c.id !== cliente?.id)
            .slice(0, 300)
            .map((c) => (
              <option key={c.id} value={c.nome} />
            ))}
        </datalist>
        <SeletorResponsavel {...register('responsavelId')} />
        <Campo rotulo="Observações" className="span-todo">
          <AreaTexto {...register('observacoes')} />
        </Campo>
      </form>
    </Modal>
  );
}
