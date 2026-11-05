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

/** `HH:mm` and the date on a second line: "21:05\nmar 4 nov" (Spanish) or "21:05\nTue Nov 4" (English). Local time. */
export function clockText(now, lang) {
  const l = langOf(lang);
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const day = DAYS[l][now.getDay()];
  const month = MONTHS[l][now.getMonth()];
  const date = l === "en" ? `${day} ${month} ${now.getDate()}` : `${day} ${now.getDate()} ${month}`;
  return `${time}\n${date}`;
}
