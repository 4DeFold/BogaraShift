-- Run only on a disposable project as a privileged operator after anonymous_ai_quota.
-- Functional checks, not concurrent load/security audit. All changes roll back.
BEGIN;
-- Isolate this test from existing usage; the transaction rolls back these deletes.
DELETE FROM private.ai_daily_usage WHERE usage_day=(now() at time zone 'UTC')::date;
DELETE FROM private.ai_public_usage WHERE usage_day=(now() at time zone 'UTC')::date;
SET LOCAL ROLE anon;
DO $$ BEGIN
 IF NOT public.consume_public_ai_quota(repeat('a',64)) OR NOT public.consume_public_ai_quota(repeat('a',64)) OR NOT public.consume_public_ai_quota(repeat('a',64)) THEN RAISE EXCEPTION 'anonymous quota denied too soon'; END IF;
 IF public.consume_public_ai_quota(repeat('a',64)) THEN RAISE EXCEPTION 'anonymous per-subject cap was bypassed'; END IF;
 IF has_schema_privilege(current_user,'private','usage') THEN RAISE EXCEPTION 'private schema exposed'; END IF;
END $$;
RESET ROLE;
-- Leave one reservation for an authenticated caller and test the shared cap.
INSERT INTO private.ai_public_usage (usage_day,subject_hash,requests) VALUES ((now() at time zone 'UTC')::date,repeat('b',64),26);
CREATE TEMP TABLE ai_actor (id uuid) ON COMMIT DROP;
INSERT INTO ai_actor SELECT gen_random_uuid();
INSERT INTO auth.users (id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
 SELECT id,'authenticated','authenticated',id::text||'@example.invalid','{}','{}',now(),now() FROM ai_actor;
GRANT SELECT ON ai_actor TO authenticated;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 PERFORM set_config('request.jwt.claim.sub',(SELECT id::text FROM ai_actor),true);
 IF NOT public.consume_ai_quota() THEN RAISE EXCEPTION 'authenticated quota denied too soon'; END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN IF public.consume_public_ai_quota(repeat('c',64)) THEN RAISE EXCEPTION 'global cap did not include authenticated usage'; END IF; END $$;
ROLLBACK;
