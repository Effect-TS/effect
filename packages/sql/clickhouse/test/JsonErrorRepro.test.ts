import { ClickhouseClient } from "@effect/sql-clickhouse"
import { assert, it } from "@effect/vitest"
import { Effect, Exit } from "effect"
import * as Reactivity from "effect/unstable/reactivity/Reactivity"
import { vi } from "vitest"

vi.mock("@clickhouse/client", () => ({
  createClient: () => ({
    exec: () => Promise.resolve({}),
    close: () => Promise.resolve(),
    query: () => Promise.resolve({
      json: () => Promise.reject(new SyntaxError("invalid JSON response"))
    }),
    command: () => Promise.resolve({}),
    insert: () => Promise.resolve({})
  })
}))

it.effect("reports ClickHouse result decoding failures", () =>
  Effect.gen(function*() {
    const client = yield* ClickhouseClient.make({ url: "http://localhost:8123" })
    const exit = yield* Effect.exit(client`SELECT 1`)

    assert.isTrue(Exit.isFailure(exit))
  }).pipe(
    Effect.scoped,
    Effect.provide(Reactivity.layer)
  ))
