// STEROID — envoi des rappels (notifications web).
// GET  ?vapid=1                 → clé publique d'envoi (créée au premier appel, gardée dans public.push_config).
// POST + x-cron-secret          → appel programmé toutes les 15 min : envoie les rappels dus.
// POST + Authorization: Bearer  → { action: 'save', sub } / { action: 'remove', endpoint } / { test: true } pour l'utilisateur connecté.
//                                  { action: 'rest', endpoint, at, next, title?, body? } / { action: 'rest-cancel', endpoint } : alerte de fin de repos ou de tenue
//                                  (envoyée quand l'app passe en arrière-plan pendant un repos, annulée à son retour).
// Aucun secret dans le dépôt : la clé de service est fournie par Supabase, les autres valeurs vivent dans la base.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { isDue, localDate } from "./schedule.js";

const ORIGIN = "https://nolabernard.github.io";
const cors = { "Access-Control-Allow-Origin": ORIGIN, "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

async function config(key: string): Promise<string | null> {
  const { data } = await db.from("push_config").select("value").eq("key", key).maybeSingle();
  return data?.value ?? null;
}
async function vapid() {
  let pub = await config("vapid_public"), priv = await config("vapid_private");
  if (!pub || !priv) {
    const k = webpush.generateVAPIDKeys();
    // Première création : si un autre appel a gagné la course, on relit ses clés.
    await db.from("push_config").upsert([{ key: "vapid_public", value: k.publicKey }, { key: "vapid_private", value: k.privateKey }], { onConflict: "key", ignoreDuplicates: true });
    pub = await config("vapid_public"); priv = await config("vapid_private");
  }
  webpush.setVapidDetails("https://nolabernard.github.io/nolsprog/", pub!, priv!);
  return pub!;
}

type Sub = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string; enabled: boolean; hour: number; minute: number; days: number[]; timezone: string; last_sent_on: string | null };
const MESSAGE = { title: "STEROID", body: "C’est l’heure de ta séance. Ta prochaine séance t’attend.", url: "/nolsprog/" };

async function send(sub: Sub, payload: Record<string, unknown> = MESSAGE, ttl = 3600) {
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload), { TTL: ttl });
    return "sent";
  } catch (e) {
    const code = (e as { statusCode?: number }).statusCode;
    // Abonnement expiré ou retiré par le navigateur : on le supprime.
    if (code === 404 || code === 410) { await db.from("push_subscriptions").delete().eq("id", sub.id); return "gone"; }
    console.error("envoi refusé", code, (e as Error).message);
    return "error";
  }
}

async function runSchedule() {
  await vapid();
  const now = Date.now();
  const { data: subs, error } = await db.from("push_subscriptions").select("*").eq("enabled", true);
  if (error) throw error;
  const list = (subs || []) as Sub[];
  // Séances faites (avec au moins une série) ou passées dans les dernières 36 h : pas de rappel ce jour-là.
  const users = [...new Set(list.map(s => s.user_id))];
  const trained = new Map<string, string[]>();
  if (users.length) {
    const since = new Date(now - 36 * 3600e3).toISOString();
    const { data: ws } = await db.from("workouts").select("id, user_id, started_at, ended_at, status").in("status", ["completed", "skipped"]).gte("ended_at", since).in("user_id", users);
    // Même règle que l'app : une séance terminée ne compte que si elle a au moins une série validée ou du cardio noté.
    const ids = (ws || []).filter(w => w.status === "completed").map(w => w.id);
    const real = new Set<string>();
    if (ids.length) {
      const { data: ex } = await db.from("workout_exercises").select("workout_id, workout_set_logs!inner(completed)").in("workout_id", ids).eq("workout_set_logs.completed", true);
      for (const e of ex || []) real.add(e.workout_id);
      const { data: cl } = await db.from("cardio_logs").select("workout_id").in("workout_id", ids);
      for (const c of cl || []) if (c.workout_id) real.add(c.workout_id);
    }
    for (const w of (ws || []).filter(w => w.status === "skipped" || real.has(w.id))) {
      const tz = list.find(s => s.user_id === w.user_id)?.timezone || "Europe/Paris";
      trained.set(w.user_id, [...(trained.get(w.user_id) || []), localDate(Date.parse(w.started_at || w.ended_at), tz)]);
    }
  }
  const result = { due: 0, sent: 0, gone: 0, error: 0 };
  for (const s of list) {
    if (!isDue(s, now, trained.get(s.user_id) || [])) continue;
    result.due++;
    const r = await send(s);
    result[r as "sent" | "gone" | "error"]++;
    if (r === "sent") await db.from("push_subscriptions").update({ last_sent_on: localDate(now, s.timezone) }).eq("id", s.id);
  }
  return result;
}

