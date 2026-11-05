-- Read revision and rows in one SQL statement to avoid acknowledging a concurrent write
-- while returning an older field set.
create function public.load_farm_snapshot(p_farm uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare snapshot jsonb;
begin
 if auth.uid() is null or not private.is_member(p_farm) then raise exception 'NOT_AUTHORIZED' using errcode='42501'; end if;
 select jsonb_build_object('revision',farm.revision,'fields',coalesce((
  select jsonb_agg(jsonb_build_object('payload',f.payload,'geometry',extensions.ST_AsGeoJSON(f.geom)::jsonb,
   'area_ha',f.area_ha,'source',f.boundary_source,'status',f.boundary_status,
   'lat',extensions.ST_Y(extensions.ST_PointOnSurface(f.geom)),'lon',extensions.ST_X(extensions.ST_PointOnSurface(f.geom))) order by f.name,f.id)
  from public.fields f where f.farm_id=farm.id),'[]'::jsonb)) into snapshot
 from public.farms farm where farm.id=p_farm;
 if snapshot is null then raise exception 'NOT_AUTHORIZED' using errcode='42501'; end if;
 return snapshot;
end $$;
revoke all on function public.load_farm_snapshot(uuid) from public,anon;
grant execute on function public.load_farm_snapshot(uuid) to authenticated;
