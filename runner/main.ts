// The runner entry point — what Deno Deploy runs.
//
// Two always-on jobs share one KV store:
//   • a cron every 7 minutes that advances every active ride by one beat, and
//   • an HTTP server that the frontend calls to start/stop/inspect rides.
//
// A cron fire and an HTTP request are both cold starts as far as a ride is
// concerned; KV is the ride's memory between them (see store.ts / run.ts).

import { handle } from "./api.ts";
import { tickAll } from "./run.ts";

const kv = await Deno.openKv();

// Every 7 minutes: step each active ride once. Wrapped so a bad tick logs and is
// forgotten rather than killing the cron. (A 15-minute window ticks ~2 times
// while HOLDING, but store.ts only writes KV when something actually changed.)
// The 7-minute cadence keeps KV writes well under the free-tier daily limit.
Deno.cron("tick-rides", "*/7 * * * *", async () => {
  try {
    // Stamp "the cron is alive" first, before any work — so /debug can show the
    // heartbeat even if a tick later throws. (Cheap: one KV write every 7 min.)
    await kv.set(["meta", "lastCron"], Math.floor(Date.now() / 1000));
    await tickAll(kv);
  } catch (err) {
    console.error("tick-rides cron failed:", err);
  }
});

// The HTTP API for the frontend.
Deno.serve((req) => handle(req, kv));
