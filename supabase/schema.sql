-- =====================================================================
-- Color Me! — Supabase schema
-- Run this whole file once in: Supabase Dashboard > SQL Editor > New query
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1) LOGIN DATABASE
--    Teachers  -> Supabase Auth (auth.users) + public.profiles
--    Classes   -> public.classes
--    Students  -> public.students (name + class code, no password)
-- ---------------------------------------------------------------------

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text not null,
  email      text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.classes (
  id         uuid primary key default gen_random_uuid(),
  admin_id   uuid not null references public.profiles(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 28),
  code       text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  created_at timestamptz not null default now()
);
create index if not exists classes_admin_idx on public.classes(admin_id);

create table if not exists public.students (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references public.classes(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 16),
  status     text not null default 'pending' check (status in ('pending','approved','declined')),
  progress   jsonb not null default '{}'::jsonb,   -- days / best / perf / swift / b (badges)
  created_at timestamptz not null default now()
);
create unique index if not exists students_class_name_uq
  on public.students(class_id, lower(name));
create index if not exists students_class_idx on public.students(class_id);

-- Auto-create a profile row whenever a teacher signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, username, email)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'username',''), split_part(new.email,'@',1)),
    new.email
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 2) STUDENT ACTIVITY LOG DATABASE
--    One row per event: a login, or a finished game.
-- ---------------------------------------------------------------------

create table if not exists public.activity_log (
  id           bigint generated always as identity primary key,
  student_id   uuid not null references public.students(id) on delete cascade,
  class_id     uuid not null references public.classes(id)  on delete cascade,
  event        text not null check (event in ('login','game_complete')),
  game         text check (game in ('name','mix','find')),
  rounds       int,
  right_count  int,
  wrong_count  int,
  stars        int check (stars between 0 and 3),
  perfect      boolean,
  swift        boolean,
  duration_sec int,
  created_at   timestamptz not null default now()
);
create index if not exists activity_student_idx on public.activity_log(student_id, created_at desc);
create index if not exists activity_class_idx   on public.activity_log(class_id,   created_at desc);

-- ---------------------------------------------------------------------
-- 3) ROW LEVEL SECURITY
--    Teachers (signed in) can only see/change their own classes,
--    the students in them, and those students' activity.
--    Students are anonymous and only talk to the database through the
--    RPC functions below.
-- ---------------------------------------------------------------------

alter table public.profiles     enable row level security;
alter table public.classes      enable row level security;
alter table public.students     enable row level security;
alter table public.activity_log enable row level security;

drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists classes_owner_all on public.classes;
create policy classes_owner_all on public.classes
  for all to authenticated
  using (admin_id = auth.uid()) with check (admin_id = auth.uid());

drop policy if exists students_teacher_read on public.students;
create policy students_teacher_read on public.students
  for select to authenticated
  using (exists (select 1 from public.classes c where c.id = class_id and c.admin_id = auth.uid()));

drop policy if exists students_teacher_update on public.students;
create policy students_teacher_update on public.students
  for update to authenticated
  using (exists (select 1 from public.classes c where c.id = class_id and c.admin_id = auth.uid()))
  with check (exists (select 1 from public.classes c where c.id = class_id and c.admin_id = auth.uid()));

drop policy if exists students_teacher_delete on public.students;
create policy students_teacher_delete on public.students
  for delete to authenticated
  using (exists (select 1 from public.classes c where c.id = class_id and c.admin_id = auth.uid()));

drop policy if exists activity_teacher_read on public.activity_log;
create policy activity_teacher_read on public.activity_log
  for select to authenticated
  using (exists (select 1 from public.classes c where c.id = class_id and c.admin_id = auth.uid()));

-- ---------------------------------------------------------------------
-- 4) STUDENT RPC FUNCTIONS (callable by anon; run as definer)
-- ---------------------------------------------------------------------

-- Join / log in with name + class code. Creates a pending request for new
-- students, re-opens a declined one, and records a 'login' activity row.
create or replace function public.join_class(p_name text, p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_class public.classes;
  v_stu   public.students;
  v_name  text := btrim(coalesce(p_name,''));
begin
  if v_name = '' or char_length(v_name) > 16 then
    raise exception 'invalid_name';
  end if;

  select * into v_class from public.classes where code = upper(btrim(coalesce(p_code,'')));
  if not found then
    raise exception 'class_not_found';
  end if;

  select * into v_stu from public.students
   where class_id = v_class.id and lower(name) = lower(v_name);

  if not found then
    insert into public.students(class_id, name, progress)
    values (v_class.id, v_name, jsonb_build_object('name', v_name))
    returning * into v_stu;
  elsif v_stu.status = 'declined' then
    update public.students set status = 'pending' where id = v_stu.id returning * into v_stu;
  end if;

  insert into public.activity_log(student_id, class_id, event)
  values (v_stu.id, v_class.id, 'login');

  return jsonb_build_object(
    'student', to_jsonb(v_stu),
    'class',   jsonb_build_object('id', v_class.id, 'name', v_class.name, 'code', v_class.code,
                                  'admin_name', (select username from public.profiles where id = v_class.admin_id))
  );
end $$;

-- Fetch a student (used for "recent students", refresh status, auto re-login)
create or replace function public.get_student(p_student_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_stu   public.students;
  v_class public.classes;
begin
  select * into v_stu from public.students where id = p_student_id;
  if not found then return null; end if;
  select * into v_class from public.classes where id = v_stu.class_id;
  return jsonb_build_object(
    'student', to_jsonb(v_stu),
    'class',   jsonb_build_object('id', v_class.id, 'name', v_class.name, 'code', v_class.code,
                                  'admin_name', (select username from public.profiles where id = v_class.admin_id))
  );
end $$;

-- Save the student's progress blob and (optionally) a renamed name
create or replace function public.save_progress(p_student_id uuid, p_name text, p_progress jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.students
     set progress = coalesce(p_progress, progress),
         name     = coalesce(nullif(btrim(p_name),''), name)
   where id = p_student_id and status = 'approved';
end $$;

-- Record a finished game in the activity log AND save progress, atomically
create or replace function public.log_game(
  p_student_id uuid, p_game text, p_rounds int, p_right int, p_wrong int,
  p_stars int, p_perfect boolean, p_swift boolean, p_duration int, p_progress jsonb
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_stu public.students;
begin
  select * into v_stu from public.students where id = p_student_id and status = 'approved';
  if not found then raise exception 'not_approved'; end if;

  insert into public.activity_log(student_id, class_id, event, game, rounds,
                                  right_count, wrong_count, stars, perfect, swift, duration_sec)
  values (v_stu.id, v_stu.class_id, 'game_complete', p_game, p_rounds,
          p_right, p_wrong, p_stars, p_perfect, p_swift, p_duration);

  update public.students set progress = p_progress where id = v_stu.id;
end $$;

revoke all on function public.join_class(text,text)  from public;
revoke all on function public.get_student(uuid)      from public;
revoke all on function public.save_progress(uuid,text,jsonb) from public;
revoke all on function public.log_game(uuid,text,int,int,int,int,boolean,boolean,int,jsonb) from public;
grant execute on function public.join_class(text,text)  to anon, authenticated;
grant execute on function public.get_student(uuid)      to anon, authenticated;
grant execute on function public.save_progress(uuid,text,jsonb) to anon, authenticated;
grant execute on function public.log_game(uuid,text,int,int,int,int,boolean,boolean,int,jsonb) to anon, authenticated;
