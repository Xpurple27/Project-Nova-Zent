-- Real authenticated RPC/constraints/private-bank tests; all fixtures roll back.
begin;
insert into auth.users(id,is_anonymous) values('81111111-1111-4111-8111-111111111111',true),('82222222-2222-4222-8222-222222222222',true);
do $test$
declare u1 uuid:='81111111-1111-4111-8111-111111111111';u2 uuid:='82222222-2222-4222-8222-222222222222';r jsonb;rid uuid;sid uuid;req uuid;bank jsonb;
begin
 execute 'set local role authenticated';perform set_config('request.jwt.claim.sub',u1::text,true);
 r:=public.nz_lobby_v1('CREATE','{"nickname":"Grade QA 1"}',gen_random_uuid());rid:=(r->>'id')::uuid;sid:=(r->>'sessionId')::uuid;
 r:=public.nz_lobby_v1('SELECT_CLASS',jsonb_build_object('roomId',rid,'classId','WARRIOR'),gen_random_uuid());
 begin perform public.nz_lobby_v1('SET_READY',jsonb_build_object('roomId',rid,'ready',true),gen_random_uuid());raise exception 'TEST_FAILED: ready without grade';exception when others then if sqlerrm not like '%SCHOOL_LEVEL_REQUIRED%' then raise;end if;end;
 begin perform public.nz_lobby_v1('SELECT_SCHOOL',jsonb_build_object('roomId',rid,'schoolLevel','UNIVERSITY'),gen_random_uuid());raise exception 'TEST_FAILED: invalid grade';exception when others then if sqlerrm not like '%INVALID_SCHOOL_LEVEL%' then raise;end if;end;
 r:=public.nz_lobby_v1('SELECT_SCHOOL',jsonb_build_object('roomId',rid,'schoolLevel','SD'),gen_random_uuid());
 perform set_config('request.jwt.claim.sub',u2::text,true);
 r:=public.nz_lobby_v1('JOIN',jsonb_build_object('code',r->>'code','nickname','Grade QA 2'),gen_random_uuid());
 r:=public.nz_lobby_v1('SELECT_CLASS',jsonb_build_object('roomId',rid,'classId','MAGE'),gen_random_uuid());
 r:=public.nz_lobby_v1('SELECT_SCHOOL',jsonb_build_object('roomId',rid,'schoolLevel','SMP','playerId',r->'players'->0->>'id'),gen_random_uuid());
 if (select x->>'schoolLevel' from jsonb_array_elements(r->'players')x where x->>'userId'=u1::text)<>'SD' then raise exception 'TEST_FAILED: edited another member';end if;
 req:=gen_random_uuid();r:=public.nz_lobby_v1('SELECT_SCHOOL',jsonb_build_object('roomId',rid,'schoolLevel','SMA'),req);
 if public.nz_lobby_v1('SELECT_SCHOOL',jsonb_build_object('roomId',rid,'schoolLevel','SMA'),req)<>r then raise exception 'TEST_FAILED: grade receipt';end if;
 r:=public.nz_lobby_v1('SET_READY',jsonb_build_object('roomId',rid,'ready',true),gen_random_uuid());
 r:=public.nz_school_level_v1(rid,'SMA');
 if (select (x->>'ready')::bool from jsonb_array_elements(r->'players')x where x->>'userId'=u2::text) is distinct from true then raise exception 'TEST_FAILED: repeated grade clears Ready';end if;
 perform set_config('request.jwt.claim.sub',u1::text,true);
 r:=public.nz_lobby_v1('SET_READY',jsonb_build_object('roomId',rid,'ready',true),gen_random_uuid());
 r:=public.nz_lobby_v1('START',jsonb_build_object('roomId',rid),gen_random_uuid());
 begin perform public.nz_school_level_v1(rid,'SMP');raise exception 'TEST_FAILED: mid-run change';exception when others then if sqlerrm not like '%RUN_ALREADY_STARTED%' then raise;end if;end;
 begin perform public.nz_combat_bank_v3(sid);raise exception 'TEST_FAILED: bank exposed';exception when insufficient_privilege then null;end;
 begin perform public.nz_question_import_v2('[]');raise exception 'TEST_FAILED: import exposed';exception when insufficient_privilege then null;end;
 begin update public.room_players set school_level='SMA' where room_id=rid;raise exception 'TEST_FAILED: direct update';exception when insufficient_privilege then null;end;
 execute 'reset role';
 if (select count(*) from jsonb_array_elements((select locked_roster_json from private.game_sessions where id=sid))x where x->>'schoolLevel' in ('SD','SMA'))<>2 then raise exception 'TEST_FAILED: roster grade missing';end if;
 bank:=public.nz_combat_bank_v3(sid);
 if jsonb_array_length(bank)<>120 or exists(select 1 from jsonb_array_elements(bank)x where not ((x->>'schoolLevel'='SD' and x->>'classId'='WARRIOR') or (x->>'schoolLevel'='SMA' and x->>'classId'='MAGE'))) then raise exception 'TEST_FAILED: bank routing';end if;
 if exists(select 1 from jsonb_array_elements(public.nz_combat_load_v1(sid,u1)->'members')x where x->>'schoolLevel' not in ('SD','SMA')) then raise exception 'TEST_FAILED: roster load';end if;
end $test$;
select 'PASS: mandatory per-member grade, member authorization, validation, idempotency, Ready, locked roster, bank routing and grants' as result;
rollback;
