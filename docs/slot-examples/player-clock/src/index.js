// Player clock: an example of the player slot (apiVersion 23). One fixed text element in the top-right corner of the TV
// player shows the time and the date; Kino asks again every minute. No network, no state, no buttons.

import { clockText } from "./clock.js";

/** The slot's answer: the clock element's text and when to ask again (a minute is the longest Kino allows). */
export async function playerSlot(context) {
  return { items: [{ id: "clock", text: clockText(new Date(), context && context.lang) }], refreshMs: 60000 };
}

/** The slot has no button, so Kino never calls this; the capability still requires the export. */
export async function playerSlotAction() {
  return null;
}
