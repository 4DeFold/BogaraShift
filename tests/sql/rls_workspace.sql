-- Run against a disposable/test project as a privileged database operator.
-- Temporary users and all data are rolled back. No real email is sent.
BEGIN;
CREATE TEMP TABLE test_actors (label text,id uuid) ON COMMIT DROP;
INSERT INTO test_actors VALUES ('a',gen_random_uuid()),('b',gen_random_uuid());
INSERT INTO auth.users (id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
 SELECT id,'authenticated','authenticated',id::text||'@example.invalid','{}'::jsonb,'{}'::jsonb,now(),now() FROM test_actors;
GRANT SELECT ON test_actors TO authenticated;
SET LOCAL ROLE authenticated;
DO $$ DECLARE a uuid; b uuid; fa uuid; fb uuid; rev bigint; test_field jsonb; snap jsonb; n int; BEGIN
 SELECT id INTO a FROM test_actors WHERE label='a'; SELECT id INTO b FROM test_actors WHERE label='b';
 PERFORM set_config('request.jwt.claim.sub',a::text,true);
 SELECT id INTO fa FROM public.create_farm('Temporary farm A');
 test_field:='[{"name":"Temporary field","cell":{"id":"temporary-field","source":"manual","boundaryStatus":"draft","geometry":{"type":"Polygon","coordinates":[[[69.8,42.4],[69.81,42.4],[69.81,42.41],[69.8,42.41],[69.8,42.4]]]}},"report":{"data":"must not be saved"}}]'::jsonb;
 SELECT public.save_farm_fields(fa,0,test_field) INTO rev;
 IF rev<>1 THEN RAISE EXCEPTION 'unexpected revision'; END IF;
 SELECT count(*) INTO n FROM public.fields WHERE farm_id=fa AND area_ha>1 AND payload ? 'report'; IF n<>0 THEN RAISE EXCEPTION 'report leaked'; END IF;
 SELECT count(*) INTO n FROM public.fields WHERE farm_id=fa AND area_ha>1; IF n<>1 THEN RAISE EXCEPTION 'field not saved'; END IF;
 SELECT public.load_farm_snapshot(fa) INTO snap; IF (snap->>'revision')::int<>1 OR jsonb_array_length(snap->'fields')<>1 THEN RAISE EXCEPTION 'snapshot inconsistent'; END IF;
 SELECT count(*) INTO n FROM public.field_versions; IF n<>1 THEN RAISE EXCEPTION 'initial version missing'; END IF;
 BEGIN PERFORM public.save_farm_fields(fa,0,test_field); RAISE EXCEPTION 'stale write allowed'; EXCEPTION WHEN serialization_failure THEN NULL; END;
 test_field:=jsonb_set(test_field,'{0,cell,geometry,coordinates,0,1,0}','69.82'::jsonb);
 PERFORM public.save_farm_fields(fa,1,test_field); SELECT count(*) INTO n FROM public.field_versions; IF n<>2 THEN RAISE EXCEPTION 'version history failed'; END IF;
 PERFORM set_config('request.jwt.claim.sub',b::text,true);
 SELECT count(*) INTO n FROM public.fields; IF n<>0 THEN RAISE EXCEPTION 'cross-user read allowed'; END IF;
 BEGIN PERFORM public.load_farm_snapshot(fa); RAISE EXCEPTION 'cross-user RPC allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.save_farm_fields(fa,2,test_field); RAISE EXCEPTION 'cross-user write allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 SELECT id INTO fb FROM public.create_farm('Temporary farm B'); IF fb=fa THEN RAISE EXCEPTION 'farm ids collide'; END IF;
 SELECT count(*) INTO n FROM public.farms; IF n<>1 THEN RAISE EXCEPTION 'farm isolation failed'; END IF;
 PERFORM set_config('request.jwt.claim.sub',a::text,true); SELECT count(*) INTO n FROM public.farms; IF n<>1 THEN RAISE EXCEPTION 'farm isolation failed for A'; END IF;
END $$;
ROLLBACK;
