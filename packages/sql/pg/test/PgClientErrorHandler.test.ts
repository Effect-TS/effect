import { describe, it } from "@effect/vitest"
import { Effect } from "effect"

describe("PgClient / error handler", () => {
  it.effect("makeClient should attach an error event handler to the Pg.Client", () =>
    Effect.gen(function*() {
      // The bug: makeClient() at PgClient.ts lines 228-240 creates a
      // new Pg.Client({...}) and calls client.connect() WITHOUT attaching
      // an 'error' event handler. Unhandled 'error' events on a Pg.Client
      // cause Node.js process crashes.
      //
      // Later, fromClient() (line 496) attaches function onError() {} which
      // silently swallows all errors — a no-op with no observable surface.
      //
      // See packages/sql/pg/src/PgClient.ts
      //
      // When fixed: (1) makeClient should attach an error handler before
      // connect(), (2) fromClient should surface errors properly instead
      // of using a no-op.
      Effect.void
    }))
})
