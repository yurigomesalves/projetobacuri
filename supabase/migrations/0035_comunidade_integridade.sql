-- Integração, preservação histórica e governança. Somente service_role executa RPCs.
alter table interacoes add column resumo text not null default '';
alter table interacoes add column proveniencia jsonb not null default '{}';
alter table curadores add column ativo boolean not null default true;
alter table curadores add column afastado_em timestamptz;
alter table membros_comunidade add column encerrado_em timestamptz;
alter table membros_comunidade add column termos_aceitos_em timestamptz;
alter table propostas_versoes drop constraint propostas_versoes_chunk_ids_check;
alter table propostas_versoes add column fontes_sugeridas text not null default '';
alter table propostas_versoes add column ciclo integer not null default 1;
alter table decisoes_comunidade drop constraint decisoes_comunidade_versao_id_key;
alter table decisoes_comunidade add column ciclo integer not null default 1;
alter table decisoes_comunidade add constraint decisao_ciclo_unique unique(versao_id,ciclo);
alter table respostas_ouro add column hashes_fontes jsonb not null default '{}';
alter table pareceres_comunidade add column hashes_fontes jsonb not null default '{}';
alter table eventos_reputacao drop constraint eventos_reputacao_tipo_check;
alter table eventos_reputacao add constraint eventos_reputacao_tipo_check check(tipo in ('comentario_reconhecido','sugestao_incorporada','proposta_aprovada','reversao_fraude','reversao_recurso'));
create unique index recurso_moderacao_pendente on recursos_comunidade(alvo_id) where alvo_tipo='moderacao' and estado='pendente';
create table atividade_comunidade (membro_id uuid references membros_comunidade(user_id),dia date not null,primary key(membro_id,dia));
create table pareceres_recurso (recurso_id uuid references recursos_comunidade(recurso_id),curador_id uuid references curadores(user_id),aprova boolean not null,justificativa text not null,primary key(recurso_id,curador_id));
create table revisoes_ouro (revisao_id uuid primary key default gen_random_uuid(),ouro_id uuid references respostas_ouro(ouro_id),estado text not null default 'pendente',resultado text,criada_em timestamptz default now());
create table pareceres_ouro (revisao_id uuid references revisoes_ouro(revisao_id),curador_id uuid references curadores(user_id),resultado text check(resultado in ('reativar','revogar')),justificativa text not null,primary key(revisao_id,curador_id));
create table eventos_governanca (evento_id uuid primary key default gen_random_uuid(),tipo text not null,alvo_id uuid not null,justificativa text not null,atores uuid[] not null,criado_em timestamptz default now());
alter table atividade_comunidade enable row level security;
alter table pareceres_recurso enable row level security;
alter table revisoes_ouro enable row level security;
alter table pareceres_ouro enable row level security;
alter table eventos_governanca enable row level security;
create unique index revisao_ouro_pendente on revisoes_ouro(ouro_id) where estado='pendente';
create index propostas_discussao_idx on propostas_comunidade(discussao_id);

create or replace function comunidade_e_curador(p_user uuid) returns boolean language sql stable security definer set search_path=public,extensions,pg_temp as $$
 select exists(select 1 from curadores c where c.user_id=p_user and c.ativo and not exists(select 1 from membros_comunidade m where m.user_id=c.user_id and (m.suspenso_em is not null or m.encerrado_em is not null)))
$$;
create or replace function comunidade_recalcular_nivel(p_user uuid) returns void language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare p integer; idade integer; dias integer;
begin
 select pontos,extract(day from now()-criado_em)::int into p,idade from membros_comunidade where user_id=p_user;
 select count(*) into dias from atividade_comunidade where membro_id=p_user;
 update membros_comunidade set nivel=case when p>=300 and idade>=90 and dias>=20 then 'referencia' when p>=100 and idade>=30 and dias>=10 then 'revisor' when p>=20 and idade>=7 and dias>=3 then 'colaborador' else 'participante' end where user_id=p_user;
end $$;
create or replace function comunidade_pontuar(p_user uuid,p_tipo text,p_pontos integer,p_ref_tipo text,p_ref uuid) returns void language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare usado integer; valor integer;
begin
 perform 1 from membros_comunidade where user_id=p_user for update;
 select coalesce(sum(greatest(pontos,0)),0) into usado from eventos_reputacao where membro_id=p_user and criado_em::date=current_date and tipo in ('comentario_reconhecido','sugestao_incorporada');
 valor:=case when p_tipo='proposta_aprovada' then 30 else least(p_pontos,greatest(0,10-usado)) end;
 if valor<=0 then return; end if;
 insert into eventos_reputacao(membro_id,tipo,pontos,referencia_tipo,referencia_id) values(p_user,p_tipo,valor,p_ref_tipo,p_ref) on conflict do nothing;
 update membros_comunidade set pontos=greatest(0,(select coalesce(sum(pontos),0) from eventos_reputacao where membro_id=p_user)) where user_id=p_user;
 perform comunidade_recalcular_nivel(p_user);
end $$;
create function comunidade_autor(p_user uuid) returns text language sql stable security definer set search_path=public,extensions,pg_temp as $$
 select case when encerrado_em is not null then '@conta_desativada' else tag end from membros_comunidade where user_id=p_user
