-- Run on a disposable project as a privileged operator after applying ai_quota.
-- This is a functional check, not a concurrent load/security audit. All data rolls back.
BEGIN;
CREATE TEMP TABLE ai_actor (id uuid) ON COMMIT DROP;
INSERT INTO ai_actor SELECT gen_random_uuid();
INSERT INTO auth.users (id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
 SELECT id,'authenticated','authenticated',id::text||'@example.invalid','{}','{}',now(),now() FROM ai_actor;
GRANT SELECT ON ai_actor TO authenticated;
SET LOCAL ROLE authenticated;
DO $$ DECLARE uid uuid; BEGIN
 SELECT id INTO uid FROM ai_actor;
 PERFORM set_config('request.jwt.claim.sub',uid::text,true);
 IF NOT public.consume_ai_quota() OR NOT public.consume_ai_quota() OR NOT public.consume_ai_quota() THEN RAISE EXCEPTION 'quota denied too soon'; END IF;
 IF public.consume_ai_quota() THEN RAISE EXCEPTION 'per-user cap was bypassed'; END IF;
 IF has_schema_privilege(current_user,'private','usage') THEN RAISE EXCEPTION 'private schema exposed'; END IF;
END $$;
ROLLBACK;