// ----- Alerte de fin de repos -----
// Une seule alerte en attente par appareil : clé « rest:<id> » dans push_config (jeton|heure). Annuler = effacer la clé.
// L'attente se fait par tranches de 100 s (limite de durée d'une fonction) : au-delà, la fonction se relance elle-même.
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
async function restWait(id: string, token: string, at: number, next: string, title = "Repos terminé", text = "") {
  const left = at - Date.now();
  if (left > 110e3) {
    await sleep(100e3);
    const secret = await config("cron_secret");
    await fetch(Deno.env.get("SUPABASE_URL") + "/functions/v1/send-reminders", { method: "POST", headers: { "Content-Type": "application/json", "x-cron-secret": secret || "" }, body: JSON.stringify({ action: "rest-relay", id, token, at, next, title, text }) });
    return;
  }
  if (left > 0) await sleep(left);
  if ((await config("rest:" + id)) !== token + "|" + at) return; // annulée ou remplacée
  await db.from("push_config").delete().eq("key", "rest:" + id);
  const { data: sub } = await db.from("push_subscriptions").select("*").eq("id", id).maybeSingle();
  if (!sub) return;
  await vapid();
  await send(sub as Sub, { title, body: text || (next ? "Ensuite : " + next : "À toi pour la série suivante."), url: "/nolsprog/", tag: "steroid-rest" }, 90); // inutile si elle arrive en retard
}
function background(p: Promise<unknown>) {
  const rt = (globalThis as unknown as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } }).EdgeRuntime;
  if (rt?.waitUntil) rt.waitUntil(p.catch(e => console.error("alerte repos", e))); else p.catch(e => console.error("alerte repos", e));
}

// Comparaison en temps constant du secret d'appel programmé.
function same(a: string, b: string) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }
// Seuls les services de notification des navigateurs sont acceptés comme destinataires.
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /(^|\.)push\.apple\.com$/, /\.notify\.windows\.com$/];
function validSub(s: Record<string, unknown>) {
  try {
    const u = new URL(String(s.endpoint));
    if (u.protocol !== "https:" || !PUSH_HOSTS.some(r => r.test(u.hostname)) || String(s.endpoint).length > 2000) return null;
    const days = Array.isArray(s.days) ? [...new Set(s.days.map(Number))].filter(d => Number.isInteger(d) && d >= 0 && d <= 6) : [];
    const hour = Number(s.hour), minute = Number(s.minute);
    if (!days.length || !Number.isInteger(hour) || hour < 0 || hour > 23 || ![0, 15, 30, 45].includes(minute)) return null;
    const p256dh = String(s.p256dh || ""), auth = String(s.auth || "");
    if (!p256dh || p256dh.length > 200 || !auth || auth.length > 100) return null;
    let timezone = String(s.timezone || "Europe/Paris").slice(0, 64);
    try { new Intl.DateTimeFormat("en-GB", { timeZone: timezone }); } catch { timezone = "Europe/Paris"; }
    return { endpoint: String(s.endpoint), p256dh, auth, enabled: s.enabled !== false, hour, minute, days, timezone };
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const url = new URL(req.url);
    if (req.method === "GET" && url.searchParams.has("vapid")) return json({ publicKey: await vapid() });
    if (req.method !== "POST") return json({ error: "Méthode non prise en charge." }, 405);
    const secret = req.headers.get("x-cron-secret");
    if (secret) {
      if (!same(secret, (await config("cron_secret")) || "")) return json({ error: "Refusé." }, 401);
      const cb = await req.json().catch(() => ({}));
      if (cb.action === "rest-relay") { background(restWait(String(cb.id), String(cb.token), Number(cb.at), String(cb.next || "").slice(0, 80), String(cb.title || "Repos terminé").slice(0, 40), String(cb.text || "").slice(0, 120))); return json({ ok: true }); }
      return json(await runSchedule());
    }
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: u } = token ? await db.auth.getUser(token) : { data: { user: null } };
    if (!u?.user) return json({ error: "Connexion requise." }, 401);
    const body = await req.json().catch(() => ({}));
    if (body.action === "save") {
      const row = validSub(body.sub || {});
      if (!row) return json({ error: "Abonnement invalide." }, 400);
      // Un même téléphone appartient au dernier compte connecté qui active les rappels.
      const { data, error } = await db.from("push_subscriptions").upsert({ ...row, user_id: u.user.id, last_sent_on: null }, { onConflict: "endpoint" }).select("id").single();
      if (error) throw error;
      return json({ id: data.id });
    }
    if (body.action === "rest" || body.action === "rest-cancel") {
      const { data: own } = await db.from("push_subscriptions").select("id").eq("endpoint", String(body.endpoint || "")).eq("user_id", u.user.id).maybeSingle();
      if (!own) return json({ error: "Rappels non activés sur cet appareil." }, 404);
      if (body.action === "rest-cancel") { await db.from("push_config").delete().eq("key", "rest:" + own.id); return json({ ok: true }); }
      const at = Math.round(Number(body.at)), left = at - Date.now();
      if (!Number.isFinite(at) || left < 3e3 || left > 15 * 60e3) return json({ error: "Repos invalide." }, 400);
      const token = crypto.randomUUID();
      await db.from("push_config").upsert({ key: "rest:" + own.id, value: token + "|" + at }, { onConflict: "key" });
      background(restWait(own.id, token, at, String(body.next || "").slice(0, 80), String(body.title || "Repos terminé").slice(0, 40), String(body.body || "").slice(0, 120)));
      return json({ ok: true });
    }
    if (body.action === "remove") {
      await db.from("push_subscriptions").delete().eq("endpoint", String(body.endpoint || "")).eq("user_id", u.user.id);
      return json({ ok: true });
    }
    await vapid();
    const { data: subs } = await db.from("push_subscriptions").select("*").eq("user_id", u.user.id);
    let sent = 0;
    for (const s of (subs || []) as Sub[]) if (await send(s, { ...MESSAGE, body: "Essai réussi : tes rappels arriveront ici." }) === "sent") sent++;
    return json({ sent });
  } catch (e) {
    console.error(e);
    return json({ error: "Erreur interne." }, 500);
  }
});