$$;
create function comunidade_fontes(p_ids uuid[]) returns jsonb language sql stable security definer set search_path=public,extensions,pg_temp as $$
 select coalesce(jsonb_agg(jsonb_build_object('chunk_id',c.chunk_id,'fonte_id',f.fonte_id,'titulo',f.titulo,'autor_orgao',f.autor_orgao,'paginas',c.paginas,'trecho',c.conteudo,'url_origem',f.url_origem,'tipo_fonte',f.tipo_fonte,'proveniencia',f.proveniencia,'nota_contexto',c.nota_contexto) order by a.ordem),'[]') from unnest(p_ids) with ordinality a(id,ordem) join chunks c on c.chunk_id=a.id join fontes f on f.fonte_id=c.fonte_id
$$;
create function comunidade_hashes(p_ids uuid[]) returns jsonb language sql stable security definer set search_path=public,extensions,pg_temp as $$
 select coalesce(jsonb_object_agg(c.chunk_id::text,md5(((to_jsonb(c)-'embedding'-'criado_em')||(to_jsonb(f)-'criado_em'))::text)),'{}') from chunks c join fontes f using(fonte_id) where c.chunk_id=any(p_ids)
$$;
create function comunidade_visivel(p_discussao uuid) returns boolean language sql stable security definer set search_path=public,extensions,pg_temp as $$
 select exists(select 1 from discussoes_comunidade where discussao_id=p_discussao and oculto_em is null)
$$;
create function comunidade_impedido(p_versao uuid,p_user uuid) returns boolean language sql stable security definer set search_path=public,extensions,pg_temp as $$
 select exists(select 1 from propostas_versoes v join propostas_comunidade p using(proposta_id) where v.versao_id=p_versao and (p.autor_id=p_user or exists(select 1 from propostas_versoes x join comentarios_comunidade c on c.comentario_id=x.comentario_incorporado_id where x.proposta_id=p.proposta_id and c.autor_id=p_user)))
$$;
create function comunidade_avisar(p_discussao uuid,p_tipo text,p_ator uuid) returns void language sql security definer set search_path=public,extensions,pg_temp as $$
 insert into notificacoes_comunidade(membro_id,tipo,dados)
 select id,p_tipo,jsonb_build_object('discussao_id',p_discussao) from
 (select membro_id id from acompanhamentos_discussao where discussao_id=p_discussao union select autor_id from discussoes_comunidade where discussao_id=p_discussao) x
 join membros_comunidade m on m.user_id=x.id where id<>p_ator and m.encerrado_em is null
$$;

create function comunidade_encaminhar_elegiveis() returns void language sql security definer set search_path=public,extensions,pg_temp as $$
 update propostas_versoes v set estado='encaminhada' from propostas_comunidade p where v.proposta_id=p.proposta_id and v.numero=p.versao_atual and p.estado<>'oculta' and comunidade_visivel(p.discussao_id) and v.estado='aberta' and v.criada_em<=now()-interval '72 hours'
 and (select count(*) from avaliacoes_proposta a join membros_comunidade m on m.user_id=a.membro_id where a.versao_id=v.versao_id and m.encerrado_em is null and m.suspenso_em is null)>=5
 and (select count(*) filter(where a.tipo='apoio')::numeric/nullif(count(*),0) from avaliacoes_proposta a join membros_comunidade m on m.user_id=a.membro_id where a.versao_id=v.versao_id and m.encerrado_em is null and m.suspenso_em is null)>=0.6
$$;

create or replace function comunidade_executar(p_acao text,p_dados jsonb,p_ator uuid) returns jsonb language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare
 v uuid; v2 uuid; alvo uuid; di uuid; pr propostas_comunidade%rowtype; vv propostas_versoes%rowtype;
 co comentarios_comunidade%rowtype; ca candidaturas_curadoria%rowtype; de destituicoes_curadoria%rowtype;
 re recursos_comunidade%rowtype; mo moderacoes_comunidade%rowtype; ou respostas_ouro%rowtype;
 total integer; sim integer; nao integer; votos integer; ciclo_n integer; resultado_n text; ids uuid[]; assinantes uuid[]; ac text; alvo_tipo_n text;
