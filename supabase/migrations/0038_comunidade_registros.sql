-- Discussões de registros públicos. Não altera critérios de níveis nem dados legados.
-- Aplicação remota somente após revisão e confirmação do responsável.
alter table discussoes_comunidade alter column interacao_id drop not null;
alter table discussoes_comunidade add column origem text not null default 'chat' check(origem in ('chat','biografia','evento'));
alter table discussoes_comunidade add column origem_id uuid;
alter table discussoes_comunidade add column origem_link text;
alter table discussoes_comunidade add column registro_original jsonb;
alter table discussoes_comunidade add constraint discussao_origem_coerente check (
 (origem='chat' and interacao_id is not null and origem_id is null and registro_original is null)
 or (origem in ('biografia','evento') and interacao_id is null and origem_id is not null and origem_link is not null and registro_original is not null and jsonb_typeof(registro_original)='object'));
create unique index discussao_registro_unico on discussoes_comunidade(origem,origem_id) where origem<>'chat';
alter table decisoes_comunidade add column estado_editorial text check(estado_editorial in ('pendente','concluida','suspensa'));
alter table decisoes_comunidade add column registro_atualizado jsonb;
alter table decisoes_comunidade add column registro_link text;
alter table decisoes_comunidade add column conclusao_justificativa text check(char_length(conclusao_justificativa) between 10 and 3000);
alter table decisoes_comunidade add column concluida_em timestamptz;
alter table decisoes_comunidade add column concluida_por uuid references curadores(user_id);
alter table decisoes_comunidade add constraint conclusao_editorial_completa check(estado_editorial is distinct from 'concluida' or (registro_atualizado is not null and registro_link is not null and conclusao_justificativa is not null and concluida_em is not null and concluida_por is not null));

-- Projeção exclusivamente de identificação; conteúdo é lido pelo servidor da aplicação.
create function comunidade_registro_editorial(p_decisao uuid,p_ator uuid) returns jsonb language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare d discussoes_comunidade%rowtype; dc decisoes_comunidade%rowtype; vv propostas_versoes%rowtype; identificador text;
begin
 if not comunidade_e_curador(p_ator) then raise exception 'NAO_PERMITIDO'; end if;
 select * into dc from decisoes_comunidade where decisao_id=p_decisao;
 select * into vv from propostas_versoes where versao_id=dc.versao_id;
 select di.* into d from discussoes_comunidade di join propostas_comunidade p using(discussao_id) where p.proposta_id=vv.proposta_id and p.estado<>'oculta';
 if d.origem is null or d.origem='chat' or not comunidade_visivel(d.discussao_id) then raise exception 'AUSENTE'; end if;
 if dc.resultado<>'aprovada' or dc.estado_editorial<>'pendente' or vv.estado<>'decidida' or vv.ciclo<>dc.ciclo then raise exception 'CONFLITO'; end if;
 if comunidade_impedido(vv.versao_id,p_ator) then raise exception 'CONFLITO_INTERESSE'; end if;
 if d.origem='biografia' then select slug into identificador from biografias where biografia_id=d.origem_id and status_curadoria='publicada';
 else select evento_id::text into identificador from eventos_geo where evento_id=d.origem_id and status_curadoria='publicada'; end if;
 if identificador is null then raise exception 'AUSENTE'; end if;
 return jsonb_build_object('origem',d.origem,'registro_id',identificador);
end $$;

