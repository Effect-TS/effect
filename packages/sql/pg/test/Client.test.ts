import { PgClient } from "@effect/sql-pg"
import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import * as Reactivity from "effect/unstable/reactivity/Reactivity"
import * as Pg from "pg"
import { vi } from "vitest"

vi.mock("pg", { spy: true })

describe("PgClient", () => {
  it.effect("enables pipeline mode by default for pools and supports opting out", () =>
    Effect.acquireUseRelease(
      Effect.sync(() => ({
        query: vi.spyOn(Pg.Pool.prototype, "query").mockImplementation(() => Promise.resolve({} as any)),
        end: vi.spyOn(Pg.Pool.prototype, "end").mockResolvedValue(undefined)
      })),
      () =>
        Effect.gen(function*() {
          const defaultClient = yield* PgClient.make({})
          const noPipelineClient = yield* PgClient.make({ pipeline: false })

          const calls = vi.mocked(Pg.Pool).mock.calls.slice(-2)
          assert.strictEqual(calls[0][0]?.pipeline, true)
          assert.strictEqual(calls[1][0]?.pipeline, false)
          assert.strictEqual(defaultClient.config.pipeline, true)
          assert.strictEqual(noPipelineClient.config.pipeline, false)
        }).pipe(Effect.provide(Reactivity.layer)),
      ({ end, query }) =>
        Effect.sync(() => {
          query.mockRestore()
          end.mockRestore()
        })
    ))

  it.effect("enables pipeline mode by default for clients and supports opting out", () =>
    Effect.acquireUseRelease(
      Effect.sync(() => ({
        connect: vi.spyOn(Pg.Client.prototype, "connect").mockResolvedValue(undefined),
        end: vi.spyOn(Pg.Client.prototype, "end").mockResolvedValue(undefined)
      })),
      () =>
        Effect.gen(function*() {
          const defaultClient = yield* PgClient.makeClient({})
          const noPipelineClient = yield* PgClient.makeClient({ pipeline: false })

          const calls = vi.mocked(Pg.Client).mock.calls.slice(-2)
          assert.strictEqual(typeof calls[0][0] === "string" ? undefined : calls[0][0]?.pipeline, true)
          assert.strictEqual(typeof calls[1][0] === "string" ? undefined : calls[1][0]?.pipeline, false)
          assert.strictEqual(defaultClient.config.pipeline, true)
          assert.strictEqual(noPipelineClient.config.pipeline, false)
        }).pipe(Effect.provide(Reactivity.layer)),
      ({ connect, end }) =>
        Effect.sync(() => {
          connect.mockRestore()
          end.mockRestore()
        })
    ))
})
