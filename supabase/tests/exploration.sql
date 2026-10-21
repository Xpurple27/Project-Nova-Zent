-- Transactional authorization probes. No real users or durable test rows remain.
begin;
insert into auth.users(id) values('71717171-7171-4171-8171-717171717171'),('72727272-7272-4272-8272-727272727272'),('73737373-7373-4373-8373-737373737373');
insert into public.rooms(id,code) values('74747474-7474-4474-8474-747474747474','QAZ7H3T');
insert into public.room_players(room_id,auth_user_id,nickname,seat_index) values('74747474-7474-4474-8474-747474747474','71717171-7171-4171-8171-717171717171','Motion QA A',0),('74747474-7474-4474-8474-747474747474','72727272-7272-4272-8272-727272727272','Motion QA B',1);
do $$ begin
 execute 'set local role authenticated';perform set_config('request.jwt.claim.sub','71717171-7171-4171-8171-717171717171',true);
 if not private.nz_motion_allowed_v1('nz:motion:74747474-7474-4474-8474-747474747474:71717171-7171-4171-8171-717171717171',true) then raise exception 'TEST_FAILED: own sender rejected';end if;
 if private.nz_motion_allowed_v1('nz:motion:74747474-7474-4474-8474-747474747474:72727272-7272-4272-8272-727272727272',true) then raise exception 'TEST_FAILED: sender impersonation';end if;
 if not private.nz_motion_allowed_v1('nz:motion:74747474-7474-4474-8474-747474747474:72727272-7272-4272-8272-727272727272',false) then raise exception 'TEST_FAILED: member receive';end if;
 perform set_config('request.jwt.claim.sub','73737373-7373-4373-8373-737373737373',true);
 if private.nz_motion_allowed_v1('nz:motion:74747474-7474-4474-8474-747474747474:71717171-7171-4171-8171-717171717171',false) then raise exception 'TEST_FAILED: outsider read';end if;
 if private.nz_motion_allowed_v1('nz:motion:not-a-uuid:no',true) then raise exception 'TEST_FAILED: invalid topic';end if;
 if has_function_privilege('authenticated','public.nz_question_import_v1(jsonb)','EXECUTE') or has_function_privilege('authenticated','public.nz_combat_bank_v1()','EXECUTE') or has_table_privilege('authenticated','private.questions','SELECT') then raise exception 'TEST_FAILED: question key exposure';end if;
 execute 'reset role';
end $$;
select 'PASS: per-sender motion identity, member receive, outsider denial, invalid topic and private content boundary' as result;
rollback;
