-- Add rest_seconds to exercises (default 90 s)
alter table exercises
  add column if not exists rest_seconds smallint not null default 90;
