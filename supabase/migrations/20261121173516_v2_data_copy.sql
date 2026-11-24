-- STEROID V2 : copie des données V1 vers les tables V2.
-- Lecture seule sur les tables V1, uniquement des ajouts côté V2, rejouable sans doublon.
-- Prérequis : public.v2_name_map rempli (scripts/v2/build-name-map.cjs).
-- Usage (administrateur) : select public.v2_copy_legacy();

create or replace function public.v2_copy_legacy()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  prog record;
  prof record;
  base jsonb;
  cyc uuid;
  sess uuid;
  wk record;
  wid uuid;
  wex uuid;
  ex jsonb;
  d int;
  pos int;
  i int;
  training_days int[];
  nums text[];
  week_plan jsonb;
  ov jsonb;
  ex_name text;
  plan_name text;
  ex_key text;
  ex_role text;
  plan_key text;
  started timestamptz;
  n int;
  counts jsonb := '{"cycles":0,"sessions":0,"cycle_exercises":0,"workouts":0,"exercises":0,"sets":0,"custom_exercises":0}'::jsonb;
begin
  -- Exercices perso issus de la correspondance.
  insert into public.user_exercises (user_id, key, name)
  select m.user_id, m.exercise_key, min(m.raw_name)
  from public.v2_name_map m where m.method = 'custom'
  group by m.user_id, m.exercise_key
  on conflict (user_id, key) do nothing;
  get diagnostics n = row_count;
  counts := jsonb_set(counts, '{custom_exercises}', to_jsonb(n));

  for prog in select * from public.user_programs loop
    base := prog.plan;
    select * into prof from public.user_profiles where user_id = prog.user_id;

    select coalesce(array_agg(t.d order by t.d), '{}') into training_days
    from generate_series(0, 6) as t(d)
    where jsonb_array_length(coalesce(base -> t.d -> 'ex', '[]'::jsonb)) > 0;

    -- Cycle actif reconstitué depuis le programme V1.
    insert into public.cycles (user_id, status, method, weeks, sessions_per_week, preferred_days, answers_snapshot, engine_version, started_at)
    values (prog.user_id, 'active', coalesce(prof.method, 'auto'), 6, greatest(1, least(7, coalesce(array_length(training_days, 1), 1))),
            nullif(training_days, '{}'), coalesce(prof.answers, '{}'::jsonb), 'v1-legacy', prog.start_date::timestamptz)
    on conflict (user_id) where status = 'active' do nothing;
    get diagnostics n = row_count;
    counts := jsonb_set(counts, '{cycles}', to_jsonb((counts->>'cycles')::int + n));

    select c.id into cyc from public.cycles c where c.user_id = prog.user_id and c.engine_version = 'v1-legacy' limit 1;

    -- Suite de séances et exercices prévus (semaine de base).
    if cyc is not null then
      pos := 0;
      foreach d in array training_days loop
        insert into public.cycle_sessions (user_id, cycle_id, position, code, title)
        values (prog.user_id, cyc, pos, chr(65 + pos), coalesce(nullif(base -> d ->> 'title', ''), 'Séance ' || chr(65 + pos)))
        on conflict (cycle_id, position) do nothing;
        get diagnostics n = row_count;
        counts := jsonb_set(counts, '{sessions}', to_jsonb((counts->>'sessions')::int + n));
        select s.id into sess from public.cycle_sessions s where s.cycle_id = cyc and s.position = pos;

        i := 0;
        for ex in select value from jsonb_array_elements(base -> d -> 'ex') loop
          select m.exercise_key, m.role into ex_key, ex_role from public.v2_name_map m where m.user_id = prog.user_id and m.raw_name = ex ->> 'name';
          if ex_key is null then raise exception 'Nom sans correspondance : % (utilisateur %)', ex ->> 'name', prog.user_id; end if;
          nums := array(select (regexp_matches(coalesce(ex ->> 'reps', ''), '\d+', 'g'))[1]);
          insert into public.cycle_exercises (user_id, cycle_session_id, position, exercise_key, role, sets, reps_min, reps_max, rest_seconds)
          values (prog.user_id, sess, i, ex_key, ex_role,
                  greatest(1, least(20, coalesce((ex ->> 'sets')::numeric::int, 3))),
                  greatest(1, least(100, coalesce(nums[1]::int, 8))),
                  greatest(1, least(100, coalesce(nums[2]::int, nums[1]::int, 12))),
                  greatest(0, least(3600, coalesce((ex ->> 'rest')::numeric::int, 90))))
          on conflict (cycle_session_id, position) do nothing;
          get diagnostics n = row_count;
          counts := jsonb_set(counts, '{cycle_exercises}', to_jsonb((counts->>'cycle_exercises')::int + n));
          i := i + 1;
        end loop;
        pos := pos + 1;
      end loop;
    end if;

    -- Séances réellement faites : une par (semaine, jour) ayant des séries ou une séance enregistrée.
    for wk in
      select k.week_number, k.day_index, ws.status, ws.started_at, ws.ended_at, ws.duration_seconds, ws.calories_estimate
      from (select distinct s.week_number, s.day_index from public.workout_sets s where s.user_id = prog.user_id
            union select w.week_number, w.day_index from public.workout_sessions w where w.user_id = prog.user_id) k
      left join public.workout_sessions ws on ws.user_id = prog.user_id and ws.week_number = k.week_number and ws.day_index = k.day_index
      order by 1, 2
    loop
      started := coalesce(wk.started_at, wk.ended_at,
                          prog.start_date::timestamptz + make_interval(days => (wk.week_number - 1) * 7 + wk.day_index, hours => 12));
      insert into public.workouts (user_id, cycle_id, cycle_session_id, status, started_at, ended_at, duration_seconds, calories_estimate, legacy_week, legacy_day)
      values (prog.user_id, cyc,
              (select s.id from public.cycle_sessions s where s.cycle_id = cyc and s.position = array_position(training_days, wk.day_index) - 1),
              case when wk.status = 'in_progress' then 'in_progress' else 'completed' end,
              started, coalesce(wk.ended_at, case when wk.status = 'in_progress' then null else started end),
              wk.duration_seconds, wk.calories_estimate, wk.week_number, wk.day_index)
      on conflict (user_id, legacy_week, legacy_day) do nothing;
      get diagnostics n = row_count;
      counts := jsonb_set(counts, '{workouts}', to_jsonb((counts->>'workouts')::int + n));
      select w.id into wid from public.workouts w where w.user_id = prog.user_id and w.legacy_week = wk.week_number and w.legacy_day = wk.day_index;

      week_plan := case when wk.week_number = 1 then base else coalesce(base -> 0 -> 'weeklyPlans' -> wk.week_number::text, base) end;
      ov := coalesce(base -> 0 -> 'sessionOverrides' -> (wk.week_number || ':' || wk.day_index), '{}'::jsonb);

      -- Exercices de la séance, dans l'ordre du programme (exercices ajoutés à la fin).
      i := 0;
      for ex in
        select jsonb_build_object('id', e.exercise_id, 'idx', coalesce(p.idx, 1000)) from
          (select distinct s.exercise_id from public.workout_sets s
           where s.user_id = prog.user_id and s.week_number = wk.week_number and s.day_index = wk.day_index) e
          left join lateral (select (x.ord - 1)::int as idx from jsonb_array_elements(coalesce(week_plan -> wk.day_index -> 'ex', '[]'::jsonb)) with ordinality x(v, ord)
                             where x.v ->> 'id' = e.exercise_id) p on true
        order by coalesce(p.idx, 1000), e.exercise_id
      loop
        plan_name := (select x ->> 'name' from jsonb_array_elements(coalesce(week_plan -> wk.day_index -> 'ex', '[]'::jsonb)) x where x ->> 'id' = ex ->> 'id' limit 1);
        ex_name := coalesce(ov -> (ex ->> 'id') ->> 'name',
                            plan_name,
                            (select x ->> 'name' from jsonb_array_elements(case when jsonb_typeof(ov -> '__extra') = 'array' then ov -> '__extra' else '[]'::jsonb end) x where x ->> 'id' = ex ->> 'id' limit 1));
        if ex_name is null then raise exception 'Exercice introuvable : % (semaine %, jour %, utilisateur %)', ex ->> 'id', wk.week_number, wk.day_index, prog.user_id; end if;
        select m.exercise_key into ex_key from public.v2_name_map m where m.user_id = prog.user_id and m.raw_name = ex_name;
        if ex_key is null then raise exception 'Nom sans correspondance : % (utilisateur %)', ex_name, prog.user_id; end if;
        plan_key := (select m.exercise_key from public.v2_name_map m where m.user_id = prog.user_id and m.raw_name = plan_name);

        insert into public.workout_exercises (user_id, workout_id, position, exercise_key, substituted_from_key, status, rpe)
        values (prog.user_id, wid, i, ex_key,
                case when plan_key is not null and plan_key <> ex_key then plan_key end,
                'done',
                (select r from (select (base -> 0 -> 'sessionEffort' -> (wk.week_number || ':' || wk.day_index) ->> (ex ->> 'id'))::numeric::int as r) q where r between 1 and 10))
        on conflict (workout_id, position) do nothing;
        get diagnostics n = row_count;
        counts := jsonb_set(counts, '{exercises}', to_jsonb((counts->>'exercises')::int + n));
        select x.id into wex from public.workout_exercises x where x.workout_id = wid and x.position = i;

        insert into public.workout_set_logs (user_id, workout_exercise_id, exercise_key, set_number, weight, reps, completed)
        select prog.user_id, wex, ex_key, s.set_number, s.weight, s.reps, s.completed
        from public.workout_sets s
        where s.user_id = prog.user_id and s.week_number = wk.week_number and s.day_index = wk.day_index and s.exercise_id = ex ->> 'id'
        on conflict (workout_exercise_id, set_number) do nothing;
        get diagnostics n = row_count;
        counts := jsonb_set(counts, '{sets}', to_jsonb((counts->>'sets')::int + n));
        i := i + 1;
      end loop;
    end loop;
  end loop;
  return counts;
end;
$$;

revoke all on function public.v2_copy_legacy() from public, anon, authenticated;
