-- Execute uma vez no SQL Editor do Supabase.
-- NUNCA coloque senhas ou chaves secretas neste SQL nem no GitHub.
create table if not exists public.profiles (
 player_key text primary key check(player_key in ('player1','player2')),
 name text not null default 'JOGADOR',
 bio text not null default '',
 avatar_url text not null default '',
 links jsonb not null default '{}'::jsonb
);
insert into public.profiles(player_key,name,bio) values
 ('player1','JOGADOR 1','STREAMER • GAMER • CREATOR'),
 ('player2','JOGADOR 2','STREAMER • GAMER • CREATOR')
on conflict(player_key) do nothing;
create table if not exists public.user_roles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check(role in ('admin','player')),
 player_key text references public.profiles(player_key),
 constraint role_player_check check ((role='admin' and player_key is null) or (role='player' and player_key is not null))
);
create table if not exists public.media_items (
 id uuid primary key default gen_random_uuid(),
 player_key text not null references public.profiles(player_key),
 kind text not null check(kind in ('image','video')),
 title text not null check(length(title) between 1 and 120),
 url text not null,
 created_at timestamptz not null default now()
);
create index if not exists media_player_idx on public.media_items(player_key,created_at desc);
create or replace function public.can_edit_player(target text)
returns boolean language sql stable security definer set search_path='' as $$
 select exists (select 1 from public.user_roles r where r.user_id=(select auth.uid()) and (r.role='admin' or (r.role='player' and r.player_key=target)));
$$;
revoke all on function public.can_edit_player(text) from public;
grant execute on function public.can_edit_player(text) to authenticated;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.media_items enable row level security;
drop policy if exists "Public read profiles" on public.profiles;
create policy "Public read profiles" on public.profiles for select to anon,authenticated using(true);
drop policy if exists "Authorized update profiles" on public.profiles;
create policy "Authorized update profiles" on public.profiles for update to authenticated using(public.can_edit_player(player_key)) with check(public.can_edit_player(player_key));
drop policy if exists "Read own role" on public.user_roles;
create policy "Read own role" on public.user_roles for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists "Public read media" on public.media_items;
create policy "Public read media" on public.media_items for select to anon,authenticated using(true);
drop policy if exists "Authorized insert media" on public.media_items;
create policy "Authorized insert media" on public.media_items for insert to authenticated with check(public.can_edit_player(player_key));
drop policy if exists "Authorized delete media" on public.media_items;
create policy "Authorized delete media" on public.media_items for delete to authenticated using(public.can_edit_player(player_key));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('gamer-media','gamer-media',true,5242880,array['image/png','image/jpeg','image/webp','image/gif'])
on conflict(id) do update set public=true,file_size_limit=5242880,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "Public media viewing" on storage.objects;
create policy "Public media viewing" on storage.objects for select to anon,authenticated using(bucket_id='gamer-media');
drop policy if exists "Authorized upload by player folder" on storage.objects;
create policy "Authorized upload by player folder" on storage.objects for insert to authenticated
with check(bucket_id='gamer-media' and public.can_edit_player((storage.foldername(name))[1]));
-- Depois de criar as 3 contas em Authentication > Users, substitua os UUIDs:
-- insert into public.user_roles(user_id,role,player_key) values
-- ('UUID_DO_ADMIN','admin',null),
-- ('UUID_DO_JOGADOR1','player','player1'),
-- ('UUID_DO_JOGADOR2','player','player2');
