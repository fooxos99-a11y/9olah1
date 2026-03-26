create extension if not exists pgcrypto;

create table if not exists public.letter_hive_live_matches (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'مباراة خلية الحروف المباشرة',
  created_by_user_id text,
  created_by_name text,
  presenter_token text not null unique,
  team_a_token text not null unique,
  team_b_token text not null unique,
  team_a_name text,
  team_b_name text,
  status text not null default 'waiting' check (status in ('waiting', 'live', 'finished')),
  is_open boolean not null default false,
  buzz_enabled boolean not null default false,
  first_buzz_side text check (first_buzz_side in ('team_a', 'team_b')),
  first_buzzed_at timestamptz,
  current_prompt text,
  current_answer text,
  current_letter text,
  current_cell_index integer,
  show_answer boolean not null default false,
  team_a_score integer not null default 0,
  team_b_score integer not null default 0,
  board_letters jsonb not null default '[]'::jsonb,
  claimed_cells jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_letter_hive_live_matches_status
  on public.letter_hive_live_matches (status);

create index if not exists idx_letter_hive_live_matches_created_at
  on public.letter_hive_live_matches (created_at desc);

create table if not exists public.letter_hive_live_questions (
  id uuid primary key default gen_random_uuid(),
  letter text not null,
  question text not null,
  answer text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_letter_hive_live_questions_letter
  on public.letter_hive_live_questions (letter);

create table if not exists public.letter_hive_live_used_questions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.letter_hive_live_matches(id) on delete cascade,
  question_id uuid not null references public.letter_hive_live_questions(id) on delete cascade,
  letter text not null,
  created_at timestamptz not null default now(),
  unique (match_id, question_id)
);

create index if not exists idx_letter_hive_live_used_questions_match_id
  on public.letter_hive_live_used_questions (match_id);

create table if not exists public.letter_hive_live_registrations (
  id uuid primary key default gen_random_uuid(),
  team_name text not null,
  player_one_name text not null,
  player_two_name text not null,
  submitted_by_user_id text,
  submitted_by_name text,
  status text not null default 'new' check (status in ('new', 'reviewed')),
  created_at timestamptz not null default now()
);

create index if not exists idx_letter_hive_live_registrations_created_at
  on public.letter_hive_live_registrations (created_at desc);