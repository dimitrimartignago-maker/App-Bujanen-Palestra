-- ============================================================
-- Bulletins: trainer → client(s) messages
-- ============================================================

create table if not exists bulletins (
  id           uuid primary key default gen_random_uuid(),
  trainer_id   uuid references auth.users not null,
  client_id    uuid references auth.users,   -- null = global (all clients of this trainer)
  title        text not null,
  body         text not null,
  created_at   timestamptz default now()
);

-- Tracks which bulletins each client has read
create table if not exists bulletin_reads (
  bulletin_id  uuid references bulletins on delete cascade not null,
  client_id    uuid references auth.users not null,
  read_at      timestamptz default now(),
  primary key (bulletin_id, client_id)
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table bulletins      enable row level security;
alter table bulletin_reads enable row level security;

-- Trainers manage their own bulletins
create policy "trainers manage own bulletins"
  on bulletins for all
  using (auth.uid() = trainer_id);

-- Clients read bulletins addressed to them (global or targeted)
-- A client can see bulletins from the trainer who manages their gym
create policy "clients read own bulletins"
  on bulletins for select
  using (
    (client_id = auth.uid())
    or
    (
      client_id is null
      and exists (
        select 1 from gym_memberships gm
        join gyms g on g.id = gm.gym_id
        where gm.client_id = auth.uid()
          and g.trainer_id = bulletins.trainer_id
      )
    )
  );

-- Clients manage their own read receipts
create policy "clients manage own reads"
  on bulletin_reads for all
  using (auth.uid() = client_id);
