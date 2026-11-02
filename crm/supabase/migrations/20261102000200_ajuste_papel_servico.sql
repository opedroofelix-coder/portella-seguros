-- Os gatilhos de proteção valem só para quem usa o app (papéis authenticated e anon).
-- O dono do banco (SQL do painel, manutenção) e a chave de serviço passam direto.
-- current_setting('role') guarda o papel definido pelo PostgREST e continua certo dentro de
-- funções security definer (onde current_user vira o dono da função).
create or replace function privado.e_servico() returns boolean
language sql stable set search_path = '' as $$
  select coalesce((select auth.role()) = 'service_role', false)
      or coalesce(nullif(current_setting('role', true), ''), 'none') not in ('authenticated', 'anon')
$$;
