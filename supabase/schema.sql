-- Tables
create table if not exists waste_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null,
  source text,
  total_weight_kg numeric not null check (total_weight_kg >= 0),
  total_volume_m3 numeric not null check (total_volume_m3 >= 0),
  notes text,
  created_by text,
  created_at timestamptz not null default now()
);

create table if not exists waste_segregation (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references waste_entries(id) on delete cascade,
  category text not null check (category in ('plastic', 'rdf', 'compost')),
  weight_kg numeric not null default 0 check (weight_kg >= 0),
  volume_m3 numeric not null default 0 check (volume_m3 >= 0),
  unique (entry_id, category)
);

-- Summary view for the dashboard
create or replace view category_summary as
select
  s.category,
  sum(s.weight_kg) as weight_kg,
  sum(s.volume_m3) as volume_m3
from waste_segregation s
group by s.category;

-- Row Level Security (demo: open to the anon key, no login)
alter table waste_entries enable row level security;
alter table waste_segregation enable row level security;

create policy "demo read entries" on waste_entries for select using (true);
create policy "demo insert entries" on waste_entries for insert with check (true);
create policy "demo update entries" on waste_entries for update using (true);
create policy "demo delete entries" on waste_entries for delete using (true);

create policy "demo read segregation" on waste_segregation for select using (true);
create policy "demo insert segregation" on waste_segregation for insert with check (true);
create policy "demo update segregation" on waste_segregation for update using (true);
create policy "demo delete segregation" on waste_segregation for delete using (true);

-- Seed rows (sample data so the dashboard is not empty)
with e as (
  insert into waste_entries (entry_date, source, total_weight_kg, total_volume_m3, notes, created_by)
  values
    (current_date - 14, 'Site A', 5000, 22, 'Sample entry', 'Demo'),
    (current_date - 7,  'Site B', 4200, 18, 'Sample entry', 'Demo'),
    (current_date - 1,  'Site A', 5600, 25, 'Sample entry', 'Demo')
  returning id, total_weight_kg
)
insert into waste_segregation (entry_id, category, weight_kg, volume_m3)
select id, 'plastic', total_weight_kg * 0.20, 5 from e
union all
select id, 'rdf',     total_weight_kg * 0.35, 8 from e
union all
select id, 'compost', total_weight_kg * 0.40, 6 from e;