create or replace function comunidade_executar_interno(p_acao text,p_dados jsonb,p_ator uuid) returns jsonb language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare
 v uuid; v2 uuid; alvo uuid; di uuid; pr propostas_comunidade%rowtype; vv propostas_versoes%rowtype;
 co comentarios_comunidade%rowtype; ca candidaturas_curadoria%rowtype; de destituicoes_curadoria%rowtype;
 re recursos_comunidade%rowtype; mo moderacoes_comunidade%rowtype; ou respostas_ouro%rowtype;
 registro uuid; link_n text; origem_n text; copia jsonb; dc decisoes_comunidade%rowtype; contexto jsonb;
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
 elsif p_acao='compartilhar_registro' then
  if not coalesce((p_dados->>'confirmacao_publicacao')::boolean,false) then raise exception 'NAO_PERMITIDO'; end if;
  origem_n:=p_dados->>'origem'; copia:=p_dados->'registro_original';
  if origem_n='biografia' then
   select biografia_id,'/biografias/'||slug into registro,link_n from biografias where slug=p_dados->>'registro_id' and status_curadoria='publicada';
  elsif origem_n='evento' then
   select evento_id,'/mapa?evento='||evento_id into registro,link_n from eventos_geo where evento_id=(p_dados->>'registro_id')::uuid and status_curadoria='publicada';
  else raise exception 'NAO_PERMITIDO'; end if;
  if registro is null or copia is null or jsonb_typeof(copia)<>'object' then raise exception 'AUSENTE'; end if;
  if (origem_n='biografia' and copia->>'slug' is distinct from p_dados->>'registro_id') or (origem_n='evento' and copia->>'evento_id' is distinct from registro::text) then raise exception 'NAO_PERMITIDO'; end if;
  select discussao_id into v from discussoes_comunidade where origem=origem_n and origem_id=registro;
  if found then if not comunidade_visivel(v) then raise exception 'AUSENTE'; end if; return jsonb_build_object('discussao_id',v,'existente',true); end if;
  insert into discussoes_comunidade(autor_id,titulo,motivo,categoria,pergunta,resposta,origem,origem_id,origem_link,registro_original)
   values(p_ator,p_dados->>'titulo',p_dados->>'motivo',p_dados->>'categoria','','',origem_n,registro,link_n,copia) returning discussao_id into v;
  return jsonb_build_object('discussao_id',v);
 elsif p_acao='concluir_editorial' then
  contexto:=comunidade_registro_editorial((p_dados->>'decisao_id')::uuid,p_ator);
  copia:=p_dados->'registro_original';
  if copia is null or jsonb_typeof(copia)<>'object' then raise exception 'AUSENTE'; end if;
  if (contexto->>'origem'='biografia' and copia->>'slug' is distinct from contexto->>'registro_id') or (contexto->>'origem'='evento' and copia->>'evento_id' is distinct from contexto->>'registro_id') then raise exception 'NAO_PERMITIDO'; end if;
  select * into dc from decisoes_comunidade where decisao_id=(p_dados->>'decisao_id')::uuid;
  select d.discussao_id,d.registro_original into di,contexto from discussoes_comunidade d join propostas_comunidade p using(discussao_id) join propostas_versoes pv using(proposta_id) where pv.versao_id=dc.versao_id;
  if copia=contexto then raise exception 'REGISTRO_SEM_ALTERACAO'; end if;
  link_n:=case when copia ? 'slug' then '/biografias/'||(copia->>'slug') else '/mapa?evento='||(copia->>'evento_id') end;
  update decisoes_comunidade set estado_editorial='concluida',registro_atualizado=copia,registro_link=link_n,conclusao_justificativa=p_dados->>'justificativa',concluida_em=now(),concluida_por=p_ator where decisao_id=dc.decisao_id;
  perform comunidade_avisar(di,'conclusao_editorial',p_ator);
  return jsonb_build_object('estado_editorial','concluida','registro_link',link_n);
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
   if vv.estado<>'aberta' or exists(select 1 from pareceres_comunidade where versao_id=vv.versao_id and ciclo=vv.ciclo and resultado='ajustes') then raise exception 'CONFLITO'; end if;
   update propostas_versoes set estado='encaminhada' where versao_id=vv.versao_id;
   insert into eventos_governanca(tipo,alvo_id,justificativa,atores) values('encaminhamento',vv.versao_id,p_dados->>'justificativa',array[p_ator]); return jsonb_build_object('ok',true);
  end if;
  if vv.estado not in ('encaminhada','recorrida') then raise exception 'CONFLITO'; end if;
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
    if (select origem from discussoes_comunidade where discussao_id=pr.discussao_id)='chat' then
    insert into respostas_ouro(versao_id,titulo,texto,chunk_ids,hashes_fontes) values(vv.versao_id,(select titulo from discussoes_comunidade where discussao_id=pr.discussao_id),vv.texto,vv.chunk_ids,comunidade_hashes(vv.chunk_ids)) on conflict(versao_id) do update set estado='ativa',hashes_fontes=excluded.hashes_fontes;
    else update decisoes_comunidade set estado_editorial='pendente' where versao_id=vv.versao_id and ciclo=vv.ciclo; end if;
   else update respostas_ouro set estado='revogada' where versao_id=vv.versao_id; end if;
   update recursos_comunidade set estado='decidido' where alvo_tipo='decisao' and alvo_id in (select decisao_id from decisoes_comunidade where versao_id=vv.versao_id and ciclo<vv.ciclo);
   perform comunidade_avisar(pr.discussao_id,'decisao',p_ator);
  elsif not exists(select 1 from pareceres_comunidade where versao_id=vv.versao_id and ciclo=vv.ciclo and resultado<>'ajustes') then
   update propostas_versoes set estado='aberta' where versao_id=vv.versao_id;
  end if;
  return jsonb_build_object('resultado',coalesce(resultado_n,'pendente'),'estado_editorial',(select estado_editorial from decisoes_comunidade where versao_id=vv.versao_id and ciclo=vv.ciclo));
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
   update decisoes_comunidade set estado_editorial='suspensa' where versao_id=v and estado_editorial='pendente';
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
  end if; return jsonb_build_object('resultado',coalesce(resultado_n,'pendente'),'estado_editorial',(select estado_editorial from decisoes_comunidade where versao_id=vv.versao_id and ciclo=vv.ciclo));
 elsif p_acao='organizar' then
  if (select nivel from membros_comunidade where user_id=p_ator) not in ('revisor','referencia') then raise exception 'NAO_PERMITIDO'; end if;
  if not comunidade_visivel((p_dados->>'alvo_id')::uuid) then raise exception 'AUSENTE'; end if;
  if p_dados->>'tipo'='relacionar' and (not comunidade_visivel((p_dados->'dados'->>'discussao_id')::uuid) or p_dados->>'alvo_id'=p_dados->'dados'->>'discussao_id') then raise exception 'AUSENTE'; end if;
  insert into organizacoes_comunidade(membro_id,alvo_tipo,alvo_id,acao,dados) values(p_ator,'discussao',(p_dados->>'alvo_id')::uuid,p_dados->>'tipo',p_dados->'dados'); return jsonb_build_object('ok',true);
 end if;
 raise exception 'ACAO_DESCONHECIDA';
