-- ============================================================
-- Workout schema for Bujanen Palestra
-- ============================================================

-- Trainer-created program templates
create table if not exists programs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_by  uuid references auth.users not null,
  created_at  timestamptz default now()
);

-- Assigns a program to a client with a start date
create table if not exists client_programs (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid references auth.users not null,
  program_id  uuid references programs on delete restrict not null,
  start_date  date not null,         -- Monday of week 1
  is_active   boolean not null default true,
  created_at  timestamptz default now()
);

-- Each day of the week the program schedules training (0=Mon … 6=Sun)
create table if not exists program_days (
  id          uuid primary key default gen_random_uuid(),
  program_id  uuid references programs on delete cascade not null,
  day_index   smallint not null check (day_index between 0 and 6),
  label       text,
  order_index smallint not null default 0
);

-- Exercises within a day
create table if not exists exercises (
  id              uuid primary key default gen_random_uuid(),
  program_day_id  uuid references program_days on delete cascade not null,
  name            text not null,
  notes           text,
  order_index     smallint not null default 0
);

-- Per-week targets: weight/reps can progress each week.
-- If a week has no row, fall back to the latest week_number <= current.
create table if not exists exercise_weeks (
  id           uuid primary key default gen_random_uuid(),
  exercise_id  uuid references exercises on delete cascade not null,
  week_number  smallint not null check (week_number >= 1),
  set_count    smallint not null default 3,
  target_weight numeric,        -- null = bodyweight
  target_reps  smallint not null,
  unique (exercise_id, week_number)
);

-- One session per (client_program × program_day × week_number)
create table if not exists workout_sessions (
  id                 uuid primary key default gen_random_uuid(),
  client_program_id  uuid references client_programs on delete cascade not null,
  program_day_id     uuid references program_days not null,
  week_number        smallint not null,
  date               date not null,
  created_at         timestamptz default now(),
  unique (client_program_id, program_day_id, week_number)
);

-- Individual set tracking within a session
create table if not exists set_logs (
  id                 uuid primary key default gen_random_uuid(),
  workout_session_id uuid references workout_sessions on delete cascade not null,
  exercise_id        uuid references exercises not null,
  set_index          smallint not null,
  actual_weight      numeric,
  actual_reps        smallint,
  done               boolean not null default false,
  updated_at         timestamptz default now(),
  unique (workout_session_id, exercise_id, set_index)
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table programs         enable row level security;
alter table client_programs  enable row level security;
alter table program_days     enable row level security;
alter table exercises        enable row level security;
alter table exercise_weeks   enable row level security;
alter table workout_sessions enable row level security;
alter table set_logs         enable row level security;

-- Trainers can manage their own programs
create policy "trainers manage own programs"
  on programs for all
  using (auth.uid() = created_by);

-- Clients can read programs assigned to them
create policy "clients read assigned programs"
  on programs for select
  using (
    exists (
      select 1 from client_programs
      where client_programs.program_id = programs.id
        and client_programs.client_id = auth.uid()
    )
  );

-- Clients read own client_programs
create policy "clients read own client_programs"
  on client_programs for select
  using (auth.uid() = client_id);

-- Trainers manage client_programs for their programs
create policy "trainers manage client_programs"
  on client_programs for all
  using (
    exists (
      select 1 from programs
      where programs.id = client_programs.program_id
        and programs.created_by = auth.uid()
    )
  );

-- Clients read program_days for their assigned programs
create policy "clients read program_days"
  on program_days for select
  using (
    exists (
      select 1 from client_programs
      where client_programs.program_id = program_days.program_id
        and client_programs.client_id = auth.uid()
    )
  );

-- Trainers manage program_days for their programs
create policy "trainers manage program_days"
  on program_days for all
  using (
    exists (
      select 1 from programs
      where programs.id = program_days.program_id
        and programs.created_by = auth.uid()
    )
  );

-- Clients read exercises
create policy "clients read exercises"
  on exercises for select
  using (
    exists (
      select 1 from program_days
      join client_programs on client_programs.program_id = program_days.program_id
      where exercises.program_day_id = program_days.id
        and client_programs.client_id = auth.uid()
    )
  );

-- Trainers manage exercises
create policy "trainers manage exercises"
  on exercises for all
  using (
    exists (
      select 1 from program_days
      join programs on programs.id = program_days.program_id
      where exercises.program_day_id = program_days.id
        and programs.created_by = auth.uid()
    )
  );

-- Clients read exercise_weeks
create policy "clients read exercise_weeks"
  on exercise_weeks for select
  using (
    exists (
      select 1 from exercises
      join program_days on program_days.id = exercises.program_day_id
      join client_programs on client_programs.program_id = program_days.program_id
      where exercise_weeks.exercise_id = exercises.id
        and client_programs.client_id = auth.uid()
    )
  );

-- Trainers manage exercise_weeks
create policy "trainers manage exercise_weeks"
  on exercise_weeks for all
  using (
    exists (
      select 1 from exercises
      join program_days on program_days.id = exercises.program_day_id
      join programs on programs.id = program_days.program_id
      where exercise_weeks.exercise_id = exercises.id
        and programs.created_by = auth.uid()
    )
  );

-- Clients manage their own workout sessions
create policy "clients manage own sessions"
  on workout_sessions for all
  using (
    exists (
      select 1 from client_programs
      where client_programs.id = workout_sessions.client_program_id
        and client_programs.client_id = auth.uid()
    )
  );

-- Clients manage their own set logs
create policy "clients manage own set_logs"
  on set_logs for all
  using (
    exists (
      select 1 from workout_sessions
      join client_programs on client_programs.id = workout_sessions.client_program_id
      where set_logs.workout_session_id = workout_sessions.id
        and client_programs.client_id = auth.uid()
    )
  );
