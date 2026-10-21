-- Metadata and guarded import API only; production answers are never committed as seed data.
alter table private.questions add column estimated_solve_ms integer,add column reviewed_at timestamptz,add column reviewed_by text;
alter table private.questions add constraint production_item_review check(content_version<>'production-v1' or status<>'ACTIVE' or (reviewed_at is not null and reviewed_by is not null and estimated_solve_ms between 1000 and case difficulty when 'EASY' then 12000 when 'MEDIUM' then 18000 else 25000 end));
create unique index production_active_prompt_once on private.questions(lower(regexp_replace(prompt,'\s+',' ','g'))) where status='ACTIVE' and content_version='production-v1';
create function public.nz_question_import_v1(p_items jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare q jsonb; count_items integer:=jsonb_array_length(p_items); count_diff integer; diff text;
begin
 if count_items<120 or count_items>500 then raise exception 'INVALID_BANK_SIZE';end if;
 perform pg_advisory_xact_lock(hashtextextended('nova-question-bank-v1',0));
 for q in select value from jsonb_array_elements(p_items) loop
 if q->>'content_version'<>'production-v1' or q->>'status'<>'ACTIVE' or q#>>'{explanation_json,reviewStatus}'<>'reviewed' or length(coalesce(q->>'reviewed_by',''))=0 or length(coalesce(q#>>'{explanation_json,expectedSolution}',''))=0 or length(coalesce(q#>>'{explanation_json,explanation}',''))=0 then raise exception 'UNREVIEWED_ITEM';end if;
 if length(coalesce(q->>'prompt',''))=0 or jsonb_array_length(q->'options_json')<>4 or (select count(distinct o->>'id') from jsonb_array_elements(q->'options_json') o)<>4 or (select count(distinct lower(trim(o->>'text'))) from jsonb_array_elements(q->'options_json') o)<>4 or (select count(*) from jsonb_array_elements(q->'options_json') o where o->>'id'=q->>'correct_option_id')<>1 then raise exception 'INVALID_ITEM';end if;
 if exists(select 1 from private.questions x where x.logical_question_id=q->>'logical_question_id' and x.revision_number=(q->>'revision_number')::int and (x.revision_id::text<>q->>'revision_id' or x.prompt<>q->>'prompt' or x.options_json<>q->'options_json' or x.correct_option_id<>q->>'correct_option_id')) then raise exception 'IMMUTABLE_QUESTION_REVISION';end if;
 insert into private.questions(revision_id,logical_question_id,revision_number,difficulty,tags,prompt,options_json,correct_option_id,explanation_json,status,content_version,estimated_solve_ms,reviewed_at,reviewed_by)
 values((q->>'revision_id')::uuid,q->>'logical_question_id',(q->>'revision_number')::int,(q->>'difficulty')::private.nz_difficulty,array(select value from jsonb_array_elements_text(q->'tags')),q->>'prompt',q->'options_json',q->>'correct_option_id',q->'explanation_json','ACTIVE','production-v1',(q->>'estimated_solve_ms')::int,clock_timestamp(),q->>'reviewed_by') on conflict(revision_id) do nothing;
 end loop;
 foreach diff in array array['EASY','MEDIUM','HARD'] loop
 select count(*) into count_diff from private.questions where status='ACTIVE' and content_version='production-v1' and difficulty::text=diff and reviewed_at is not null;
 if count_diff<40 then raise exception 'INSUFFICIENT_DIFFICULTY_COVERAGE';end if;
 end loop;
 update private.questions set status='RETIRED' where content_version='pilot-v1' and status='ACTIVE';
 return jsonb_build_object('active',(select count(*) from private.questions where content_version='production-v1' and status='ACTIVE'),'pilotRetired',(select count(*) from private.questions where content_version='pilot-v1' and status='RETIRED'));
end $$;
revoke all on function public.nz_question_import_v1(jsonb) from public,anon,authenticated;
grant execute on function public.nz_question_import_v1(jsonb) to service_role;
