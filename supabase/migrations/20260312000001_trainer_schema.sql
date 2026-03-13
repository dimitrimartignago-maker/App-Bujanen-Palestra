-- ============================================================
-- Trainer schema: profiles, gyms, gym_memberships
-- ============================================================

-- Public profiles (mirrors auth.users with publicly visible data)
create table if not exists profiles (
  id         uuid references auth.users primary key,
  email      text not null,
  full_name  text,
  role       text not null check (role in ('trainer', 'client')),
  created_at timestamptz default now()
);

-- Gyms owned by trainers (one trainer → one gym)
create table if not exists gyms (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  trainer_id  uuid references auth.users not null unique,
  created_at  timestamptz default now()
);

-- Clients belonging to a gym
create table if not exists gym_memberships (
  id         uuid primary key default gen_random_uuid(),
  gym_id     uuid references gyms on delete cascade not null,
  client_id  uuid references profiles not null,
  created_at timestamptz default now(),
  unique (gym_id, client_id)
);

-- ============================================================
-- Trigger: auto-create profile on signup
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    coalesce(new.raw_user_meta_data->>'role', 'client')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Row Level Security
-- ============================================================

alter table profiles       enable row level security;
alter table gyms           enable row level security;
alter table gym_memberships enable row level security;

-- All authenticated users can read profiles (needed for trainer to find clients)
create policy "authenticated users read profiles"
  on profiles for select
  using (auth.role() = 'authenticated');

-- Users manage only their own profile
create policy "users manage own profile"
  on profiles for all
  using (auth.uid() = id);

-- Trainers manage their own gym
create policy "trainers manage own gym"
  on gyms for all
  using (auth.uid() = trainer_id);

-- Clients can read gyms they belong to
create policy "clients read own gym"
  on gyms for select
  using (
    exists (
      select 1 from gym_memberships
      where gym_memberships.gym_id = gyms.id
        and gym_memberships.client_id = auth.uid()
    )
  );

-- Trainers manage memberships in their gym
create policy "trainers manage memberships"
  on gym_memberships for all
  using (
    exists (
      select 1 from gyms
      where gyms.id = gym_memberships.gym_id
        and gyms.trainer_id = auth.uid()
    )
  );

-- Clients read their own memberships
create policy "clients read own membership"
  on gym_memberships for select
  using (auth.uid() = client_id);

-- Also allow trainers to read programs of their clients (for status display)
-- Trainers can view set_logs for clients whose programs they created
create policy "trainers read client set_logs"
  on set_logs for select
  using (
    exists (
      select 1 from workout_sessions ws
      join client_programs cp on cp.id = ws.client_program_id
      join programs p on p.id = cp.program_id
      where set_logs.workout_session_id = ws.id
        and p.created_by = auth.uid()
    )
  );

-- Trainers read workout_sessions for programs they created
create policy "trainers read client workout_sessions"
  on workout_sessions for select
  using (
    exists (
      select 1 from client_programs cp
      join programs p on p.id = cp.program_id
      where workout_sessions.client_program_id = cp.id
        and p.created_by = auth.uid()
    )
  );
