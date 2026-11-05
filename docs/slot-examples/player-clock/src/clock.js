// The clock's text: the time and the date on two lines, from a Date. Pure, so a test can feed it any instant.

const DAYS = { es: ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"], en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] };
const MONTHS = {
  es: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};

const pad = (n) => String(n).padStart(2, "0");

/** "es" or "en" from the context's `lang` ("es-CO", "en-US"); anything else reads as Spanish. */
export function langOf(lang) {
  return typeof lang === "string" && lang.toLowerCase().startsWith("en") ? "en" : "es";
}

/**
 * `HH:mm` and the date on a second line: "21:05\nmar 4 nov" (Spanish) or "21:05\nTue Nov 4" (English). The device's local time, or
 * the time at [offset] minutes east of UTC ([offsetMinutes]) when it is not null.
 */
export function clockText(now, lang, offset = null) {
  const l = langOf(lang);
  const at = parts(now, offset);
  const time = `${pad(at.h)}:${pad(at.m)}`;
  const day = DAYS[l][at.wd];
  const month = MONTHS[l][at.mo];
  const date = l === "en" ? `${day} ${month} ${at.d}` : `${day} ${at.d} ${month}`;
  return `${time}\n${date}`;
}

/**
 * The minutes east of UTC a "timezone" setting asks for ("-5", "5.5"), or null for the device's own zone: "auto", empty, missing
 * or anything that is not a number between -12 and +14 hours. A fixed offset: it does not follow daylight saving time.
 */
export function offsetMinutes(setting) {
  if (setting === undefined || setting === null || setting === "" || setting === "auto") return null;
  const hours = Number(setting);
  return Number.isFinite(hours) && hours >= -12 && hours <= 14 ? Math.round(hours * 60) : null;
}

/** Hour, minute, weekday, month and day of [now] on the device's clock, or at [offset] minutes east of UTC when it is not null. */
function parts(now, offset) {
  if (offset === null) return { h: now.getHours(), m: now.getMinutes(), wd: now.getDay(), mo: now.getMonth(), d: now.getDate() };
  const t = new Date(now.getTime() + offset * 60000);
  return { h: t.getUTCHours(), m: t.getUTCMinutes(), wd: t.getUTCDay(), mo: t.getUTCMonth(), d: t.getUTCDate() };
}
