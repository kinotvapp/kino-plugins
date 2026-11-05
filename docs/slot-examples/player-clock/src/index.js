// Player clock: an example of the player slot (apiVersion 23). One overlay text element in the top-right corner of the TV
// player shows the time and the date with the controls; Kino asks again every minute. The person dresses it in the plugin's
// settings: the time zone (the device's own by default), the size of the text, its colour, the pill behind it and where it sits.
// No network, no buttons.

import { clockText, offsetMinutes } from "./clock.js";

/** Letter colours and pill fills the settings offer; "auto" and "default" send nothing, so Kino draws its own. */
const COLORS = { white: "#FFFFFF", yellow: "#FFD54F", cyan: "#4DD0E1", green: "#81C784", orange: "#FFB74D", pink: "#F48FB1", black: "#000000" };
const BACKGROUNDS = { none: "#00000000", dark: "#000000B3", black: "#000000", white: "#FFFFFF" };

const setting = (key) => {
  try {
    return kino.config.get(key);
  } catch (e) {
    return undefined;
  }
};

/** A whole-dp nudge from a select's value ("-60", "24"); 0 for anything else. */
const nudge = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};

/** The slot's answer: the clock element's text and look, and when to ask again (a minute is the longest Kino allows). */
export async function playerSlot(context) {
  const item = { id: "clock", text: clockText(new Date(), context && context.lang, offsetMinutes(setting("timezone"))) };
  const size = setting("size");
  if (size && size !== "normal") item.size = size;
  const weight = setting("weight");
  if (weight && weight !== "auto") item.weight = weight;
  const color = COLORS[setting("color")];
  if (color) item.color = color;
  const background = BACKGROUNDS[setting("background")];
  if (background) item.background = background;
  const left = nudge(setting("left"));
  const top = nudge(setting("top"));
  if (left !== 0) item.left = left;
  if (top !== 0) item.top = top;
  return { items: [item], refreshMs: 60000 };
}

/** The slot has no button, so Kino never calls this; the capability still requires the export. */
export async function playerSlotAction() {
  return null;
}
