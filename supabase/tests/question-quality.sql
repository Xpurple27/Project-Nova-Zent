-- Audit only the currently published private content; no user/session data is changed.
begin;
do $quality_test$
declare total integer; tiers integer; option_count integer; distractor_count integer;
begin
 select count(*) into total from private.questions where status='ACTIVE' and content_version='production-v1';
 if total<>720 then raise exception 'TEST_FAILED: expected 720 active questions';end if;
 select count(*) into tiers from (select school_level,question_class_id,difficulty,count(*) n
 from private.questions where status='ACTIVE' and content_version='production-v1' group by 1,2,3)t where n=20;
 if tiers<>36 then raise exception 'TEST_FAILED: school/class/tier coverage';end if;
 if exists(select 1 from private.questions q where status='ACTIVE' and content_version='production-v1'
 and (q.explanation_json->>'qualityVersion' is distinct from '3' or q.reviewed_at is null
 or q.explanation_json#>>'{cognitiveDemand,tier}' is distinct from q.difficulty::text
 or jsonb_typeof(q.explanation_json->'distractors') is distinct from 'array')) then raise exception 'TEST_FAILED: missing quality review';end if;
 select count(*) into option_count from private.questions q cross join lateral jsonb_array_elements(q.options_json)o
 where q.status='ACTIVE' and q.content_version='production-v1' and left(o->>'text',1)='$' and right(o->>'text',1)='$';
 if option_count<>2880 then raise exception 'TEST_FAILED: option TeX format';end if;
 select count(*) into distractor_count from private.questions q cross join lateral jsonb_array_elements(q.explanation_json->'distractors')d
 where q.status='ACTIVE' and q.content_version='production-v1' and length(d->>'misconception')>=12
 and d->>'optionId'<>q.correct_option_id and exists(select 1 from jsonb_array_elements(q.options_json)o where o->>'id'=d->>'optionId');
 if distractor_count<>2160 then raise exception 'TEST_FAILED: distractor coverage';end if;
 if has_table_privilege('anon','private.questions','SELECT') or has_table_privilege('authenticated','private.questions','SELECT')
 or has_function_privilege('authenticated','public.nz_combat_bank_v3(uuid)','EXECUTE')
 or has_function_privilege('authenticated','public.nz_question_import_v2(jsonb)','EXECUTE') then raise exception 'TEST_FAILED: private answer boundary exposed';end if;
end $quality_test$;
select 'PASS: 720 private quality-reviewed items, 36 pools, 2880 TeX options, 2160 distractor rationales and answer access denied' as result;
rollback;
