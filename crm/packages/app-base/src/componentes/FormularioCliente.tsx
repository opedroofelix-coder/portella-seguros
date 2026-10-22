import { zodResolver } from '@hookform/resolvers/zod';
import type { Cliente } from '@portella/core';
import { formatarDocumento, formatarTelefone, somenteDigitos } from '@portella/core';
import { AreaTexto, Botao, Campo, Entrada, Modal, Selecao, useAvisos } from '@portella/ui';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { aplicarErros, limparVazios, mensagemErro } from '../erros';
import { useSalvar } from '../hooks/dados';
import { useServicos } from '../servicos';
import { useUsuario } from '../sessao/Sessao';
import { SeletorResponsavel } from './SeletorResponsavel';

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
  observacoes: z.string(),
  responsavelId: z.string().optional(),
});
type Valores = z.infer<typeof esquema>;

function valoresIniciais(c: Cliente | undefined, usuarioId: string): Valores {
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
    observacoes: c?.observacoes ?? '',
    responsavelId: c?.responsavelId ?? usuarioId,
  };
}

export function FormularioCliente({
  cliente,
  aoFechar,
  aoSalvar,
}: {
  cliente?: Cliente;
  aoFechar: () => void;
  aoSalvar?: (c: Cliente) => void;
}) {
  const usuario = useUsuario();
  const { clientes } = useServicos();
  const { avisar } = useAvisos();
  const salvar = useSalvar('clientes', clientes);
  const { register, handleSubmit, formState, setError, watch } = useForm<Valores>({
    resolver: zodResolver(esquema),
    defaultValues: valoresIniciais(cliente, usuario.id),
  });
  const tipo = watch('tipoPessoa');

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
        ...(cliente ?? {}),
        ...resto,
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
        <Campo rotulo={tipo === 'PF' ? 'CPF' : 'CNPJ'} erro={erros.documento?.message}>
          <Entrada inputMode="numeric" {...register('documento')} />
        </Campo>
        <Campo rotulo="Telefone / WhatsApp" erro={erros.telefone?.message}>
          <Entrada type="tel" inputMode="tel" placeholder="(11) 90000-0000" {...register('telefone')} />
        </Campo>
        <Campo rotulo="E-mail" erro={erros.email?.message}>
          <Entrada type="email" inputMode="email" {...register('email')} />
        </Campo>
        {tipo === 'PF' && (
          <Campo rotulo="Data de nascimento">
            <Entrada type="date" {...register('dataNascimento')} />
          </Campo>
        )}
        <Campo rotulo="CEP">
          <Entrada inputMode="numeric" {...register('cep')} />
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
          <Entrada maxLength={2} {...register('uf')} />
        </Campo>
        <SeletorResponsavel {...register('responsavelId')} />
        <Campo rotulo="Observações" className="span-todo">
          <AreaTexto {...register('observacoes')} />
        </Campo>
      </form>
    </Modal>
  );
}
