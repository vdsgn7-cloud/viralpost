-- ViralPost Studio — Supabase Schema
-- Execute este arquivo no SQL Editor do Supabase

-- 1. PROFILES (extensão do auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  avatar_url text,
  default_nicho text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Usuário vê só o próprio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Usuário edita só o próprio perfil"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Perfil criado no signup"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Trigger: cria perfil automaticamente no signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. GENERATED_POSTS
create table public.generated_posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  nicho text not null,
  rede_social text not null check (rede_social in ('instagram','linkedin','twitter')),
  formato text not null check (formato in ('estatico','carrossel','thread')),
  headline text not null,
  copy text not null,
  slides jsonb,
  hashtags text[],
  estilo_visual jsonb,
  thumbnail_url text,
  created_at timestamptz default now()
);

alter table public.generated_posts enable row level security;

create policy "Posts visíveis só para o dono"
  on public.generated_posts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index generated_posts_user_id_idx on public.generated_posts(user_id);
create index generated_posts_created_at_idx on public.generated_posts(created_at desc);

-- 3. PLANNER_POSTS
create table public.planner_posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  post_id uuid references public.generated_posts on delete set null,
  scheduled_date date not null,
  scheduled_time time,
  rede_social text not null,
  status text not null default 'rascunho'
    check (status in ('rascunho','agendado','publicado','arquivado')),
  notas text,
  created_at timestamptz default now()
);

alter table public.planner_posts enable row level security;

create policy "Planner visível só para o dono"
  on public.planner_posts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index planner_posts_user_date_idx on public.planner_posts(user_id, scheduled_date);