end $$;

-- Projeções públicas explícitas: nenhuma leitura revela interações não compartilhadas.
create or replace function comunidade_versao(p_versao uuid,p_ator uuid) returns jsonb language sql stable security definer set search_path=public,extensions,pg_temp as $$
 select jsonb_build_object('versao_id',v.versao_id,'numero',v.numero,'texto',v.texto,'justificativa',v.justificativa,'fontes_sugeridas',v.fontes_sugeridas,'chunk_ids',v.chunk_ids,'fontes',comunidade_fontes(v.chunk_ids),'estado',v.estado,'ciclo',v.ciclo,'criada_em',v.criada_em,
 'comentario_incorporado_id',v.comentario_incorporado_id,'apoios',(select count(*) from avaliacoes_proposta where versao_id=v.versao_id and tipo='apoio'),'ajustes',(select count(*) from avaliacoes_proposta where versao_id=v.versao_id and tipo='ajustes'),'sem_fundamento',(select count(*) from avaliacoes_proposta where versao_id=v.versao_id and tipo='sem_fundamento'),
 'minha_avaliacao',(select tipo from avaliacoes_proposta where versao_id=v.versao_id and membro_id=p_ator),
 'avaliacoes',coalesce((select jsonb_agg(jsonb_build_object('autor',comunidade_autor(a.membro_id),'tipo',a.tipo,'justificativa',a.justificativa)) from avaliacoes_proposta a where a.versao_id=v.versao_id),'[]'),
 'pareceres',coalesce((select jsonb_agg(jsonb_build_object('autor',coalesce(comunidade_autor(pc.curador_id),c.nome),'resultado',pc.resultado,'justificativa',pc.justificativa,'ciclo',pc.ciclo,'fontes_validas',pc.hashes_fontes=comunidade_hashes(v.chunk_ids))) from pareceres_comunidade pc join curadores c on c.user_id=pc.curador_id where pc.versao_id=v.versao_id),'[]'),
 'decisoes',coalesce((select jsonb_agg(jsonb_build_object('decisao_id',dc.decisao_id,'estado_editorial',dc.estado_editorial,'registro_link',dc.registro_link,'registro_atualizado',dc.registro_atualizado,'conclusao_justificativa',dc.conclusao_justificativa,'concluida_em',dc.concluida_em,'concluida_por',comunidade_autor(dc.concluida_por),'resultado',dc.resultado,'sintese',dc.sintese,'criada_em',dc.criada_em,'ciclo',dc.ciclo)) from decisoes_comunidade dc where dc.versao_id=v.versao_id),'[]'))
 from propostas_versoes v join propostas_comunidade p using(proposta_id) where v.versao_id=p_versao and p.estado<>'oculta' and comunidade_visivel(p.discussao_id)