begin
 -- Operações de uma comunidade pequena são serializadas para quóruns/limites estáveis.
 perform pg_advisory_xact_lock(34,0);
 if not exists(select 1 from auth.users where id=p_ator and email_confirmed_at is not null) then raise exception 'NAO_PERMITIDO'; end if;
 if exists(select 1 from membros_comunidade where user_id=p_ator and encerrado_em is not null) then raise exception 'NAO_PERMITIDO'; end if;
 if not exists(select 1 from membros_comunidade where user_id=p_ator) and p_acao<>'salvar_perfil' then raise exception 'PERFIL_AUSENTE'; end if;
 if exists(select 1 from membros_comunidade where user_id=p_ator and suspenso_em is not null) and p_acao not in ('recorrer','ler_notificacoes','encerrar_conta','sair_curadoria') then raise exception 'MEMBRO_SUSPENSO'; end if;
 if p_acao='salvar_perfil' then
  if not coalesce((p_dados->>'aceita_termos')::boolean,false) then raise exception 'TERMOS_OBRIGATORIOS'; end if;
  insert into membros_comunidade(user_id,tag,nome_publico,bio,termos_aceitos_em) values(p_ator,p_dados->>'tag',nullif(p_dados->>'nome_publico',''),nullif(p_dados->>'bio',''),now()) on conflict(user_id) do update set tag=excluded.tag,nome_publico=excluded.nome_publico,bio=excluded.bio,termos_aceitos_em=coalesce(membros_comunidade.termos_aceitos_em,now()),atualizado_em=now();
  return jsonb_build_object('user_id',p_ator);
 end if;
 insert into atividade_comunidade values(p_ator,current_date) on conflict do nothing;
 perform comunidade_recalcular_nivel(p_ator);
 if p_acao='encerrar_conta' then
  if exists(select 1 from curadores where user_id=p_ator and ativo) then raise exception 'SAIA_CURADORIA'; end if;
  update membros_comunidade set tag='@desativado_'||left(replace(p_ator::text,'-',''),18),nome_publico=null,bio=null,encerrado_em=now() where user_id=p_ator;
  update curadores set nome='@conta_desativada',email='desativado@example.invalid',foto_url=null,lattes_url=null,organizacao=null,sobre=null where user_id=p_ator and not ativo;
  update convites set email='desativado@example.invalid',expira_em=now() where email=(select email from auth.users where id=p_ator);
  update candidaturas_curadoria set estado='cancelada' where candidato_id=p_ator and estado='pendente';
  delete from acompanhamentos_discussao where membro_id=p_ator; delete from notificacoes_comunidade where membro_id=p_ator;
  return jsonb_build_object('encerrada',true);
 elsif p_acao='compartilhar' then
  select discussao_id into v from discussoes_comunidade where interacao_id=(p_dados->>'interacao_id')::uuid;
  if found then if not comunidade_visivel(v) then raise exception 'AUSENTE'; end if; return jsonb_build_object('discussao_id',v,'existente',true); end if;
  insert into discussoes_comunidade(interacao_id,autor_id,titulo,motivo,categoria,pergunta,resumo,resposta,citacoes) select i.interacao_id,p_ator,p_dados->>'titulo',p_dados->>'motivo',p_dados->>'categoria',i.pergunta,i.resumo,i.resposta,i.citacoes from interacoes i where i.interacao_id=(p_dados->>'interacao_id')::uuid returning discussao_id into v;
  if v is null then raise exception 'AUSENTE'; end if;
  return jsonb_build_object('discussao_id',v);
 elsif p_acao='comentar' then
  di:=(p_dados->>'discussao_id')::uuid; if not comunidade_visivel(di) then raise exception 'AUSENTE'; end if;
  if nullif(p_dados->>'pai_id','') is not null and not exists(select 1 from comentarios_comunidade where comentario_id=(p_dados->>'pai_id')::uuid and discussao_id=di and pai_id is null and oculto_em is null) then raise exception 'PAI_INVALIDO'; end if;
  insert into comentarios_comunidade(discussao_id,autor_id,pai_id,texto) values(di,p_ator,nullif(p_dados->>'pai_id','')::uuid,p_dados->>'texto') returning comentario_id into v;
  insert into comentarios_revisoes(comentario_id,texto,versao) values(v,p_dados->>'texto',1);
  perform comunidade_avisar(di,'comentario',p_ator); return jsonb_build_object('comentario_id',v);
 elsif p_acao='editar_comentario' then
  select * into co from comentarios_comunidade where comentario_id=(p_dados->>'comentario_id')::uuid;
  if not found or co.autor_id<>p_ator or co.oculto_em is not null or not comunidade_visivel(co.discussao_id) then raise exception 'NAO_PERMITIDO'; end if;
  update comentarios_comunidade set texto=p_dados->>'texto',versao=versao+1,editado_em=now() where comentario_id=co.comentario_id returning versao into total;
  insert into comentarios_revisoes(comentario_id,texto,versao) values(co.comentario_id,p_dados->>'texto',total);
  return jsonb_build_object('comentario_id',co.comentario_id,'versao',total);
 elsif p_acao='reconhecer_comentario' then
  select * into co from comentarios_comunidade where comentario_id=(p_dados->>'comentario_id')::uuid;
  if not found or co.autor_id=p_ator or co.oculto_em is not null or not comunidade_visivel(co.discussao_id) then raise exception 'NAO_PERMITIDO'; end if;
  insert into reconhecimentos_comentario values(co.comentario_id,p_ator,now()) on conflict do nothing;
  select count(*) into total from reconhecimentos_comentario r join membros_comunidade m on m.user_id=r.membro_id where r.comentario_id=co.comentario_id and m.criado_em<=now()-interval '7 days' and m.suspenso_em is null and m.encerrado_em is null;
  if total>=3 then perform comunidade_pontuar(co.autor_id,'comentario_reconhecido',2,'comentario',co.comentario_id); end if;
  return jsonb_build_object('reconhecimentos',total);
 elsif p_acao in ('propor','revisar_proposta') then
  ids:=array(select id::uuid from jsonb_array_elements_text(coalesce(p_dados->'chunk_ids','[]')) with ordinality a(id,ordem) group by id order by min(ordem));
  if cardinality(ids)=0 and char_length(coalesce(p_dados->>'fontes_sugeridas',''))<10 then raise exception 'FONTES_OBRIGATORIAS'; end if;
  if exists(select 1 from unnest(ids) x left join chunks c on c.chunk_id=x where c.chunk_id is null) then raise exception 'FONTE_INVALIDA'; end if;
  if p_acao='propor' then
   di:=(p_dados->>'discussao_id')::uuid; if not comunidade_visivel(di) then raise exception 'AUSENTE'; end if;
   if nullif(p_dados->>'proposta_origem_id','') is not null and not exists(select 1 from propostas_comunidade where proposta_id=(p_dados->>'proposta_origem_id')::uuid and discussao_id=di and estado<>'oculta') then raise exception 'AUSENTE'; end if;
   insert into propostas_comunidade(discussao_id,autor_id,proposta_origem_id) values(di,p_ator,nullif(p_dados->>'proposta_origem_id','')::uuid) returning proposta_id into v; total:=1;
  else
   select * into pr from propostas_comunidade where proposta_id=(p_dados->>'proposta_id')::uuid;
   if not found or pr.autor_id<>p_ator or pr.estado in ('oculta','decidida') or not comunidade_visivel(pr.discussao_id) then raise exception 'NAO_PERMITIDO'; end if;
   v:=pr.proposta_id; di:=pr.discussao_id; total:=pr.versao_atual+1;
   update propostas_comunidade set versao_atual=total,estado='aberta',atualizada_em=now() where proposta_id=v;
  end if;
  if nullif(p_dados->>'comentario_incorporado_id','') is not null then
   select * into co from comentarios_comunidade where comentario_id=(p_dados->>'comentario_incorporado_id')::uuid and discussao_id=di and oculto_em is null;
   if not found then raise exception 'AUSENTE'; end if;
   if co.autor_id<>p_ator then perform comunidade_pontuar(co.autor_id,'sugestao_incorporada',10,'proposta',v); end if;
  end if;
  insert into propostas_versoes(proposta_id,numero,texto,justificativa,chunk_ids,fontes_sugeridas,comentario_incorporado_id) values(v,total,p_dados->>'texto',p_dados->>'justificativa',ids,coalesce(p_dados->>'fontes_sugeridas',''),nullif(p_dados->>'comentario_incorporado_id','')::uuid) returning versao_id into v2;
  perform comunidade_avisar(di,'proposta',p_ator); return jsonb_build_object('proposta_id',v,'versao_id',v2,'numero',total);
 elsif p_acao in ('avaliar','encaminhar','parecer') then
  select * into vv from propostas_versoes where versao_id=(p_dados->>'versao_id')::uuid;
  select * into pr from propostas_comunidade where proposta_id=vv.proposta_id;
  if vv.versao_id is null or pr.estado='oculta' or not comunidade_visivel(pr.discussao_id) or vv.numero<>pr.versao_atual then raise exception 'AUSENTE'; end if;
  if vv.estado not in ('aberta','encaminhada','recorrida') then raise exception 'CONFLITO'; end if;
  if p_acao='avaliar' then
   if pr.autor_id=p_ator then raise exception 'NAO_PERMITIDO'; end if;
   if coalesce((p_dados->>'remover')::boolean,false) then delete from avaliacoes_proposta where versao_id=vv.versao_id and membro_id=p_ator;
   else insert into avaliacoes_proposta(versao_id,membro_id,tipo,justificativa) values(vv.versao_id,p_ator,p_dados->>'tipo',case when p_dados->>'tipo'='apoio' then null else p_dados->>'justificativa' end) on conflict(versao_id,membro_id) do update set tipo=excluded.tipo,justificativa=excluded.justificativa,atualizada_em=now(); end if;
   perform comunidade_encaminhar_elegiveis(); return jsonb_build_object('ok',true);
  end if;
  if not comunidade_e_curador(p_ator) then raise exception 'NAO_PERMITIDO'; end if;
  if p_acao='encaminhar' then
   update propostas_versoes set estado='encaminhada' where versao_id=vv.versao_id;
   insert into eventos_governanca(tipo,alvo_id,justificativa,atores) values('encaminhamento',vv.versao_id,p_dados->>'justificativa',array[p_ator]); return jsonb_build_object('ok',true);
  end if;
  if comunidade_impedido(vv.versao_id,p_ator) then raise exception 'CONFLITO_INTERESSE'; end if;
  if p_dados->>'resultado'='aprovar' and (cardinality(vv.chunk_ids)=0 or jsonb_array_length(comunidade_fontes(vv.chunk_ids))<>cardinality(vv.chunk_ids)) then raise exception 'FONTES_OBRIGATORIAS'; end if;
  if vv.estado='recorrida' and exists(select 1 from pareceres_comunidade where versao_id=vv.versao_id and ciclo<vv.ciclo and curador_id=p_ator) then raise exception 'REVISOR_IMPEDIDO'; end if;
  insert into pareceres_comunidade(versao_id,curador_id,resultado,justificativa,ciclo,hashes_fontes) values(vv.versao_id,p_ator,p_dados->>'resultado',p_dados->>'justificativa',vv.ciclo,comunidade_hashes(vv.chunk_ids)) on conflict(versao_id,curador_id,ciclo) do update set resultado=excluded.resultado,justificativa=excluded.justificativa,hashes_fontes=excluded.hashes_fontes;
  select count(*) filter(where resultado='aprovar'),count(*) filter(where resultado='recusar'),count(distinct resultado) into sim,nao,votos from pareceres_comunidade where versao_id=vv.versao_id and ciclo=vv.ciclo and comunidade_e_curador(curador_id) and not comunidade_impedido(vv.versao_id,curador_id) and hashes_fontes=comunidade_hashes(vv.chunk_ids);
  select count(*) into total from curadores where comunidade_e_curador(user_id) and not comunidade_impedido(vv.versao_id,user_id) and (vv.estado<>'recorrida' or not exists(select 1 from pareceres_comunidade where versao_id=vv.versao_id and ciclo<vv.ciclo and curador_id=user_id));
  resultado_n:=case when sim>=2 and (votos=1 or sim>total/2) then 'aprovada' when nao>=2 and (votos=1 or nao>total/2) then 'recusada' else null end;
  if resultado_n is not null then
   select array_agg(curador_id) into assinantes from pareceres_comunidade where versao_id=vv.versao_id and ciclo=vv.ciclo and comunidade_e_curador(curador_id) and resultado=case when resultado_n='aprovada' then 'aprovar' else 'recusar' end and not comunidade_impedido(vv.versao_id,curador_id) and hashes_fontes=comunidade_hashes(vv.chunk_ids);
   insert into decisoes_comunidade(versao_id,ciclo,resultado,sintese,fontes,pareceristas) values(vv.versao_id,vv.ciclo,resultado_n,p_dados->>'sintese',comunidade_fontes(vv.chunk_ids),assinantes);
   update propostas_versoes set estado='decidida' where versao_id=vv.versao_id; update propostas_comunidade set estado='decidida' where proposta_id=pr.proposta_id;
   if resultado_n='aprovada' then
    perform comunidade_pontuar(pr.autor_id,'proposta_aprovada',30,'proposta',pr.proposta_id);
    insert into respostas_ouro(versao_id,titulo,texto,chunk_ids,hashes_fontes) values(vv.versao_id,(select titulo from discussoes_comunidade where discussao_id=pr.discussao_id),vv.texto,vv.chunk_ids,comunidade_hashes(vv.chunk_ids)) on conflict(versao_id) do update set estado='ativa',hashes_fontes=excluded.hashes_fontes;
   else update respostas_ouro set estado='revogada' where versao_id=vv.versao_id; end if;
   update recursos_comunidade set estado='decidido' where alvo_tipo='decisao' and alvo_id in (select decisao_id from decisoes_comunidade where versao_id=vv.versao_id and ciclo<vv.ciclo);
   perform comunidade_avisar(pr.discussao_id,'decisao',p_ator);
  elsif not exists(select 1 from pareceres_comunidade where versao_id=vv.versao_id and ciclo=vv.ciclo and resultado<>'ajustes') then
   update propostas_versoes set estado='aberta' where versao_id=vv.versao_id;
  end if;
  return jsonb_build_object('resultado',coalesce(resultado_n,'pendente'));
 elsif p_acao='acompanhar' then
  di:=(p_dados->>'discussao_id')::uuid; if not comunidade_visivel(di) then raise exception 'AUSENTE'; end if;
  if coalesce((p_dados->>'remover')::boolean,false) then delete from acompanhamentos_discussao where discussao_id=di and membro_id=p_ator; else insert into acompanhamentos_discussao values(di,p_ator,now()) on conflict do nothing; end if; return jsonb_build_object('ok',true);
 elsif p_acao='ler_notificacoes' then update notificacoes_comunidade set lida_em=now() where membro_id=p_ator; return jsonb_build_object('ok',true);
 elsif p_acao='denunciar' then
  insert into denuncias_comunidade(denunciante_id,alvo_tipo,alvo_id,motivo) values(p_ator,p_dados->>'alvo_tipo',(p_dados->>'alvo_id')::uuid,p_dados->>'motivo') returning denuncia_id into v; return jsonb_build_object('denuncia_id',v);
 elsif p_acao='moderar' then
  if not comunidade_e_curador(p_ator) then raise exception 'NAO_PERMITIDO'; end if;
  alvo:=(p_dados->>'alvo_id')::uuid; ac:=p_dados->>'acao'; alvo_tipo_n:=p_dados->>'alvo_tipo';
  if alvo_tipo_n='discussao' and ac in ('ocultar','restaurar') then update discussoes_comunidade set oculto_em=case when ac='ocultar' then now() else null end where discussao_id=alvo;
  elsif alvo_tipo_n='comentario' and ac in ('ocultar','restaurar') then update comentarios_comunidade set oculto_em=case when ac='ocultar' then now() else null end where comentario_id=alvo;
  elsif alvo_tipo_n='proposta' and ac in ('ocultar','restaurar') then update propostas_comunidade set estado=case when ac='ocultar' then 'oculta' when exists(select 1 from decisoes_comunidade dc join propostas_versoes pv using(versao_id) where pv.proposta_id=alvo) then 'decidida' else 'aberta' end where proposta_id=alvo;
  elsif alvo_tipo_n='membro' and ac in ('suspender_membro','restaurar_membro') then
   if exists(select 1 from curadores where user_id=alvo and ativo) then raise exception 'USE_DESTITUICAO'; end if;
   update membros_comunidade set suspenso_em=case when ac='suspender_membro' then now() else null end where user_id=alvo;
  elsif ac='invalidar_pontos' then
   insert into eventos_reputacao(membro_id,tipo,pontos,referencia_tipo,referencia_id,reverso_de) select membro_id,'reversao_fraude',-pontos,'evento',evento_id,evento_id from eventos_reputacao where (referencia_id=alvo or (alvo_tipo_n='membro' and membro_id=alvo)) and tipo in ('comentario_reconhecido','sugestao_incorporada','proposta_aprovada') and pontos>0 on conflict do nothing;
   update membros_comunidade m set pontos=greatest(0,(select coalesce(sum(e.pontos),0) from eventos_reputacao e where e.membro_id=m.user_id));
   perform comunidade_recalcular_nivel(user_id) from membros_comunidade;
  else raise exception 'ACAO_INVALIDA'; end if;
  insert into moderacoes_comunidade(curador_id,alvo_tipo,alvo_id,acao,justificativa) values(p_ator,alvo_tipo_n,alvo,ac,p_dados->>'justificativa') returning moderacao_id into v;
  update denuncias_comunidade set estado='resolvida' where alvo_id=alvo;
  return jsonb_build_object('moderacao_id',v);
 elsif p_acao='recorrer' then
  alvo:=(p_dados->>'alvo_id')::uuid; alvo_tipo_n:=p_dados->>'alvo_tipo';
  if alvo_tipo_n='decisao' then
   select versao_id into v from decisoes_comunidade where decisao_id=alvo; if v is null then raise exception 'AUSENTE'; end if;
   select * into vv from propostas_versoes where versao_id=v;
   if vv.estado<>'decidida' or not exists(select 1 from decisoes_comunidade where decisao_id=alvo and ciclo=vv.ciclo) then raise exception 'CONFLITO'; end if;
   update propostas_versoes set estado='recorrida',ciclo=ciclo+1 where versao_id=v; update propostas_comunidade set estado='encaminhada' where proposta_id=vv.proposta_id;
   update respostas_ouro set estado='suspensa',motivo_suspensao='Recurso editorial em análise.' where versao_id=v;
  elsif alvo_tipo_n='moderacao' then
   select * into mo from moderacoes_comunidade where moderacao_id=alvo; if not found then raise exception 'AUSENTE'; end if;
  else raise exception 'ACAO_INVALIDA'; end if;
  insert into recursos_comunidade(alvo_tipo,alvo_id,autor_id,motivo) values(alvo_tipo_n,alvo,p_ator,p_dados->>'motivo') returning recurso_id into v;
  return jsonb_build_object('recurso_id',v);
 elsif p_acao='parecer_recurso' then
  if not comunidade_e_curador(p_ator) then raise exception 'NAO_PERMITIDO'; end if;
  select * into re from recursos_comunidade where recurso_id=(p_dados->>'recurso_id')::uuid and estado='pendente';
  if not found or re.alvo_tipo<>'moderacao' then raise exception 'CONFLITO'; end if;
  select * into mo from moderacoes_comunidade where moderacao_id=re.alvo_id;
  if mo.curador_id=p_ator or re.autor_id=p_ator then raise exception 'REVISOR_IMPEDIDO'; end if;
  insert into pareceres_recurso values(re.recurso_id,p_ator,(p_dados->>'aprova')::boolean,p_dados->>'justificativa') on conflict(recurso_id,curador_id) do update set aprova=excluded.aprova,justificativa=excluded.justificativa;
  select count(*) filter(where aprova),count(*) filter(where not aprova) into sim,nao from pareceres_recurso where recurso_id=re.recurso_id and comunidade_e_curador(curador_id);
  select count(*) into total from curadores where comunidade_e_curador(user_id) and user_id not in (mo.curador_id,re.autor_id);
  if (sim>=2 and (nao=0 or sim>total/2)) or (nao>=2 and (sim=0 or nao>total/2)) then
   if sim>nao then
    -- O recurso reverte a ação concreta; não reabre decisões editoriais encerradas.
    if mo.acao='invalidar_pontos' then
     insert into eventos_reputacao(membro_id,tipo,pontos,referencia_tipo,referencia_id,reverso_de)
      select membro_id,'reversao_recurso',-pontos,'evento',evento_id,evento_id from eventos_reputacao
      where tipo='reversao_fraude' and (exists(select 1 from eventos_reputacao original where original.evento_id=eventos_reputacao.reverso_de and original.referencia_id=mo.alvo_id) or (mo.alvo_tipo='membro' and membro_id=mo.alvo_id)) on conflict do nothing;
     update membros_comunidade m set pontos=greatest(0,(select coalesce(sum(e.pontos),0) from eventos_reputacao e where e.membro_id=m.user_id));
     perform comunidade_recalcular_nivel(user_id) from membros_comunidade;
    elsif mo.alvo_tipo='discussao' then update discussoes_comunidade set oculto_em=case when mo.acao='ocultar' then null else now() end where discussao_id=mo.alvo_id;
    elsif mo.alvo_tipo='comentario' then update comentarios_comunidade set oculto_em=case when mo.acao='ocultar' then null else now() end where comentario_id=mo.alvo_id;
    elsif mo.alvo_tipo='proposta' then update propostas_comunidade set estado=case when mo.acao='restaurar' then 'oculta' when exists(select 1 from propostas_versoes pv where pv.proposta_id=mo.alvo_id and pv.numero=propostas_comunidade.versao_atual and pv.estado='decidida') then 'decidida' else 'aberta' end where proposta_id=mo.alvo_id;
    elsif mo.alvo_tipo='membro' then
     if mo.acao='restaurar_membro' and comunidade_e_curador(mo.alvo_id) then raise exception 'USE_DESTITUICAO'; end if;
     update membros_comunidade set suspenso_em=case when mo.acao='suspender_membro' then null else now() end where user_id=mo.alvo_id;
    end if;
   end if;
   update recursos_comunidade set estado='decidido' where recurso_id=re.recurso_id;
   insert into eventos_governanca(tipo,alvo_id,justificativa,atores) values('recurso_moderacao',re.recurso_id,p_dados->>'justificativa',array(select curador_id from pareceres_recurso where recurso_id=re.recurso_id));
  end if; return jsonb_build_object('ok',true);
 elsif p_acao='candidatar' then
  if not comunidade_e_curador(p_ator) then raise exception 'NAO_PERMITIDO'; end if;
  alvo:=(p_dados->>'candidato_id')::uuid;
  if exists(select 1 from curadores where user_id=alvo and ativo) or not exists(select 1 from membros_comunidade where user_id=alvo and encerrado_em is null and suspenso_em is null) then raise exception 'NAO_PERMITIDO'; end if;
  insert into candidaturas_curadoria(candidato_id,indicador_id) values(alvo,p_ator) on conflict(candidato_id) do update set estado='pendente',consentido_em=null,indicador_id=p_ator returning candidatura_id into v;
  delete from votos_candidatura where candidatura_id=v; return jsonb_build_object('candidatura_id',v);
 elsif p_acao in ('consentir_candidatura','votar_candidatura') then
  select * into ca from candidaturas_curadoria where candidatura_id=(p_dados->>'candidatura_id')::uuid and estado='pendente'; if not found then raise exception 'CONFLITO'; end if;
  if not exists(select 1 from membros_comunidade where user_id=ca.candidato_id and encerrado_em is null and suspenso_em is null) then raise exception 'NAO_PERMITIDO'; end if;
  if p_acao='consentir_candidatura' then if ca.candidato_id<>p_ator then raise exception 'NAO_PERMITIDO'; end if; update candidaturas_curadoria set consentido_em=now() where candidatura_id=ca.candidatura_id;
  else if not comunidade_e_curador(p_ator) then raise exception 'NAO_PERMITIDO'; end if; insert into votos_candidatura values(ca.candidatura_id,p_ator,(p_dados->>'aprova')::boolean,now()) on conflict(candidatura_id,curador_id) do update set aprova=excluded.aprova; end if;
  if exists(select 1 from candidaturas_curadoria where candidatura_id=ca.candidatura_id and consentido_em is not null) and not exists(select 1 from curadores c where c.ativo and not exists(select 1 from votos_candidatura vc where vc.candidatura_id=ca.candidatura_id and vc.curador_id=c.user_id and vc.aprova)) then
   insert into curadores(user_id,nome,email,papel) select m.user_id,coalesce(m.nome_publico,m.tag),u.email,'curador' from membros_comunidade m join auth.users u on u.id=m.user_id where m.user_id=ca.candidato_id on conflict(user_id) do update set ativo=true,afastado_em=null;
   update candidaturas_curadoria set estado='aprovada' where candidatura_id=ca.candidatura_id;
   insert into eventos_governanca(tipo,alvo_id,justificativa,atores) values('admissao',ca.candidato_id,'Admissão com anuência e aprovação expressa de todos os curadores.',array(select user_id from curadores where ativo and user_id<>ca.candidato_id));
  end if; return jsonb_build_object('ok',true);
 elsif p_acao='sair_curadoria' then
  if not comunidade_e_curador(p_ator) or (select count(*) from curadores where ativo)<=1 then raise exception 'ULTIMO_CURADOR'; end if;
  update curadores set ativo=false,afastado_em=now() where user_id=p_ator;
  insert into eventos_governanca(tipo,alvo_id,justificativa,atores) values('saida',p_ator,'Saída voluntária da curadoria.',array[p_ator]); return jsonb_build_object('ok',true);
 elsif p_acao='propor_destituicao' then
  alvo:=(p_dados->>'alvo_id')::uuid;
  if not comunidade_e_curador(p_ator) or alvo=p_ator or not comunidade_e_curador(alvo) then raise exception 'NAO_PERMITIDO'; end if;
  insert into destituicoes_curadoria(alvo_id,proponente_id,justificativa) values(alvo,p_ator,p_dados->>'justificativa') returning destituicao_id into v; return jsonb_build_object('destituicao_id',v);
 elsif p_acao='defender_destituicao' then
  update destituicoes_curadoria set defesa=p_dados->>'defesa' where destituicao_id=(p_dados->>'destituicao_id')::uuid and alvo_id=p_ator and estado='pendente'; if not found then raise exception 'NAO_PERMITIDO'; end if; return jsonb_build_object('ok',true);
 elsif p_acao='votar_destituicao' then
  select * into de from destituicoes_curadoria where destituicao_id=(p_dados->>'destituicao_id')::uuid and estado='pendente';
  if not found or not comunidade_e_curador(p_ator) or not comunidade_e_curador(de.alvo_id) or de.alvo_id=p_ator then raise exception 'NAO_PERMITIDO'; end if;
  if de.defesa is null and de.criado_em>now()-interval '7 days' then raise exception 'AGUARDE_DEFESA'; end if;
  insert into votos_destituicao values(de.destituicao_id,p_ator,(p_dados->>'aprova')::boolean,now()) on conflict(destituicao_id,curador_id) do update set aprova=excluded.aprova;
  select count(*) into total from curadores where ativo and user_id<>de.alvo_id;
  select count(*) into sim from votos_destituicao vd join curadores c on c.user_id=vd.curador_id and c.ativo where destituicao_id=de.destituicao_id and aprova and c.user_id<>de.alvo_id;
  if sim>=ceil(total*2.0/3) and total>=1 then
   update curadores set ativo=false,afastado_em=now() where user_id=de.alvo_id; update destituicoes_curadoria set estado='decidida' where destituicao_id=de.destituicao_id;
   insert into eventos_governanca(tipo,alvo_id,justificativa,atores) values('destituicao',de.alvo_id,de.justificativa,array(select curador_id from votos_destituicao where destituicao_id=de.destituicao_id and aprova));
  end if; return jsonb_build_object('ok',true);
 elsif p_acao in ('suspender_ouro','revisar_ouro') then
  if not comunidade_e_curador(p_ator) then raise exception 'NAO_PERMITIDO'; end if;
  select * into ou from respostas_ouro where ouro_id=(p_dados->>'ouro_id')::uuid; if not found then raise exception 'AUSENTE'; end if;
  if p_acao='suspender_ouro' then
   update respostas_ouro set estado='suspensa',suspensa_por=p_ator,motivo_suspensao=p_dados->>'justificativa' where ouro_id=ou.ouro_id;
   insert into acoes_ouro(ouro_id,curador_id,acao,justificativa) values(ou.ouro_id,p_ator,'suspender',p_dados->>'justificativa'); return jsonb_build_object('ok',true);
  end if;
  if ou.estado<>'suspensa' or comunidade_impedido(ou.versao_id,p_ator) then raise exception 'CONFLITO'; end if;
  if p_dados->>'resultado'='reativar' and comunidade_hashes(ou.chunk_ids)<>ou.hashes_fontes then raise exception 'FONTES_ALTERADAS'; end if;
  insert into revisoes_ouro(ouro_id) values(ou.ouro_id) on conflict(ouro_id) where estado='pendente' do update set ouro_id=excluded.ouro_id returning revisao_id into v;
  insert into pareceres_ouro values(v,p_ator,p_dados->>'resultado',p_dados->>'justificativa') on conflict(revisao_id,curador_id) do update set resultado=excluded.resultado,justificativa=excluded.justificativa;
  select count(*) filter(where resultado='reativar'),count(*) filter(where resultado='revogar') into sim,nao from pareceres_ouro where revisao_id=v and comunidade_e_curador(curador_id);
  select count(*) into total from curadores where comunidade_e_curador(user_id) and not comunidade_impedido(ou.versao_id,user_id);
  resultado_n:=case when sim>=2 and (nao=0 or sim>total/2) then 'reativar' when nao>=2 and (sim=0 or nao>total/2) then 'revogar' else null end;
  if resultado_n is not null then
   update respostas_ouro set estado=case when resultado_n='reativar' then 'ativa' else 'revogada' end where ouro_id=ou.ouro_id;
   update revisoes_ouro set estado='decidida',resultado=resultado_n where revisao_id=v;
   insert into acoes_ouro(ouro_id,curador_id,acao,justificativa) values(ou.ouro_id,p_ator,resultado_n,p_dados->>'justificativa');
  end if; return jsonb_build_object('resultado',coalesce(resultado_n,'pendente'));
 elsif p_acao='organizar' then
  if (select nivel from membros_comunidade where user_id=p_ator) not in ('revisor','referencia') then raise exception 'NAO_PERMITIDO'; end if;
  if not comunidade_visivel((p_dados->>'alvo_id')::uuid) then raise exception 'AUSENTE'; end if;
  if p_dados->>'tipo'='relacionar' and (not comunidade_visivel((p_dados->'dados'->>'discussao_id')::uuid) or p_dados->>'alvo_id'=p_dados->'dados'->>'discussao_id') then raise exception 'AUSENTE'; end if;
  insert into organizacoes_comunidade(membro_id,alvo_tipo,alvo_id,acao,dados) values(p_ator,'discussao',(p_dados->>'alvo_id')::uuid,p_dados->>'tipo',p_dados->'dados'); return jsonb_build_object('ok',true);
 end if;
 raise exception 'ACAO_DESCONHECIDA';
