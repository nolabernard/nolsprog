-- Séries copiées de la V1 : date recalée sur le début de leur séance (ordre conservé : exercice puis série).
update public.workout_set_logs l
set created_at = w.started_at + make_interval(secs => e.position*100 + l.set_number)
from public.workout_exercises e join public.workouts w on w.id = e.workout_id
where e.id = l.workout_exercise_id and w.legacy_week is not null and l.created_at::date <> w.started_at::date;

-- Séance de 70 min dont la fin était enregistrée 33 h plus tard : fin = début + durée.
update public.workouts set ended_at = started_at + make_interval(secs => duration_seconds)
where id = '0c249567-9f46-4964-85f3-be08cf5e785e' and duration_seconds = 4200;

-- Séance restée ouverte 15,6 h (V1) : durée réelle inconnue, donc non affichée ; fin ramenée le jour même.
update public.workouts set duration_seconds = null, ended_at = started_at + interval '2 hours'
where id = '5ad23718-486b-4189-bd0e-05c4bc07a70b' and duration_seconds = 56317;
