-- This has ALREADY been applied to the vayaji-dashboard Supabase project
-- (kqyuosunwdfsmbnyerjb) as a standalone, isolated table. Kept here for
-- reference / in case you ever want to reproduce it in a fresh project.

create table if not exists wedcam_photos (
  id uuid primary key default gen_random_uuid(),
  guest_id text not null,
  guest_name text not null,
  image_url text not null,
  cloudinary_public_id text not null,
  created_at timestamptz not null default now()
);

create index if not exists wedcam_photos_guest_id_idx on wedcam_photos (guest_id);
create index if not exists wedcam_photos_created_at_idx on wedcam_photos (created_at desc);

alter table wedcam_photos enable row level security;

create policy "wedcam anyone can insert photos"
  on wedcam_photos for insert
  to anon
  with check (true);

create policy "wedcam anyone can read photos"
  on wedcam_photos for select
  to anon
  using (true);
