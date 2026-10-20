create or replace function private.nz_lobby_guarded_v1(p_command text,p_payload jsonb,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); rid uuid; sid uuid; me public.room_players%rowtype; s private.game_sessions%rowtype;
 result jsonb; receipt private.command_receipts%rowtype; code_value text; nickname_value text; chosen private.nz_class;
 slot integer; members integer; attempt integer; host uuid; target uuid;
begin
 if uid is null then raise exception 'UNAUTHENTICATED';end if;
 if length(p_payload::text)>8192 then raise exception 'PAYLOAD_TOO_LARGE';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 if p_command not in ('GET','HEARTBEAT') then
 select * into receipt from private.command_receipts where auth_user_id=uid and request_id=p_request_id;
 if found then
 if receipt.command_type<>p_command or receipt.payload_json<>p_payload then raise exception 'IDEMPOTENCY_KEY_REUSED';end if;
 return receipt.result_json;
 end if;
 if (select count(*) from private.command_receipts where auth_user_id=uid and created_at>clock_timestamp()-interval '10 seconds')>=20 then raise exception 'RATE_LIMITED';end if;
 if p_command in ('CREATE','JOIN') and (select count(*) from private.command_receipts where auth_user_id=uid and command_type in ('CREATE','JOIN') and created_at>clock_timestamp()-interval '1 minute')>=5 then raise exception 'RATE_LIMITED';end if;
 end if;
 if p_command='CREATE' then
 nickname_value:=btrim(coalesce(p_payload->>'nickname',''));
 if length(nickname_value) not between 2 and 20 then raise exception 'INVALID_NICKNAME';end if;
 for attempt in 1..10 loop
 select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',(get_byte(uuid_send(gen_random_uuid()),i)%32)+1,1),'') into code_value from unnest(array[0,1,2,3,4,5,8]) as x(i);
 begin insert into public.rooms(code) values(code_value) returning id into rid;exit;
 exception when unique_violation then if attempt=10 then raise exception 'CODE_ALLOCATION_FAILED';end if;end;
 end loop;
 insert into private.game_sessions(room_id,ruleset_version) values(rid,'nz.v1.0') returning id into sid;
 insert into public.room_players(room_id,auth_user_id,nickname,seat_index) values(rid,uid,nickname_value,0) returning * into me;
 update public.rooms set coordinator_player_id=me.id where id=rid;
 result:=private.nz_publish_v1(rid);
 elsif p_command='JOIN' then
 select id into rid from public.rooms where code=upper(btrim(p_payload->>'code'));
 if rid is null then raise exception 'ROOM_NOT_FOUND';end if;
 select * into s from private.game_sessions where room_id=rid for update;sid:=s.id;
 perform private.nz_reconcile_v1(rid);
 select * into s from private.game_sessions where id=sid;
 if (select expires_at from public.rooms where id=rid)<=clock_timestamp() then raise exception 'ROOM_EXPIRED';end if;
 select * into me from public.room_players where room_id=rid and auth_user_id=uid and member_status<>'LEFT';
 if found then
 update public.room_players set last_seen_at=clock_timestamp(),member_status='ACTIVE' where id=me.id;
 result:=private.nz_publish_v1(rid);
 else
 if s.state not in ('LOBBY','CHARACTER_SELECT','READY') then raise exception 'RUN_ALREADY_STARTED';end if;
 select count(*) into members from public.room_players where room_id=rid and member_status<>'LEFT';
 if members>=4 then raise exception 'ROOM_FULL';end if;
 nickname_value:=btrim(coalesce(p_payload->>'nickname',''));
 if length(nickname_value) not between 2 and 20 then raise exception 'INVALID_NICKNAME';end if;
 select i into slot from generate_series(0,3) as g(i) where not exists(select 1 from public.room_players where room_id=rid and member_status<>'LEFT' and seat_index=i) order by i limit 1;
 insert into public.room_players(room_id,auth_user_id,nickname,seat_index) values(rid,uid,nickname_value,slot)
 on conflict(room_id,auth_user_id) do update set nickname=excluded.nickname,seat_index=excluded.seat_index,class_id=null,ready=false,member_status='ACTIVE',left_at=null,last_seen_at=clock_timestamp();
 update public.room_players set ready=false where room_id=rid;
 update private.game_sessions set state='CHARACTER_SELECT',phase_version=phase_version+1 where id=sid;
 result:=private.nz_publish_v1(rid);
 end if;
 else
 rid:=(p_payload->>'roomId')::uuid;
 select * into s from private.game_sessions where room_id=rid for update;
 if not found then raise exception 'ROOM_NOT_FOUND';end if;sid:=s.id;
 select * into me from public.room_players where room_id=rid and auth_user_id=uid and member_status<>'LEFT';
 if not found then raise exception 'NOT_A_MEMBER';end if;
 if (select expires_at from public.rooms where id=rid)<=clock_timestamp() then raise exception 'ROOM_EXPIRED';end if;
 perform private.nz_reconcile_v1(rid);
 select * into s from private.game_sessions where id=sid;
 select * into me from public.room_players where id=me.id;
 select coordinator_player_id into host from public.rooms where id=rid;
 if p_command='GET' then
 select snapshot_json||jsonb_build_object('serverNow',clock_timestamp()) into result from public.session_views where room_id=rid;return result;
 elsif p_command='HEARTBEAT' then
 update public.room_players set last_seen_at=clock_timestamp(),member_status='ACTIVE' where id=me.id;
 update public.rooms set expires_at=clock_timestamp()+interval '2 hours' where id=rid and s.state in ('LOBBY','CHARACTER_SELECT','READY');
 if me.member_status<>'ACTIVE' then
 update public.room_players set ready=false where id=me.id;
 perform private.nz_reconcile_v1(rid);result:=private.nz_publish_v1(rid);
 else select snapshot_json||jsonb_build_object('serverNow',clock_timestamp()) into result from public.session_views where room_id=rid;end if;
 return result;
 else
 if s.state not in ('LOBBY','CHARACTER_SELECT','READY') then raise exception 'RUN_ALREADY_STARTED';end if;
 if p_command='SELECT_CLASS' then
 chosen:=nullif(p_payload->>'classId','')::private.nz_class;
 if exists(select 1 from public.room_players where room_id=rid and member_status<>'LEFT' and class_id=chosen and id<>me.id) then raise exception 'CLASS_TAKEN';end if;
 update public.room_players set class_id=chosen,last_seen_at=clock_timestamp(),member_status='ACTIVE' where id=me.id;
 update public.room_players set ready=false where room_id=rid;
 update private.game_sessions set state='CHARACTER_SELECT',phase_version=phase_version+1 where id=sid;
 elsif p_command='SET_READY' then
 if me.class_id is null then raise exception 'CLASS_REQUIRED';end if;
 update public.room_players set ready=coalesce((p_payload->>'ready')::boolean,false),last_seen_at=clock_timestamp(),member_status='ACTIVE' where id=me.id;
 update private.game_sessions set state=case when not exists(select 1 from public.room_players where room_id=rid and member_status<>'LEFT' and (not ready or class_id is null or member_status<>'ACTIVE')) then 'READY'::private.nz_game_state else 'CHARACTER_SELECT'::private.nz_game_state end,phase_version=phase_version+1 where id=sid;
 elsif p_command='START' then
 if host is distinct from me.id then raise exception 'NOT_COORDINATOR';end if;
 if s.state<>'READY' or exists(select 1 from public.room_players where room_id=rid and member_status<>'LEFT' and (not ready or class_id is null or member_status<>'ACTIVE')) then raise exception 'NOT_READY';end if;
 select count(*) into members from public.room_players where room_id=rid and member_status='ACTIVE';
 if members not between 1 and 4 then raise exception 'INVALID_ROSTER';end if;
 update private.game_sessions set state='STORY',state_context='AWAITING_COMBAT_INTEGRATION',party_size=members,
 locked_roster_json=(select jsonb_agg(jsonb_build_object('playerId',id,'classId',class_id,'seat',seat_index) order by seat_index) from public.room_players where room_id=rid and member_status='ACTIVE'),
 started_at=clock_timestamp(),phase_version=phase_version+1 where id=sid;
 elsif p_command='LEAVE' then
 update public.room_players set member_status='LEFT',left_at=clock_timestamp(),class_id=null,ready=false where id=me.id;
 update public.room_players set ready=false where room_id=rid;
 update private.game_sessions set state='CHARACTER_SELECT',phase_version=phase_version+1 where id=sid;
 perform private.nz_reconcile_v1(rid);
 elsif p_command='REMOVE_INACTIVE' then
 if host is distinct from me.id then raise exception 'NOT_COORDINATOR';end if;
 target:=(p_payload->>'playerId')::uuid;
 update public.room_players set member_status='LEFT',left_at=clock_timestamp(),class_id=null,ready=false
 where id=target and room_id=rid and member_status='INACTIVE' and last_seen_at<=clock_timestamp()-interval '60 seconds';
 if not found then raise exception 'PLAYER_NOT_INACTIVE';end if;
 update public.room_players set ready=false where room_id=rid;
 update private.game_sessions set state='CHARACTER_SELECT',phase_version=phase_version+1 where id=sid;
 else raise exception 'UNKNOWN_COMMAND';end if;
 result:=private.nz_publish_v1(rid);
 end if;
 end if;
 insert into private.command_receipts(auth_user_id,request_id,session_id,command_type,payload_json,result_json) values(uid,p_request_id,sid,p_command,p_payload,result);
 return result;
exception when unique_violation then raise exception 'CLASS_OR_SEAT_TAKEN';
end $$;
