-- BogaraShift: isolated farms and server-validated field outlines.
-- Server functions deliberately accept only authenticated members; no service key is used by the app.
create extension if not exists postgis with schema extensions;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.farms (
 id uuid primary key default gen_random_uuid(),
 name text not null check (char_length(name) between 1 and 100),
 owner_id uuid not null references auth.users(id),
 revision bigint not null default 0,
 created_at timestamptz not null default now()
);
create table public.farm_members (
 farm_id uuid not null references public.farms(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check (role in ('owner','editor','viewer')),
 primary key (farm_id,user_id)
);
create table public.fields (
 id uuid primary key default gen_random_uuid(),
 farm_id uuid not null references public.farms(id) on delete cascade,
 client_id text not null check (char_length(client_id) between 1 and 120),
 name text not null check (char_length(name) between 1 and 80),
 geom extensions.geometry(MultiPolygon,4326) not null,
 area_ha double precision not null default 0,
 boundary_source text not null check (boundary_source in ('manual','automatic','imported','legacy')),
 boundary_status text not null check (boundary_status in ('draft','confirmed')),
 payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 65536),
 version integer not null default 1,
 updated_at timestamptz not null default now(),
 unique (farm_id,client_id)
);
create index fields_farm_idx on public.fields(farm_id);
create index fields_geom_idx on public.fields using gist(geom);
create table public.field_versions (
 id bigint generated always as identity primary key,
 field_id uuid not null references public.fields(id) on delete cascade,
 version integer not null,
 geom extensions.geometry(MultiPolygon,4326) not null,
 area_ha double precision not null,
 source text not null,
 created_at timestamptz not null default now(),
 unique(field_id,version)
);

create function private.is_member(p_farm uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.farm_members m where m.farm_id=p_farm and m.user_id=(select auth.uid()));
$$;
create function private.is_editor(p_farm uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.farm_members m where m.farm_id=p_farm and m.user_id=(select auth.uid()) and m.role in ('owner','editor'));
$$;
revoke all on function private.is_member(uuid) from public;
revoke all on function private.is_editor(uuid) from public;
grant execute on function private.is_member(uuid), private.is_editor(uuid) to authenticated;

alter table public.farms enable row level security;
alter table public.farm_members enable row level security;
alter table public.fields enable row level security;
alter table public.field_versions enable row level security;
revoke all on public.farms,public.farm_members,public.fields,public.field_versions from public,anon,authenticated;
grant select on public.farms,public.farm_members,public.fields,public.field_versions to authenticated;
create policy farms_read on public.farms for select to authenticated using (private.is_member(id));
create policy members_read on public.farm_members for select to authenticated using (private.is_member(farm_id));
create policy fields_read on public.fields for select to authenticated using (private.is_member(farm_id));
create policy versions_read on public.field_versions for select to authenticated using (exists (select 1 from public.fields f where f.id=field_id and private.is_member(f.farm_id)));

create function private.validate_field() returns trigger language plpgsql set search_path = '' as $$
begin
 if new.geom is null or extensions.ST_IsEmpty(new.geom) or not extensions.ST_IsValid(new.geom)
    or extensions.ST_NDims(new.geom) <> 2 or extensions.ST_NPoints(new.geom)>2100
    or extensions.ST_XMin(new.geom::extensions.box3d) < -180 or extensions.ST_XMax(new.geom::extensions.box3d) > 180
    or extensions.ST_XMax(new.geom::extensions.box3d)-extensions.ST_XMin(new.geom::extensions.box3d) > 180
    or extensions.ST_YMin(new.geom::extensions.box3d) < -85 or extensions.ST_YMax(new.geom::extensions.box3d) > 85 then
  raise exception 'INVALID_GEOMETRY' using errcode='22023';
 end if;
 new.area_ha := extensions.ST_Area(new.geom::extensions.geography) / 10000.0;
 if new.area_ha < 0.1 then raise exception 'AREA_TOO_SMALL' using errcode='22023'; end if;
 if new.boundary_source='legacy' and new.boundary_status='confirmed' then raise exception 'LEGACY_NOT_CONFIRMABLE' using errcode='22023'; end if;
 if tg_op='INSERT' then new.version:=1;
 elsif not extensions.ST_Equals(old.geom,new.geom) or old.boundary_source<>new.boundary_source then new.version:=old.version+1;
 else new.version:=old.version; end if;
 new.updated_at:=now();
 return new;
end $$;
create function private.record_field_version() returns trigger language plpgsql set search_path = '' as $$
begin
 if tg_op='INSERT' or new.version<>old.version then
  insert into public.field_versions(field_id,version,geom,area_ha,source) values(new.id,new.version,new.geom,new.area_ha,new.boundary_source);
 end if;
 return new;
