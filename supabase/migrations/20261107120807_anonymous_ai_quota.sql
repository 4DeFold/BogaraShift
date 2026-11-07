-- Daily anonymous quota; only irreversible keyed IP hashes are stored, never prompts or IPs.
-- These RPCs are public reservations only; do not expose credentials or call paid APIs.
create table private.ai_public_usage (
 usage_day date not null,
 subject_hash text not null check (subject_hash ~ '^[a-f0-9]{64}$'),
 requests integer not null check (requests>0),
 primary key (usage_day,subject_hash)
);
revoke all on private.ai_public_usage from public,anon,authenticated;
create function public.consume_public_ai_quota(p_subject_hash text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare today date := (now() at time zone 'UTC')::date; subject_count integer; total_count bigint;
begin
 if p_subject_hash is null or p_subject_hash !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_SUBJECT' using errcode='22023'; end if;
 perform pg_catalog.pg_advisory_xact_lock(453688432198::bigint);
 delete from private.ai_public_usage where usage_day < today - 7;
 delete from private.ai_daily_usage where usage_day < today - 7;
 select coalesce(sum(requests),0),coalesce(sum(requests) filter (where subject_hash=p_subject_hash),0)
 into total_count,subject_count from private.ai_public_usage where usage_day=today;
 select total_count + coalesce(sum(requests),0) into total_count from private.ai_daily_usage where usage_day=today;
 if total_count>=30 or subject_count>=3 then return false; end if;
 insert into private.ai_public_usage as usage (usage_day,subject_hash,requests) values(today,p_subject_hash,1)
 on conflict (usage_day,subject_hash) do update set requests=usage.requests+1;
 return true;
end $$;
revoke all on function public.consume_public_ai_quota(text) from public;
grant execute on function public.consume_public_ai_quota(text) to anon,authenticated;
-- Older preview deployments still use the authenticated reservation: share the global cap.
create or replace function public.consume_ai_quota() returns boolean
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); today date := (now() at time zone 'UTC')::date; user_count integer; total_count bigint;
begin
 if uid is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
 perform pg_catalog.pg_advisory_xact_lock(453688432198::bigint);
 delete from private.ai_daily_usage where usage_day < today - 7;
 delete from private.ai_public_usage where usage_day < today - 7;
 select coalesce(sum(requests),0),coalesce(sum(requests) filter (where user_id=uid),0)
 into total_count,user_count from private.ai_daily_usage where usage_day=today;
 select total_count + coalesce(sum(requests),0) into total_count from private.ai_public_usage where usage_day=today;
 if total_count>=30 or user_count>=3 then return false; end if;
 insert into private.ai_daily_usage as usage (usage_day,user_id,requests) values(today,uid,1)
 on conflict (usage_day,user_id) do update set requests=usage.requests+1;
 return true;
end $$;
