-- Shared UTC daily caps across all app instances. No prompts or responses are retained.
create table private.ai_daily_usage (
 usage_day date not null,
 user_id uuid not null references auth.users(id) on delete cascade,
 requests integer not null check (requests > 0),
 primary key (usage_day,user_id)
);
revoke all on private.ai_daily_usage from public, anon, authenticated;
create function public.consume_ai_quota() returns boolean
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); today date := (now() at time zone 'UTC')::date; user_count integer; total_count integer;
begin
 if uid is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
 -- Serialize every quota reservation, including new users and concurrent instances.
 perform pg_catalog.pg_advisory_xact_lock(453688432198::bigint);
 delete from private.ai_daily_usage where usage_day < today - 7;
 select coalesce(sum(requests),0), coalesce(sum(requests) filter (where user_id=uid),0)
 into total_count,user_count from private.ai_daily_usage where usage_day=today;
 if total_count >= 30 or user_count >= 3 then return false; end if;
 insert into private.ai_daily_usage as usage (usage_day,user_id,requests) values(today,uid,1)
 on conflict (usage_day,user_id) do update set requests=usage.requests+1;
 return true;
end $$;
revoke all on function public.consume_ai_quota() from public, anon;
grant execute on function public.consume_ai_quota() to authenticated;
