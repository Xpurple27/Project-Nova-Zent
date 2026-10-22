-- Publication validation runs against real private content inside a rolled-back transaction.
begin;
do $test$
declare bank jsonb; bad jsonb; original_count integer; result jsonb;
begin
 select jsonb_agg(to_jsonb(q) order by logical_question_id),count(*) into bank,original_count from private.questions q where status='ACTIVE' and content_version='production-v1';
 if original_count<>720 then raise exception 'TEST_FAILED: active publication size';end if;
 bad:=jsonb_set(bank,'{0,school_level}','"INVALID"');
 begin perform public.nz_question_import_v2(bad);raise exception 'TEST_FAILED: bad school coverage accepted';exception when others then if sqlerrm not like '%INSUFFICIENT_SCHOOL_CLASS_DIFFICULTY_COVERAGE%' then raise;end if;end;
 bad:=jsonb_set(bank,'{0,correct_option_id}','"missing-option"');
 begin perform public.nz_question_import_v2(bad);raise exception 'TEST_FAILED: invalid key accepted';exception when others then if sqlerrm not like '%INVALID_ITEM%' then raise;end if;end;
 bad:=jsonb_set(bank,'{0,prompt}','"Illegal change to a published prompt"');
 begin perform public.nz_question_import_v2(bad);raise exception 'TEST_FAILED: immutable prompt changed';exception when others then if sqlerrm not like '%IMMUTABLE_QUESTION_REVISION%' then raise;end if;end;
 if (select count(*) from private.questions where status='ACTIVE' and content_version='production-v1')<>original_count then raise exception 'TEST_FAILED: invalid import changed publication';end if;
 result:=public.nz_question_import_v2(bank);
 if (result->>'active')::int<>720 then raise exception 'TEST_FAILED: same revision publication not repeatable';end if;
end $test$;
select 'PASS: school/class/difficulty coverage, answer-key validation, immutable revisions, atomic rejection and repeat publication' as result;
rollback;
