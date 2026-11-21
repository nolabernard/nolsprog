// STÉROÏDE — envoi des rappels (notifications web).
// GET  ?vapid=1                 → clé publique d'envoi (créée au premier appel, gardée dans public.push_config).
// POST + x-cron-secret          → appel programmé toutes les 15 min : envoie les rappels dus.
// POST + Authorization: Bearer  → { test: true } : envoie un rappel d'essai aux appareils de l'utilisateur connecté.
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
const MESSAGE = { title: "STÉROÏDE", body: "C’est l’heure de ta séance. Ta prochaine séance t’attend.", url: "/nolsprog/" };

async function send(sub: Sub, payload = MESSAGE) {
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload), { TTL: 3600 });
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
  // Séances terminées dans les dernières 36 h : pas de rappel un jour où la séance est déjà faite.
  const users = [...new Set(list.map(s => s.user_id))];
  const trained = new Map<string, string[]>();
  if (users.length) {
    const { data: ws } = await db.from("workouts").select("user_id, ended_at").eq("status", "completed").gte("ended_at", new Date(now - 36 * 3600e3).toISOString()).in("user_id", users);
    for (const w of ws || []) {
      const tz = list.find(s => s.user_id === w.user_id)?.timezone || "Europe/Paris";
      trained.set(w.user_id, [...(trained.get(w.user_id) || []), localDate(Date.parse(w.ended_at), tz)]);
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const url = new URL(req.url);
    if (req.method === "GET" && url.searchParams.has("vapid")) return json({ publicKey: await vapid() });
    if (req.method !== "POST") return json({ error: "Méthode non prise en charge." }, 405);
    const secret = req.headers.get("x-cron-secret");
    if (secret) {
      if (secret !== await config("cron_secret")) return json({ error: "Refusé." }, 401);
      return json(await runSchedule());
    }
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: u } = token ? await db.auth.getUser(token) : { data: { user: null } };
    if (!u?.user) return json({ error: "Connexion requise." }, 401);
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
