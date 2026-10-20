
begin;
do $test$
declare users uuid[]:=array[gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid()];
 class_names text[]:=array['WARRIOR','MAGE','THIEF','HEALER']; room jsonb; next_room jsonb; rid uuid; code text; request uuid:=gen_random_uuid(); host uuid; i integer;
begin
 for i in 1..5 loop insert into auth.users(id,is_anonymous) values(users[i],true);end loop;
 execute 'set local role authenticated';
 perform set_config('request.jwt.claim.sub',users[1]::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',users[1],'role','authenticated')::text,true);
 room:=public.nz_lobby_v1('CREATE','{"nickname":"QA Warrior"}',request);rid:=(room->>'id')::uuid;code:=room->>'code';
 if length(code)<>7 then raise exception 'TEST_FAILED: room code';end if;
 next_room:=public.nz_lobby_v1('CREATE','{"nickname":"QA Warrior"}',request);
 if next_room->>'id'<>rid::text then raise exception 'TEST_FAILED: create idempotency';end if;
 begin
 perform public.nz_lobby_v1('CREATE','{"nickname":"Different"}',request);
 raise exception 'TEST_FAILED: reused key accepted';
 exception when others then if sqlerrm not like '%IDEMPOTENCY_KEY_REUSED%' then raise;end if;end;
 for i in 2..4 loop
 perform set_config('request.jwt.claim.sub',users[i]::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',users[i],'role','authenticated')::text,true);
 room:=public.nz_lobby_v1('JOIN',jsonb_build_object('code',code,'nickname','QA member '||i),gen_random_uuid());
 end loop;
 if jsonb_array_length(room->'players')<>4 then raise exception 'TEST_FAILED: four members';end if;
 perform set_config('request.jwt.claim.sub',users[5]::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',users[5],'role','authenticated')::text,true);
 begin perform public.nz_lobby_v1('JOIN',jsonb_build_object('code',code,'nickname','Fifth player'),gen_random_uuid());raise exception 'TEST_FAILED: fifth join accepted';
 exception when others then if sqlerrm not like '%ROOM_FULL%' then raise;end if;end;
 if exists(select 1 from public.session_views where room_id=rid) then raise exception 'TEST_FAILED: outsider read projection';end if;
 if private.nz_presence_allowed_v1('nz:room:'||rid::text||':presence') then raise exception 'TEST_FAILED: outsider presence';end if;
 begin perform hp from private.combatants;raise exception 'TEST_FAILED: private HP readable';
 exception when insufficient_privilege then null;end;
 begin update public.room_players set ready=true where room_id=rid;raise exception 'TEST_FAILED: direct client update allowed';
 exception when insufficient_privilege then null;end;
 for i in 1..4 loop
 perform set_config('request.jwt.claim.sub',users[i]::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',users[i],'role','authenticated')::text,true);
 room:=public.nz_lobby_v1('SELECT_CLASS',jsonb_build_object('roomId',rid,'classId',class_names[i]),gen_random_uuid());
 end loop;
 perform set_config('request.jwt.claim.sub',users[2]::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',users[2],'role','authenticated')::text,true);
 begin perform public.nz_lobby_v1('SELECT_CLASS',jsonb_build_object('roomId',rid,'classId','WARRIOR'),gen_random_uuid());raise exception 'TEST_FAILED: duplicate class';
 exception when others then if sqlerrm not like '%CLASS_TAKEN%' then raise;end if;end;
 room:=public.nz_lobby_v1('HEARTBEAT',jsonb_build_object('roomId',rid),gen_random_uuid());
 if not exists(select 1 from jsonb_array_elements(room->'players') p where p->>'userId'=users[2]::text and p->>'classId'='MAGE') then raise exception 'TEST_FAILED: reconnect class';end if;
 -- Simulate a missing coordinator heartbeat, then return to an authenticated member.
 execute 'reset role';
 update public.room_players set last_seen_at=clock_timestamp()-interval '61 seconds' where room_id=rid and auth_user_id=users[1];
 execute 'set local role authenticated';
 room:=public.nz_lobby_v1('GET',jsonb_build_object('roomId',rid),gen_random_uuid());
 select (p->>'id')::uuid into host from jsonb_array_elements(room->'players') p where p->>'userId'=users[2]::text;
 if room->>'coordinatorId'<>host::text then raise exception 'TEST_FAILED: coordinator transfer';end if;
 if not exists(select 1 from jsonb_array_elements(room->'players') p where p->>'userId'=users[1]::text and p->>'status'='INACTIVE') then raise exception 'TEST_FAILED: grace classification';end if;
 room:=public.nz_lobby_v1('REMOVE_INACTIVE',jsonb_build_object('roomId',rid,'playerId',room->'players'->0->>'id'),gen_random_uuid());
 for i in 2..4 loop
 perform set_config('request.jwt.claim.sub',users[i]::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',users[i],'role','authenticated')::text,true);
 room:=public.nz_lobby_v1('SET_READY',jsonb_build_object('roomId',rid,'ready',true),gen_random_uuid());
 end loop;
 if room->>'state'<>'READY' then raise exception 'TEST_FAILED: ready transition';end if;
 perform set_config('request.jwt.claim.sub',users[2]::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',users[2],'role','authenticated')::text,true);
 room:=public.nz_lobby_v1('START',jsonb_build_object('roomId',rid),gen_random_uuid());
 if room->>'state'<>'STORY' then raise exception 'TEST_FAILED: start roster';end if;
 perform set_config('request.jwt.claim.sub',users[5]::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',users[5],'role','authenticated')::text,true);
 begin perform public.nz_lobby_v1('JOIN',jsonb_build_object('code',code,'nickname','Late join'),gen_random_uuid());raise exception 'TEST_FAILED: late join accepted';
 exception when others then if sqlerrm not like '%RUN_ALREADY_STARTED%' then raise;end if;end;
 execute 'reset role';
 if has_function_privilege('anon','public.nz_lobby_v1(text,jsonb,uuid)','EXECUTE') then raise exception 'TEST_FAILED: anon RPC access';end if;
 if has_table_privilege('authenticated','private.questions','SELECT') then raise exception 'TEST_FAILED: exposed question key';end if;
end $test$;
select 'PASS: room, capacity, idempotency, class uniqueness, reconnect, grace, host transfer, readiness, start and RLS' as result;
rollback;
