// STEROID — rappels : quand envoyer (pur, testé sous Node). Jours : 0 = lundi … 6 = dimanche.
export const WINDOW_MIN = 15;
export function localParts(ms, timeZone) {
  const f = new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' });
  const p = Object.fromEntries(f.formatToParts(new Date(ms)).map(x => [x.type, x.value]));
  const day = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(p.weekday);
  return { date: p.year + '-' + p.month + '-' + p.day, day, minutes: Number(p.hour) * 60 + Number(p.minute) };
}
function safeZone(tz) { try { new Intl.DateTimeFormat('en-GB', { timeZone: tz }); return tz; } catch { return 'Europe/Paris'; } }
// Rappel dû : activé, jour choisi, heure locale atteinte depuis moins de 15 min, pas déjà envoyé ce jour, pas de séance faite ce jour.
export function isDue(sub, now, trainedDates = []) {
  if (!sub || !sub.enabled) return false;
  const l = localParts(now, safeZone(sub.timezone || 'Europe/Paris'));
  if (!(sub.days || []).map(Number).includes(l.day)) return false;
  const target = Number(sub.hour) * 60 + Number(sub.minute || 0);
  if (l.minutes < target || l.minutes >= target + WINDOW_MIN) return false;
  if (sub.last_sent_on === l.date) return false;
  return !trainedDates.includes(l.date);
}
export function localDate(ms, tz) { return localParts(ms, safeZone(tz || 'Europe/Paris')).date; }
