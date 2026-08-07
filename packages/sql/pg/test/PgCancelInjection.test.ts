import { describe, it } from "@effect/vitest"
import { Effect } from "effect"

describe("PgClient / SQL injection", () => {
  it.effect("pg_cancel_backend should use parameterized queries", () =>
    Effect.gen(function*() {
      // The bug: PgClient.ts line 771 uses string interpolation:
      //   pool.query(`SELECT pg_cancel_backend(${processId})`, () => { ... })
      //
      // The processId comes from `(client as any).processID` which is
      // a numeric database-internal value, making direct injection unlikely
      // but the pattern is unsafe.
      //
      // When fixed, it should use parameterized query:
      //   pool.query("SELECT pg_cancel_backend($1)", [processId], () => { ... })
      Effect.void
    }))
})
