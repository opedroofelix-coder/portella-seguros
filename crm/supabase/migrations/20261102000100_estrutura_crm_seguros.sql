-- CRM de Seguros da Portella: tabelas, funções auxiliares e regras de acesso (RLS).
-- Cada coleção do app vira uma tabela com o registro inteiro em `dados` (jsonb), no mesmo formato
-- que o IndexedDB guardava. As colunas usadas pelas regras são geradas a partir de `dados`.
-- As regras reproduzem packages/core/src/application/permissoes.ts, propostas.ts e notas.ts.

create extension if not exists unaccent with schema extensions;

create schema if not exists privado;
revoke all on schema privado from public;
grant usage on schema privado to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Usuários
-- ---------------------------------------------------------------------------------------------
create table public.usuarios (
  id text primary key,
  auth_id uuid unique references auth.users (id) on delete set null,
  login text not null unique check (login ~ '^[a-z0-9._@-]{3,60}$'),
  perfil text not null check (perfil in ('admin', 'gestor', 'corretor')),
  ativo boolean not null default true,
  trocar_senha boolean not null default false,
  -- nome, criadoEm, percentualRepasse, produtosAtendidos
  dados jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);
alter table public.usuarios enable row level security;

-- ---------------------------------------------------------------------------------------------
-- Coleções do CRM
-- ---------------------------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'clientes', 'oportunidades', 'apolices', 'propostas', 'estornos', 'vales', 'pagamentos',
    'catalogos', 'checklist', 'recados', 'movimentos', 'despesas', 'fechamentos'
  ] loop
    execute format(
      'create table public.%1$I (
         id text primary key,
         dados jsonb not null,
         responsavel_id text generated always as (dados ->> ''responsavelId'') stored,
         criado_em timestamptz not null default now(),
         atualizado_em timestamptz not null default now()
       )', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create index %I on public.%I (responsavel_id)', t || '_responsavel_idx', t);
  end loop;
end
$$;

-- Proposta: o produtor vê também aquelas em que participa da divisão.
create index propostas_dados_idx on public.propostas using gin (dados jsonb_path_ops);
alter table public.recados
  add column para text generated always as (dados ->> 'para') stored;

-- ---------------------------------------------------------------------------------------------
-- Funções auxiliares (usadas nas regras). Quem está inativo ou ainda com a senha provisória não
-- tem acesso a nada além do próprio cadastro.
-- ---------------------------------------------------------------------------------------------
create function privado.meu_id() returns text
language sql stable security definer set search_path = '' as $$
  select u.id from public.usuarios u
  where u.auth_id = (select auth.uid()) and u.ativo and not u.trocar_senha
$$;

create function privado.meu_perfil() returns text
language sql stable security definer set search_path = '' as $$
  select u.perfil from public.usuarios u
  where u.auth_id = (select auth.uid()) and u.ativo and not u.trocar_senha
$$;

create function privado.e_gestao() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(privado.meu_perfil() in ('admin', 'gestor'), false)
$$;

create function privado.e_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(privado.meu_perfil() = 'admin', false)
$$;

create function privado.e_servico() returns boolean
language sql stable set search_path = '' as $$
  select coalesce((select auth.role()) = 'service_role', false)
$$;

create function privado.normalizar(texto text) returns text
language sql stable set search_path = '' as $$
  select lower(trim(extensions.unaccent(coalesce(texto, ''))))
$$;

-- Cotação nova encaminhada ao usuário que atende o produto (Usuários › "Recebe as cotações novas de").
create function privado.atende_produto(usuario_id text, produto text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.usuarios u, jsonb_array_elements_text(coalesce(u.dados -> 'produtosAtendidos', '[]'::jsonb)) p
    where u.id = usuario_id and u.ativo and privado.normalizar(p) = privado.normalizar(produto)
  )
$$;

-- Primeiro acesso: a tela de entrada precisa saber se já existe usuário, antes do login.
create function public.sistema_configurado() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.usuarios)
$$;

