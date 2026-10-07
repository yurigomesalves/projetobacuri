-- Contador compartilhado, sem endereço IP nem conteúdo de conversa.
create table limites_comunidade (membro_id uuid references membros_comunidade(user_id),janela timestamptz not null,total integer not null,primary key(membro_id,janela));
alter table limites_comunidade enable row level security;
alter function comunidade_executar(text,jsonb,uuid) rename to comunidade_executar_interno;
create function comunidade_executar(p_acao text,p_dados jsonb,p_ator uuid) returns jsonb language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare n integer;
begin
 if p_acao<>'salvar_perfil' and exists(select 1 from membros_comunidade where user_id=p_ator) then
  insert into limites_comunidade values(p_ator,date_trunc('minute',now()),1) on conflict(membro_id,janela) do update set total=limites_comunidade.total+1 returning total into n;
  if n>30 then raise exception 'LIMITE_EXCEDIDO'; end if;
 end if;
 delete from limites_comunidade where janela<now()-interval '1 day';
 return comunidade_executar_interno(p_acao,p_dados,p_ator);
end $$;
revoke all on function comunidade_executar(text,jsonb,uuid),comunidade_executar_interno(text,jsonb,uuid) from public,anon,authenticated;
grant execute on function comunidade_executar(text,jsonb,uuid),comunidade_executar_interno(text,jsonb,uuid) to service_role;
grant select,insert,update,delete on limites_comunidade to service_role;
