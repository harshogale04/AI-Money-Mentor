-- Run this in your Supabase SQL editor to set up all tables

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── User Profiles ─────────────────────────────────────────────────────────────
create table if not exists user_profiles (
  user_id       uuid primary key default uuid_generate_v4(),
  name          text not null,
  age           int not null,
  email         text unique not null,
  annual_income  numeric not null,
  monthly_expenses numeric not null,
  risk_profile  text default 'moderate' check (risk_profile in ('conservative','moderate','aggressive')),
  tax_regime    text default 'new' check (tax_regime in ('old','new')),
  existing_investments numeric default 0,
  goals         jsonb default '[]',
  partner_id    uuid references user_profiles(user_id),
  created_at    timestamptz default now()
);

-- ── Couple Profiles ───────────────────────────────────────────────────────────
create table if not exists couple_profiles (
  couple_id        uuid primary key default uuid_generate_v4(),
  partner_a_id     uuid references user_profiles(user_id) not null,
  partner_b_id     uuid references user_profiles(user_id),
  combined_income  numeric,
  combined_expenses numeric,
  shared_goals     jsonb default '[]',
  hra_optimization jsonb,
  nps_split        jsonb,
  insurance_strategy text check (insurance_strategy in ('joint','individual')),
  both_ready       boolean default false,
  created_at       timestamptz default now()
);

-- ── MF Portfolios ─────────────────────────────────────────────────────────────
create table if not exists mf_portfolios (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid references user_profiles(user_id) not null,
  holdings       jsonb not null default '[]',
  total_invested  numeric,
  total_current_value numeric,
  overall_xirr   numeric,
  parsed_at      timestamptz default now()
);

-- ── Tax Profiles ──────────────────────────────────────────────────────────────
create table if not exists tax_profiles (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid references user_profiles(user_id) not null,
  financial_year   text default '2024-25',
  gross_salary     numeric not null,
  hra_received     numeric default 0,
  hra_exempt       numeric default 0,
  deductions       jsonb default '{}',
  taxable_income_old numeric,
  taxable_income_new numeric,
  tax_old_regime   numeric,
  tax_new_regime   numeric,
  recommended_regime text,
  potential_savings  numeric,
  created_at       timestamptz default now()
);

-- ── Health Scores ─────────────────────────────────────────────────────────────
create table if not exists health_scores (
  id                   uuid primary key default uuid_generate_v4(),
  user_id              uuid references user_profiles(user_id) not null,
  emergency_score      numeric,
  insurance_score      numeric,
  diversification_score numeric,
  debt_score           numeric,
  tax_score            numeric,
  retirement_score     numeric,
  overall_score        numeric,
  priority_actions     jsonb default '[]',
  created_at           timestamptz default now()
);

-- ── Agent Sessions (LangGraph checkpoints) ───────────────────────────────────
create table if not exists agent_sessions (
  session_id   uuid primary key default uuid_generate_v4(),
  user_id      uuid references user_profiles(user_id) not null,
  agent_type   text not null,
  state        jsonb default '{}',
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- RLS: Enable for all tables (configure policies in Supabase dashboard)
alter table user_profiles enable row level security;
alter table couple_profiles enable row level security;
alter table mf_portfolios enable row level security;
alter table tax_profiles enable row level security;
alter table health_scores enable row level security;
alter table agent_sessions enable row level security;
