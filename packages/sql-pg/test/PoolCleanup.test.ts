import * as Reactivity from "@effect/experimental/Reactivity"
import { PgClient } from "@effect/sql-pg"
import { assert, it } from "@effect/vitest"
import { Effect, Exit } from "effect"
import * as Pg from "pg"
import { vi } from "vitest"

it.effect("closes each pool when its readiness probe fails", () =>
  Effect.gen(function*() {
    const query = vi.spyOn(Pg.Pool.prototype, "query").mockRejectedValue(new Error("probe failed"))
    const end = vi.spyOn(Pg.Pool.prototype, "end").mockResolvedValue(undefined)

    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        const exit = yield* Effect.exit(
          Effect.scoped(PgClient.make({}).pipe(Effect.provide(Reactivity.layer)))
        )
        assert.isTrue(Exit.isFailure(exit))
      }

      assert.strictEqual(query.mock.calls.length, 2)
      assert.strictEqual(end.mock.calls.length, 2)
      assert.deepStrictEqual(end.mock.contexts, query.mock.contexts)
    } finally {
      query.mockRestore()
      end.mockRestore()
    }
  }))
