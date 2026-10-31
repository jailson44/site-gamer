
-- GAMER HUB DUO - CONFIGURACAO DO BANCO
-- Execute no SQL Editor do Supabase.
-- Nunca coloque senhas ou chaves secretas neste arquivo.

-- PERFIS DOS JOGADORES
create table if not exists public.profiles (
  player_key text primary key
    check (player_key in ('player1', 'player2')),
  name text not null default 'JOGADOR',
  bio text not null default '',
  avatar_url text not null default '',
  links jsonb not null default '{}'::jsonb
);

insert into public.profiles (player_key, name, bio)
values
  ('player1', 'JOGADOR 1', 'STREAMER • GAMER • CREATOR'),
  ('player2', 'JOGADOR 2', 'STREAMER • GAMER • CREATOR')
on conflict (player_key) do nothing;

-- PERMISSOES DOS USUARIOS
create table if not exists public.user_roles (
  user_id uuid primary key
    references auth.users(id) on delete cascade,
  role text not null
    check (role in ('admin', 'player')),
  player_key text references public.profiles(player_key),
  constraint role_player_check check (
    (role = 'admin' and player_key is null)
    or
    (role = 'player' and player_key is not null)
  )
);

-- FOTOS E CLIPES
create table if not exists public.media_items (
  id uuid primary key default gen_random_uuid(),
  player_key text not null
    references public.profiles(player_key),
  kind text not null
    check (kind in ('image', 'video')),
  title text not null
    check (length(title) between 1 and 120),
  url text not null,
  created_at timestamptz not null default now()
);

create index if not exists media_player_idx
on public.media_items(player_key, created_at desc);

-- VERIFICAR QUEM PODE EDITAR CADA PERFIL
create or replace function public.can_edit_player(target text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles r
    where r.user_id = (select auth.uid())
      and (
        r.role = 'admin'
        or (
          r.role = 'player'
          and r.player_key = target
        )
      )
  );
$$;

revoke all on function public.can_edit_player(text)
from public;

grant execute on function public.can_edit_player(text)
to authenticated;

-- ATIVAR PROTECAO RLS
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.media_items enable row level security;

-- LEITURA PUBLICA DOS PERFIS
drop policy if exists "Public read profiles"
on public.profiles;

create policy "Public read profiles"
on public.profiles
for select to anon, authenticated
using (true);

-- EDICAO AUTORIZADA DOS PERFIS
drop policy if exists "Authorized update profiles"
on public.profiles;

create policy "Authorized update profiles"
on public.profiles
for update to authenticated
using (public.can_edit_player(player_key))
with check (public.can_edit_player(player_key));

-- CADA USUARIO LE APENAS SEU CARGO
drop policy if exists "Read own role"
on public.user_roles;

create policy "Read own role"
on public.user_roles
for select to authenticated
using (user_id = (select auth.uid()));

-- LEITURA PUBLICA DE FOTOS E CLIPES
drop policy if exists "Public read media"
on public.media_items;

create policy "Public read media"
on public.media_items
for select to anon, authenticated
using (true);

-- ADICIONAR FOTOS E CLIPES
drop policy if exists "Authorized insert media"
on public.media_items;

create policy "Authorized insert media"
on public.media_items
for insert to authenticated
with check (public.can_edit_player(player_key));

-- EXCLUIR FOTOS E CLIPES
drop policy if exists "Authorized delete media"
on public.media_items;

create policy "Authorized delete media"
on public.media_items
for delete to authenticated
using (public.can_edit_player(player_key));

-- ARMAZENAMENTO DE IMAGENS
insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
values (
  'gamer-media',
  'gamer-media',
  true,
  5242880,
  array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif'
  ]
)
on conflict (id) do update
set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = excluded.allowed_mime_types;

-- VISUALIZAR IMAGENS
drop policy if exists "Public media viewing"
on storage.objects;

create policy "Public media viewing"
on storage.objects
for select to anon, authenticated
using (bucket_id = 'gamer-media');

-- ENVIAR IMAGENS PARA A PASTA DO JOGADOR
drop policy if exists "Authorized upload by player folder"
on storage.objects;

create policy "Authorized upload by player folder"
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'gamer-media'
  and public.can_edit_player(
    (storage.foldername(name))[1]
  )
);

-- EXCLUIR IMAGENS DA PASTA DO JOGADOR
drop policy if exists "Authorized delete stored media"
on storage.objects;

create policy "Authorized delete stored media"
on storage.objects
for delete to authenticated
using (
  bucket_id = 'gamer-media'
  and public.can_edit_player(
    (storage.foldername(name))[1]
  )
);

-- DEPOIS DE CRIAR OS 3 USUARIOS EM AUTHENTICATION,
-- VAMOS ASSOCIAR OS UUIDs AOS CARGOS.
-- NAO EXECUTE AS LINHAS DE EXEMPLO ABAIXO.

-- insert into public.user_roles(user_id,role,player_key)
-- values
-- ('UUID_DO_ADMIN','admin',null),
-- ('UUID_DO_JOGADOR1','player','player1'),
-- ('UUID_DO_JOGADOR2','player','player2');
