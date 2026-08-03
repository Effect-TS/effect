import { ClickhouseClient } from "@effect/sql-clickhouse"
import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { TestClock } from "effect/testing"
import * as Reactivity from "effect/unstable/reactivity/Reactivity"
import * as Statement from "effect/unstable/sql/Statement"
import { vi } from "vitest"

let closeCalls = 0

vi.mock("@clickhouse/client", () => ({
  createClient: () => ({
    exec: () => new Promise(() => {}),
    close: () => {
      closeCalls++
      return Promise.resolve()
    }
  })
}))

describe("ClickhouseClient", () => {
  it("preserves fractional JavaScript numbers in inferred parameters", () => {
    const sql = Statement.make(Effect.void as any, ClickhouseClient.makeCompiler(), [], undefined)
    const [query] = sql`SELECT ${1.5}`.compile()

    assert.strictEqual(query, "SELECT {p1: Float64}")
  })

  it.effect("closes the client when the connection check times out", () =>
    Effect.gen(function*() {
      closeCalls = 0
      const fiber = yield* Effect.forkDetach(
        ClickhouseClient.make({ url: "http://localhost:8123" }).pipe(Effect.scoped)
      )
      yield* Effect.yieldNow
      yield* TestClock.adjust("5 seconds")
      const result = fiber.pollUnsafe()

      assert.isDefined(result)
      assert.strictEqual(closeCalls, 1)
    }).pipe(Effect.provide(Reactivity.layer)))
})
