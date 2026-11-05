-- Enforce the snapshot limit even when several upsert batches contain different IDs.
-- save_farm_fields locks the farm row, so concurrent app writes are serialized.
create function private.enforce_field_limit() returns trigger language plpgsql set search_path = '' as $$
begin
 if (select count(*) from public.fields f where f.farm_id=new.farm_id)>500 then
  raise exception 'FIELD_LIMIT' using errcode='22023';
 end if;
 return new;
end $$;
create trigger enforce_field_limit after insert on public.fields for each row execute function private.enforce_field_limit();