$$;
create or replace function comunidade_consultar(p_recurso text,p_dados jsonb,p_ator uuid default null) returns jsonb language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare itens jsonb; objeto jsonb; total integer; pagina integer:=greatest(1,least(coalesce((p_dados->>'pagina')::integer,1),10000)); inicio integer; detalhe discussoes_comunidade%rowtype; tag_n text;
begin
 inicio:=(pagina-1)*20;
 if p_recurso in ('eu','notificacoes','curadoria') and (p_ator is null or not exists(select 1 from auth.users where id=p_ator and email_confirmed_at is not null)) then raise exception 'NAO_PERMITIDO'; end if;
 if p_recurso='curadoria' and not comunidade_e_curador(p_ator) then raise exception 'NAO_PERMITIDO'; end if;
 if p_recurso='discussoes' then
  select count(*) into total from discussoes_comunidade d where d.oculto_em is null and (coalesce(p_dados->>'q','')='' or d.titulo ilike '%'||(p_dados->>'q')||'%') and (coalesce(p_dados->>'categoria','')='' or d.categoria=p_dados->>'categoria');
  select coalesce(jsonb_agg(x.item),'[]') into itens from (select jsonb_build_object('discussao_id',d.discussao_id,'origem',d.origem,'origem_id',d.origem_id,'origem_link',d.origem_link,'titulo',d.titulo,'motivo',d.motivo,'categoria',d.categoria,'autor',comunidade_autor(d.autor_id),'criado_em',d.criado_em,'comentarios',(select count(*) from comentarios_comunidade c where c.discussao_id=d.discussao_id and c.oculto_em is null),'propostas',(select count(*) from propostas_comunidade p where p.discussao_id=d.discussao_id and p.estado<>'oculta')) item from discussoes_comunidade d
   where d.oculto_em is null and (coalesce(p_dados->>'q','')='' or d.titulo ilike '%'||(p_dados->>'q')||'%') and (coalesce(p_dados->>'categoria','')='' or d.categoria=p_dados->>'categoria')
   order by case when p_dados->>'ordem'='sem_resposta' then (select count(*) from comentarios_comunidade c where c.discussao_id=d.discussao_id and c.oculto_em is null) end asc,
   case when p_dados->>'ordem'='avaliadas' then (select coalesce(sum(case when a.tipo='apoio' then 1 else -1 end),0) from avaliacoes_proposta a join propostas_versoes v using(versao_id) join propostas_comunidade p using(proposta_id) where p.discussao_id=d.discussao_id and p.estado<>'oculta' and v.numero=p.versao_atual) end desc,d.criado_em desc limit 20 offset inicio) x;
 elsif p_recurso='discussao' then
  select * into detalhe from discussoes_comunidade where discussao_id=(p_dados->>'id')::uuid and oculto_em is null; if not found then raise exception 'AUSENTE'; end if;
  objeto:=jsonb_build_object('discussao_id',detalhe.discussao_id,'origem',detalhe.origem,'origem_id',detalhe.origem_id,'origem_link',detalhe.origem_link,'registro_original',detalhe.registro_original,'titulo',detalhe.titulo,'motivo',detalhe.motivo,'categoria',detalhe.categoria,'autor',comunidade_autor(detalhe.autor_id),'autor_id',detalhe.autor_id,'pergunta',detalhe.pergunta,'resumo',detalhe.resumo,'resposta',detalhe.resposta,'citacoes',detalhe.citacoes,'criado_em',detalhe.criado_em,'acompanhando',exists(select 1 from acompanhamentos_discussao where discussao_id=detalhe.discussao_id and membro_id=p_ator),
   'comentarios',coalesce((select jsonb_agg(x.item) from (select jsonb_build_object('comentario_id',c.comentario_id,'autor',comunidade_autor(c.autor_id),'autor_id',c.autor_id,'texto',c.texto,'pai_id',c.pai_id,'versao',c.versao,'editado_em',c.editado_em,'criado_em',c.criado_em,'revisoes',coalesce((select jsonb_agg(jsonb_build_object('texto',r.texto,'versao',r.versao)) from comentarios_revisoes r where r.comentario_id=c.comentario_id),'[]')) item from comentarios_comunidade c where c.discussao_id=detalhe.discussao_id and c.oculto_em is null and (c.pai_id is null or exists(select 1 from comentarios_comunidade cp where cp.comentario_id=c.pai_id and cp.oculto_em is null)) order by c.criado_em limit 20 offset inicio) x),'[]'),
   'total_comentarios',(select count(*) from comentarios_comunidade c where c.discussao_id=detalhe.discussao_id and c.oculto_em is null and (c.pai_id is null or exists(select 1 from comentarios_comunidade cp where cp.comentario_id=c.pai_id and cp.oculto_em is null))),
   'propostas',coalesce((select jsonb_agg(x.item) from (select jsonb_build_object('proposta_id',p.proposta_id,'autor',comunidade_autor(p.autor_id),'autor_id',p.autor_id,'estado',p.estado,'versao_atual',p.versao_atual,'proposta_origem_id',p.proposta_origem_id,'versoes',(select jsonb_agg(comunidade_versao(v.versao_id,p_ator) order by v.numero desc) from propostas_versoes v where v.proposta_id=p.proposta_id)) item from propostas_comunidade p where p.discussao_id=detalhe.discussao_id and p.estado<>'oculta' and (p_dados->>'versao_id' is null or exists(select 1 from propostas_versoes pv where pv.proposta_id=p.proposta_id and pv.versao_id=(p_dados->>'versao_id')::uuid)) order by p.criada_em limit 20 offset inicio) x),'[]'),
   'total_propostas',(select count(*) from propostas_comunidade p where p.discussao_id=detalhe.discussao_id and p.estado<>'oculta' and (p_dados->>'versao_id' is null or exists(select 1 from propostas_versoes pv where pv.proposta_id=p.proposta_id and pv.versao_id=(p_dados->>'versao_id')::uuid))),
   'organizacao',coalesce((select jsonb_agg(jsonb_build_object('acao',o.acao,'dados',o.dados,'autor',comunidade_autor(o.membro_id),'criado_em',o.criado_em)) from organizacoes_comunidade o where o.alvo_id=detalhe.discussao_id),'[]'));
  return objeto;
 elsif p_recurso in ('perfil','eu') then
  if p_recurso='eu' then perform comunidade_recalcular_nivel(p_ator); end if;
  select jsonb_build_object('user_id',m.user_id,'tag',comunidade_autor(m.user_id),'nome_publico',m.nome_publico,'bio',m.bio,'nivel',m.nivel,'pontos',m.pontos,'criado_em',m.criado_em,'suspenso',m.suspenso_em is not null,'curador',comunidade_e_curador(m.user_id)) into objeto from membros_comunidade m where m.encerrado_em is null and case when p_recurso='eu' then m.user_id=p_ator else m.tag=p_dados->>'tag' end;
  if p_recurso='eu' then
   return jsonb_build_object('perfil',objeto,'user_id',p_ator,'curador',comunidade_e_curador(p_ator),'extrato',coalesce((select jsonb_agg(jsonb_build_object('tipo',x.tipo,'pontos',x.pontos,'criado_em',x.criado_em)) from (select * from eventos_reputacao where membro_id=p_ator order by criado_em desc limit 20) x),'[]'),'candidaturas',coalesce((select jsonb_agg(jsonb_build_object('candidatura_id',c.candidatura_id,'estado',c.estado,'consentido_em',c.consentido_em)) from candidaturas_curadoria c where candidato_id=p_ator),'[]'),'moderacoes',coalesce((select jsonb_agg(jsonb_build_object('moderacao_id',mc.moderacao_id,'acao',mc.acao,'justificativa',mc.justificativa)) from moderacoes_comunidade mc where mc.alvo_id=p_ator or exists(select 1 from comentarios_comunidade cc where cc.comentario_id=mc.alvo_id and cc.autor_id=p_ator) or exists(select 1 from propostas_comunidade pp where pp.proposta_id=mc.alvo_id and pp.autor_id=p_ator) or exists(select 1 from discussoes_comunidade dd where dd.discussao_id=mc.alvo_id and dd.autor_id=p_ator)),'[]'));
  end if;
  if objeto is null then raise exception 'AUSENTE'; end if;
  return objeto||jsonb_build_object('contribuicoes',coalesce((select jsonb_agg(jsonb_build_object('discussao_id',d.discussao_id,'origem',d.origem,'origem_id',d.origem_id,'origem_link',d.origem_link,'titulo',d.titulo)) from discussoes_comunidade d where d.autor_id=(objeto->>'user_id')::uuid and d.oculto_em is null),'[]'));
 elsif p_recurso='fontes' then
  select coalesce(jsonb_agg(x.item),'[]') into itens from (select jsonb_build_object('chunk_id',c.chunk_id,'titulo',f.titulo,'autor_orgao',f.autor_orgao,'paginas',c.paginas,'trecho',left(c.conteudo,2000),'url_origem',f.url_origem) item from chunks c join fontes f using(fonte_id) where char_length(coalesce(p_dados->>'q',''))>=3 and (f.titulo ilike '%'||(p_dados->>'q')||'%' or c.conteudo ilike '%'||(p_dados->>'q')||'%') order by f.titulo,c.ordem limit 20 offset inicio) x; select count(*) into total from chunks c join fontes f using(fonte_id) where char_length(coalesce(p_dados->>'q',''))>=3 and (f.titulo ilike '%'||(p_dados->>'q')||'%' or c.conteudo ilike '%'||(p_dados->>'q')||'%');
 elsif p_recurso='notificacoes' then
  select count(*) into total from notificacoes_comunidade n where membro_id=p_ator and comunidade_visivel((n.dados->>'discussao_id')::uuid);
  select coalesce(jsonb_agg(x.item),'[]') into itens from (select jsonb_build_object('notificacao_id',n.notificacao_id,'tipo',n.tipo,'dados',n.dados,'lida_em',n.lida_em,'criada_em',n.criada_em) item from notificacoes_comunidade n where membro_id=p_ator and comunidade_visivel((n.dados->>'discussao_id')::uuid) order by criada_em desc limit 20 offset inicio) x;
 elsif p_recurso in ('transparencia','ouro') then
  if p_recurso='ouro' then
   select count(*) into total from respostas_ouro o join propostas_versoes v using(versao_id) join propostas_comunidade p using(proposta_id) where p.estado<>'oculta' and comunidade_visivel(p.discussao_id) and (p_dados->>'id' is null or o.ouro_id=(p_dados->>'id')::uuid);
   select coalesce(jsonb_agg(x.item),'[]') into itens from (select jsonb_build_object('ouro_id',o.ouro_id,'versao_id',o.versao_id,'titulo',o.titulo,'texto',o.texto,'estado',o.estado,'fontes_validas',o.hashes_fontes=comunidade_hashes(o.chunk_ids),'fontes',comunidade_fontes(o.chunk_ids),'discussao_id',p.discussao_id,'autor',comunidade_autor(p.autor_id)) item from respostas_ouro o join propostas_versoes v using(versao_id) join propostas_comunidade p using(proposta_id) where p.estado<>'oculta' and comunidade_visivel(p.discussao_id) and (p_dados->>'id' is null or o.ouro_id=(p_dados->>'id')::uuid) order by o.criada_em desc limit 20 offset inicio) x;
  else
   select count(*) into total from decisoes_comunidade dc join propostas_versoes v using(versao_id) join propostas_comunidade p using(proposta_id) where p.estado<>'oculta' and comunidade_visivel(p.discussao_id);
   select coalesce(jsonb_agg(x.item),'[]') into itens from (select jsonb_build_object('decisao_id',dc.decisao_id,'estado_editorial',dc.estado_editorial,'registro_link',dc.registro_link,'registro_atualizado',dc.registro_atualizado,'conclusao_justificativa',dc.conclusao_justificativa,'concluida_em',dc.concluida_em,'concluida_por',comunidade_autor(dc.concluida_por),'versao_id',dc.versao_id,'resultado',dc.resultado,'sintese',dc.sintese,'criada_em',dc.criada_em,'ciclo',dc.ciclo,'fontes',dc.fontes,'discussao_id',p.discussao_id,'pareceristas',(select jsonb_agg(coalesce(comunidade_autor(c.user_id),c.nome)) from curadores c where c.user_id=any(dc.pareceristas))) item from decisoes_comunidade dc join propostas_versoes v using(versao_id) join propostas_comunidade p using(proposta_id) where p.estado<>'oculta' and comunidade_visivel(p.discussao_id) order by dc.criada_em desc limit 20 offset inicio) x;
  end if;
  return jsonb_build_object('itens',itens,'total',total,'pagina',pagina,'eventos',coalesce((select jsonb_agg(jsonb_build_object('tipo',e.tipo,'justificativa',e.justificativa,'criado_em',e.criado_em,'atores',(select jsonb_agg(coalesce(comunidade_autor(c.user_id),c.nome)) from curadores c where c.user_id=any(e.atores)))) from (select * from eventos_governanca where tipo in ('admissao','saida','destituicao') order by criado_em desc limit 20) e),'[]'),'revisoes_ouro',coalesce((select jsonb_agg(jsonb_build_object('ouro_id',a.ouro_id,'acao',a.acao,'justificativa',a.justificativa,'criada_em',a.criada_em)) from acoes_ouro a join respostas_ouro o using(ouro_id) join propostas_versoes v using(versao_id) join propostas_comunidade p using(proposta_id) where p.estado<>'oculta' and comunidade_visivel(p.discussao_id)),'[]'));
 elsif p_recurso='curadoria' then
  perform comunidade_encaminhar_elegiveis();
  select coalesce(jsonb_agg(x.item),'[]') into itens from (select jsonb_build_object('proposta_id',p.proposta_id,'discussao_id',p.discussao_id,'titulo',d.titulo,'origem',d.origem,'autor',comunidade_autor(p.autor_id),'versao',comunidade_versao(v.versao_id,p_ator),'impedido',comunidade_impedido(v.versao_id,p_ator)) item from propostas_versoes v join propostas_comunidade p using(proposta_id) join discussoes_comunidade d using(discussao_id) where v.numero=p.versao_atual and v.estado in ('aberta','encaminhada','recorrida') and p.estado<>'oculta' and d.oculto_em is null order by case when v.estado in ('encaminhada','recorrida') then 0 else 1 end,(select count(*) filter(where tipo='apoio')-count(*) filter(where tipo<>'apoio') from avaliacoes_proposta a where a.versao_id=v.versao_id) desc,v.criada_em limit 20 offset inicio) x;
  return jsonb_build_object('editoriais',coalesce((select jsonb_agg(x.item) from (select jsonb_build_object('decisao_id',dc.decisao_id,'discussao_id',d.discussao_id,'versao_id',v.versao_id,'titulo',d.titulo,'origem',d.origem,'origem_link',d.origem_link,'estado_editorial',dc.estado_editorial,'impedido',comunidade_impedido(v.versao_id,p_ator)) item from decisoes_comunidade dc join propostas_versoes v using(versao_id) join propostas_comunidade p using(proposta_id) join discussoes_comunidade d using(discussao_id) where dc.estado_editorial='pendente' and v.estado='decidida' and dc.ciclo=v.ciclo and p.estado<>'oculta' and d.oculto_em is null order by dc.criada_em limit 20 offset inicio) x),'[]'),'itens',itens,'pagina',pagina,'curadores',coalesce((select jsonb_agg(jsonb_build_object('user_id',c.user_id,'nome',c.nome,'ativo',c.ativo)) from curadores c),'[]'),
   'candidaturas',coalesce((select jsonb_agg(jsonb_build_object('candidatura_id',ca.candidatura_id,'candidato',comunidade_autor(ca.candidato_id),'consentido_em',ca.consentido_em,'votos',(select jsonb_agg(jsonb_build_object('curador_id',vc.curador_id,'aprova',vc.aprova)) from votos_candidatura vc where vc.candidatura_id=ca.candidatura_id))) from candidaturas_curadoria ca where estado='pendente'),'[]'),
   'destituicoes',coalesce((select jsonb_agg(jsonb_build_object('destituicao_id',de.destituicao_id,'alvo_id',de.alvo_id,'justificativa',de.justificativa,'defesa',de.defesa,'criado_em',de.criado_em)) from destituicoes_curadoria de where estado='pendente'),'[]'),
   'denuncias',coalesce((select jsonb_agg(to_jsonb(x)) from (select denuncia_id,alvo_tipo,alvo_id,motivo from denuncias_comunidade where estado='pendente' limit 100) x),'[]'),
   'moderacoes',coalesce((select jsonb_agg(to_jsonb(x)) from (select moderacao_id,alvo_tipo,alvo_id,acao,justificativa from moderacoes_comunidade order by criada_em desc limit 100) x),'[]'),
   'recursos',coalesce((select jsonb_agg(to_jsonb(x)) from (select recurso_id,alvo_tipo,alvo_id,motivo from recursos_comunidade where estado='pendente' limit 100) x),'[]'));
 else raise exception 'RECURSO_DESCONHECIDO'; end if;
 return jsonb_build_object('itens',itens,'total',total,'pagina',pagina);
end $$;

create function comunidade_ouro_somente_chat() returns trigger language plpgsql set search_path=public,extensions,pg_temp as $$
begin
 if not exists(select 1 from propostas_versoes v join propostas_comunidade p using(proposta_id) join discussoes_comunidade d using(discussao_id) where v.versao_id=new.versao_id and d.origem='chat') then raise exception 'NAO_PERMITIDO'; end if;
 return new;
end $$;
create trigger ouro_origem_chat before insert or update on respostas_ouro for each row execute function comunidade_ouro_somente_chat();
revoke all on function comunidade_registro_editorial(uuid,uuid), comunidade_executar_interno(text,jsonb,uuid), comunidade_consultar(text,jsonb,uuid), comunidade_versao(uuid,uuid), comunidade_ouro_somente_chat() from public,anon,authenticated;
grant execute on function comunidade_registro_editorial(uuid,uuid), comunidade_executar_interno(text,jsonb,uuid), comunidade_consultar(text,jsonb,uuid), comunidade_versao(uuid,uuid) to service_role;