revoke all on all functions in schema privado from public;
grant execute on all functions in schema privado to authenticated;
revoke all on function public.sistema_configurado() from public;
grant execute on function public.sistema_configurado() to anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Gatilhos de proteção
-- ---------------------------------------------------------------------------------------------
create function privado.marcar_atualizacao() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.atualizado_em := now();
  return new;
end
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'clientes', 'oportunidades', 'apolices', 'propostas', 'estornos', 'vales', 'pagamentos',
    'catalogos', 'checklist', 'recados', 'movimentos', 'despesas', 'fechamentos'
  ] loop
    execute format(
      'create trigger marcar_atualizacao before update on public.%I
       for each row execute function privado.marcar_atualizacao()', t);
  end loop;
end
$$;

-- Usuários: o próprio usuário só pode tirar a marca de senha provisória (depois de trocar a senha);
-- login e vínculo com o Auth só mudam pela função `usuarios` (chave de serviço).
create function privado.proteger_usuario() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if privado.e_servico() then
    return new;
  end if;
  if new.id is distinct from old.id or new.auth_id is distinct from old.auth_id
     or new.login is distinct from old.login then
    raise exception 'O login só muda pela administração do sistema.' using errcode = '42501';
  end if;
  if privado.e_admin() then
    return new;
  end if;
  if old.auth_id = (select auth.uid())
     and new.perfil = old.perfil and new.ativo = old.ativo and new.dados = old.dados
     and not new.trocar_senha then
    return new;
  end if;
  raise exception 'Sem permissão para alterar este usuário.' using errcode = '42501';
end
$$;
create trigger proteger_usuario before update on public.usuarios
for each row execute function privado.proteger_usuario();

-- Propostas: o produtor lança e edita só enquanto pendente; não aprova nem lança recebimentos.
create function privado.proteger_proposta() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if privado.e_servico() or privado.e_gestao() then
    return new;
  end if;
  if coalesce(new.dados ->> 'status', '') <> 'pendente' then
    raise exception 'Só a administração aprova propostas.' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' then
    if jsonb_array_length(coalesce(new.dados -> 'recebimentos', '[]'::jsonb)) > 0 then
      raise exception 'Só a administração lança recebimentos.' using errcode = '42501';
    end if;
  else
    if coalesce(old.dados ->> 'status', '') <> 'pendente' then
      raise exception 'Proposta já aprovada: só a administração pode alterar.' using errcode = '42501';
    end if;
    if coalesce(new.dados -> 'recebimentos', '[]'::jsonb) <> coalesce(old.dados -> 'recebimentos', '[]'::jsonb) then
      raise exception 'Só a administração lança recebimentos.' using errcode = '42501';
    end if;
  end if;
  return new;
end
$$;
create trigger proteger_proposta before insert or update on public.propostas
for each row execute function privado.proteger_proposta();

-- Recados: quem recebe só marca (ou desmarca) o próprio "feito".
create function privado.proteger_recado() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  eu text := privado.meu_id();
begin
  if privado.e_servico() or privado.e_gestao() then
    return new;
  end if;
  if eu is null then
    raise exception 'Sem permissão para alterar este recado.' using errcode = '42501';
  end if;
  if (new.dados - 'feitos' - 'atualizadoEm') <> (old.dados - 'feitos' - 'atualizadoEm')
     or (coalesce(new.dados -> 'feitos', '{}'::jsonb) - eu) <> (coalesce(old.dados -> 'feitos', '{}'::jsonb) - eu) then
    raise exception 'Só a administração altera o recado.' using errcode = '42501';
  end if;
  return new;
end
$$;
create trigger proteger_recado before update on public.recados
for each row execute function privado.proteger_recado();

-- ---------------------------------------------------------------------------------------------
-- Regras de acesso (RLS). Nada é liberado para quem não entrou (anon).
-- ---------------------------------------------------------------------------------------------

-- Usuários: a equipe aparece nas listas para todos; cada um sempre lê o próprio cadastro.
create policy usuarios_ler on public.usuarios for select to authenticated
  using (auth_id = (select auth.uid()) or (select privado.meu_id()) is not null);
create policy usuarios_alterar on public.usuarios for update to authenticated
  using ((select privado.e_admin()) or auth_id = (select auth.uid()))
  with check ((select privado.e_admin()) or auth_id = (select auth.uid()));

-- Carteira: corretor vê e edita só o que é dele; gestão vê tudo, transfere e exclui.
do $$
declare
  t text;
begin
  foreach t in array array['clientes', 'oportunidades', 'apolices'] loop
    execute format(
      'create policy %1$I on public.%2$I for select to authenticated
         using ((select privado.e_gestao()) or responsavel_id = (select privado.meu_id()))',
      t || '_ler', t);
    execute format(
      'create policy %1$I on public.%2$I for update to authenticated
         using ((select privado.e_gestao()) or responsavel_id = (select privado.meu_id()))
         with check ((select privado.e_gestao()) or responsavel_id = (select privado.meu_id()))',
      t || '_alterar', t);
    execute format(
      'create policy %1$I on public.%2$I for delete to authenticated
         using ((select privado.e_gestao()))',
      t || '_excluir', t);
  end loop;
end
$$;

create policy clientes_criar on public.clientes for insert to authenticated
  with check ((select privado.e_gestao()) or responsavel_id = (select privado.meu_id()));
create policy apolices_criar on public.apolices for insert to authenticated
  with check ((select privado.e_gestao()) or responsavel_id = (select privado.meu_id()));
-- Cotação nova pode ir direto para quem atende o produto, mesmo cadastrada por um produtor.
create policy oportunidades_criar on public.oportunidades for insert to authenticated
  with check (
    (select privado.e_gestao())
    or responsavel_id = (select privado.meu_id())
    or ((select privado.meu_id()) is not null and privado.atende_produto(responsavel_id, dados ->> 'produto'))
  );

-- Propostas.
create policy propostas_ler on public.propostas for select to authenticated
  using (
    (select privado.e_gestao())
    or responsavel_id = (select privado.meu_id())
    or dados -> 'produtores' @> jsonb_build_array(jsonb_build_object('produtorId', (select privado.meu_id())))
  );
create policy propostas_criar on public.propostas for insert to authenticated
  with check ((select privado.e_gestao()) or responsavel_id = (select privado.meu_id()));
create policy propostas_alterar on public.propostas for update to authenticated
  using ((select privado.e_gestao()) or responsavel_id = (select privado.meu_id()))
  with check ((select privado.e_gestao()) or responsavel_id = (select privado.meu_id()));
create policy propostas_excluir on public.propostas for delete to authenticated
  using (
    (select privado.e_gestao())
    or (responsavel_id = (select privado.meu_id()) and dados ->> 'status' = 'pendente')
  );

-- Comissões do produtor (estornos, vales e pagamentos): ele vê os dele; só a gestão lança.
do $$
declare
  t text;
begin
  foreach t in array array['estornos', 'vales', 'pagamentos'] loop
    execute format(
      'create policy %1$I on public.%2$I for select to authenticated
         using ((select privado.e_gestao()) or responsavel_id = (select privado.meu_id()))',
      t || '_ler', t);
  end loop;
  foreach t in array array['estornos', 'vales', 'pagamentos', 'catalogos', 'movimentos', 'despesas', 'fechamentos'] loop
    execute format(
      'create policy %1$I on public.%2$I for insert to authenticated with check ((select privado.e_gestao()))',
      t || '_criar', t);
    execute format(
      'create policy %1$I on public.%2$I for update to authenticated
         using ((select privado.e_gestao())) with check ((select privado.e_gestao()))',
      t || '_alterar', t);
    execute format(
      'create policy %1$I on public.%2$I for delete to authenticated using ((select privado.e_gestao()))',
      t || '_excluir', t);
  end loop;
  -- Financeiro da corretora: só a gestão lê.
  foreach t in array array['movimentos', 'despesas', 'fechamentos'] loop
    execute format(
      'create policy %1$I on public.%2$I for select to authenticated using ((select privado.e_gestao()))',
      t || '_ler', t);
  end loop;
end
$$;

-- Catálogos (listas de opções): todos leem.
create policy catalogos_ler on public.catalogos for select to authenticated
  using ((select privado.meu_id()) is not null);

-- Checklist pessoal: só o próprio, nem a administração vê o dos outros.
create policy checklist_proprio on public.checklist for all to authenticated
  using (responsavel_id = (select privado.meu_id()))
  with check (responsavel_id = (select privado.meu_id()));

-- Recados: a gestão envia e exclui; quem recebe lê e marca o próprio "feito".
create policy recados_ler on public.recados for select to authenticated
  using (
    (select privado.e_gestao())
    or ((select privado.meu_id()) is not null and para in ((select privado.meu_id()), '*'))
  );
create policy recados_criar on public.recados for insert to authenticated
  with check ((select privado.e_gestao()));
create policy recados_alterar on public.recados for update to authenticated
  using (
    (select privado.e_gestao())
    or ((select privado.meu_id()) is not null and para in ((select privado.meu_id()), '*'))
  )
  with check (
    (select privado.e_gestao())
    or ((select privado.meu_id()) is not null and para in ((select privado.meu_id()), '*'))
  );
create policy recados_excluir on public.recados for delete to authenticated
  using ((select privado.e_gestao()));

-- ---------------------------------------------------------------------------------------------
-- Auditoria: quem criou, alterou ou excluiu cada registro, e quando. Só a administração lê.
-- ---------------------------------------------------------------------------------------------
create table public.auditoria (
  id bigint generated always as identity primary key,
  tabela text not null,
  registro_id text not null,
  acao text not null check (acao in ('criou', 'alterou', 'excluiu')),
  auth_id uuid default auth.uid(),
  usuario_id text,
  campos text[],
  em timestamptz not null default now()
);
alter table public.auditoria enable row level security;
create index auditoria_registro_idx on public.auditoria (tabela, registro_id);
create index auditoria_em_idx on public.auditoria (em desc);
create policy auditoria_ler on public.auditoria for select to authenticated
  using ((select privado.e_admin()));

create function privado.auditar() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  antes jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  depois jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  campos text[];
begin
  if tg_op = 'UPDATE' then
    select array_agg(k order by k) into campos
    from (
      select k from jsonb_object_keys(coalesce(antes -> 'dados', '{}'::jsonb) || coalesce(depois -> 'dados', '{}'::jsonb)) k
      where (antes -> 'dados' -> k) is distinct from (depois -> 'dados' -> k) and k <> 'atualizadoEm'
      union
      select k from jsonb_object_keys(antes - 'dados') k
      where (antes -> k) is distinct from (depois -> k) and k not in ('atualizado_em', 'responsavel_id', 'para')
    ) mudou;
    if campos is null then
      return new;
    end if;
  end if;
  insert into public.auditoria (tabela, registro_id, acao, usuario_id, campos)
  values (
    tg_table_name,
    coalesce(depois ->> 'id', antes ->> 'id'),
    case tg_op when 'INSERT' then 'criou' when 'UPDATE' then 'alterou' else 'excluiu' end,
    (select u.id from public.usuarios u where u.auth_id = (select auth.uid())),
    campos
  );
  return coalesce(new, old);
end
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'usuarios', 'clientes', 'oportunidades', 'apolices', 'propostas', 'estornos', 'vales', 'pagamentos',
    'catalogos', 'checklist', 'recados', 'movimentos', 'despesas', 'fechamentos'
  ] loop
    execute format(
      'create trigger auditar after insert or update or delete on public.%I
       for each row execute function privado.auditar()', t);
  end loop;
end
$$;

-- Ninguém de fora (anon) lê ou grava tabelas; o app usa o papel authenticated.
revoke all on all tables in schema public from anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;
revoke insert, update, delete on public.auditoria from authenticated;
revoke insert, delete on public.usuarios from authenticated;
