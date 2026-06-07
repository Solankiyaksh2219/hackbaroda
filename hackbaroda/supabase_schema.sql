-- Run this in Supabase SQL Editor to create the feedback_memory table

create extension if not exists "uuid-ossp";

create table if not exists feedback_memory (
  id uuid primary key default uuid_generate_v4(),
  source text not null,
  sentiment_score int not null check (sentiment_score >= 0 and sentiment_score <= 100),
  themes text[] not null default '{}',
  created_at timestamp with time zone default now()
);

-- Index for fast trend queries
create index if not exists idx_feedback_memory_created_at on feedback_memory(created_at desc);

-- Row-level security (optional, enable if using auth)
-- alter table feedback_memory enable row level security;
-- create policy "Allow all" on feedback_memory for all using (true);
