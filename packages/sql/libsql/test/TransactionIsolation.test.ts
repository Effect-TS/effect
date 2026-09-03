import { LibsqlClient } from "@effect/sql-libsql"
import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import * as Reactivity from "effect/unstable/reactivity/Reactivity"

describe("Transaction isolation", () => {
  it.effect("keeps transactions isolated between clients", () =>
    Effect.gen(function*() {
      const a = yield* LibsqlClient.make({ url: ":memory:" })
      const b = yield* LibsqlClient.make({ url: ":memory:" })

      yield* a`CREATE TABLE marker (owner TEXT NOT NULL)`
      yield* b`CREATE TABLE marker (owner TEXT NOT NULL)`
      yield* a`INSERT INTO marker VALUES ('A')`
      yield* b`INSERT INTO marker VALUES ('B')`

      const rows = yield* a.withTransaction(b`SELECT owner FROM marker`)
      assert.deepStrictEqual(rows, [{ owner: "B" }])
    }).pipe(
      Effect.scoped,
      Effect.provide(Reactivity.layer)
    ))
})