end $$;
create trigger validate_field before insert or update on public.fields for each row execute function private.validate_field();
create trigger record_field_version after insert or update on public.fields for each row execute function private.record_field_version();

create function public.create_farm(farm_name text) returns table(id uuid,name text,revision bigint)
language plpgsql security definer set search_path = '' as $$
declare fid uuid;
begin
 if auth.uid() is null then raise exception 'UNAUTHENTICATED' using errcode='42501'; end if;
 if farm_name is null or char_length(btrim(farm_name)) not between 1 and 100 then raise exception 'INVALID_NAME' using errcode='22023'; end if;
 if (select count(*) from public.farms f where f.owner_id=auth.uid())>=10 then raise exception 'FARM_LIMIT' using errcode='22023'; end if;
 insert into public.farms(name,owner_id) values(btrim(farm_name),auth.uid()) returning farms.id into fid;
 insert into public.farm_members(farm_id,user_id,role) values(fid,auth.uid(),'owner');
 return query select f.id,f.name,f.revision from public.farms f where f.id=fid;
end $$;

-- Atomic upsert, deliberately does not delete fields absent from the local draft.
-- Optimistic revision prevents silent overwrite after another device saved.
create function public.save_farm_fields(p_farm uuid,p_revision bigint,p_fields jsonb) returns bigint
language plpgsql security definer set search_path = '' as $$
declare current_revision bigint; item jsonb; shape extensions.geometry; src text; st text; client_key text; new_revision bigint;
begin
 if auth.uid() is null or not private.is_editor(p_farm) then raise exception 'NOT_AUTHORIZED' using errcode='42501'; end if;
 if jsonb_typeof(p_fields) is distinct from 'array' or jsonb_array_length(p_fields)>500 or octet_length(p_fields::text)>3000000 then
  raise exception 'INVALID_BATCH' using errcode='22023';
 end if;
 if exists (select 1 from jsonb_array_elements(p_fields) v group by v->'cell'->>'id' having count(*)>1) then raise exception 'DUPLICATE_FIELD' using errcode='22023'; end if;
 select f.revision into current_revision from public.farms f where f.id=p_farm for update;
 if current_revision is null or p_revision is distinct from current_revision then raise exception 'REVISION_CONFLICT' using errcode='40001'; end if;
 for item in select value from jsonb_array_elements(p_fields) loop
  client_key:=item->'cell'->>'id'; src:=coalesce(item->'cell'->>'source','legacy'); st:=coalesce(item->'cell'->>'boundaryStatus','draft');
  if jsonb_typeof(item) is distinct from 'object' or client_key is null or char_length(client_key) not between 1 and 120
     or jsonb_typeof(item->'cell'->'geometry') is distinct from 'object' or coalesce(item->>'name','')='' then
   raise exception 'INVALID_FIELD' using errcode='22023';
  end if;
  shape:=extensions.ST_Multi(extensions.ST_SetSRID(extensions.ST_GeomFromGeoJSON((item->'cell'->'geometry')::text),4326));
  insert into public.fields(farm_id,client_id,name,geom,boundary_source,boundary_status,payload)
   values(p_farm,client_key,btrim(item->>'name'),shape,src,st,jsonb_set(item - 'report','{cell}',(item->'cell') - 'geometry' - 'polygon'))
  on conflict(farm_id,client_id) do update set name=excluded.name,geom=excluded.geom,boundary_source=excluded.boundary_source,boundary_status=excluded.boundary_status,payload=excluded.payload;
 end loop;
 update public.farms f set revision=f.revision+1 where f.id=p_farm returning f.revision into new_revision;
 return new_revision;
end $$;
create function public.load_farm_fields(p_farm uuid) returns table(payload jsonb,geometry jsonb,area_ha double precision,source text,status text,lat double precision,lon double precision)
language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null or not private.is_member(p_farm) then raise exception 'NOT_AUTHORIZED' using errcode='42501'; end if;
 return query select f.payload,extensions.ST_AsGeoJSON(f.geom)::jsonb,f.area_ha,f.boundary_source,f.boundary_status,
  extensions.ST_Y(extensions.ST_PointOnSurface(f.geom)),extensions.ST_X(extensions.ST_PointOnSurface(f.geom))
 from public.fields f where f.farm_id=p_farm order by f.name,f.id;
end $$;
revoke all on function public.create_farm(text),public.save_farm_fields(uuid,bigint,jsonb),public.load_farm_fields(uuid) from public,anon;
grant execute on function public.create_farm(text),public.save_farm_fields(uuid,bigint,jsonb),public.load_farm_fields(uuid) to authenticated;