end $$;

create or replace function buscar_ouro_ativo(consulta_embedding vector(384),limiar float default 0.90,qtd integer default 2) returns table(ouro_id uuid,versao_id uuid,titulo text,texto text,chunk_ids uuid[],similaridade float) language sql stable security definer set search_path=public,extensions,pg_temp as $$
 select o.ouro_id,o.versao_id,o.titulo,o.texto,o.chunk_ids,1-(o.embedding<=>consulta_embedding) from respostas_ouro o join propostas_versoes v using(versao_id) join propostas_comunidade p using(proposta_id)
 where o.estado='ativa' and p.estado<>'oculta' and comunidade_visivel(p.discussao_id) and o.embedding is not null and o.hashes_fontes=comunidade_hashes(o.chunk_ids) and cardinality(o.chunk_ids)>0 and jsonb_array_length(comunidade_fontes(o.chunk_ids))=cardinality(o.chunk_ids)
 and 1-(o.embedding<=>consulta_embedding)>=greatest(limiar,0.90) order by o.embedding<=>consulta_embedding limit least(qtd,2)
$$;

-- Funções auxiliares nunca podem ser chamadas diretamente com IDs arbitrários.
do $$ declare r record; begin for r in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and (p.proname like 'comunidade_%' or p.proname='buscar_ouro_ativo') loop execute 'revoke all on function '||r.signature||' from public, anon, authenticated'; execute 'grant execute on function '||r.signature||' to service_role'; end loop; end $$;
