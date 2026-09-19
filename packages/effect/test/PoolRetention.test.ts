import { execFile } from "node:child_process"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"

import { expect, it } from "@effect/vitest"
import { Effect, Exit, Pool, Scope } from "effect"
import { TestClock } from "effect/testing"

const execute = promisify(execFile)
const fixture = fileURLToPath(
  new URL("./fixtures/pool-retention.ts", import.meta.url)
)

// Run GC assertions in separate Node processes against the workspace source.
// Other runtimes still run the lifecycle tests below.
it.skipIf(process.versions.bun !== undefined || process.versions.deno !== undefined).each(
  [
    ["invalidated", 20, 20],
    ["failed", 20, 0],
    ["failed-during-cleanup", 1, 1],
    ["shutdown", 1, 1]
  ] as const
)(
  "collects %s pool payloads while the pool remains reachable",
  async (scenario, tracked, finalized) => {
    const { stdout } = await execute(
      process.execPath,
      ["--expose-gc", fixture, scenario],
      {
        timeout: 15_000
      }
    )
    expect(JSON.parse(stdout)).toEqual({ retained: 0, tracked, finalized })
  }
)

it("invalidating a busy item waits for its last lease and finalizes once", async () => {
  const owner = Scope.makeUnsafe()
  const first = Scope.makeUnsafe()
  const second = Scope.makeUnsafe()
  const finalized: Array<number> = []
  let acquired = 0
  try {
    const pool = await Effect.runPromise(
      Pool.makeWithTTL({
        acquire: Effect.acquireRelease(
          Effect.sync(() => ({ id: ++acquired })),
          (value) =>
            Effect.sync(() => {
              finalized.push(value.id)
            })
        ),
        min: 1,
        max: 2,
        concurrency: 2,
        timeToLive: "1 hour"
      }).pipe(Effect.provideService(Scope.Scope, owner))
    )
    const value = await Effect.runPromise(
      Pool.get(pool).pipe(Effect.provideService(Scope.Scope, first))
    )
    expect(
      await Effect.runPromise(
        Pool.get(pool).pipe(Effect.provideService(Scope.Scope, second))
      )
    ).toBe(value)
    await Effect.runPromise(Pool.invalidate(pool, value))
    expect(finalized).toEqual([])
    await Effect.runPromise(Scope.close(first, Exit.void))
    expect(finalized).toEqual([])
    await Effect.runPromise(Scope.close(second, Exit.void))
    expect(finalized).toEqual([value.id])
    expect(await Effect.runPromise(Effect.scoped(Pool.get(pool)))).not.toBe(
      value
    )
  } finally {
    await Effect.runPromise(Scope.close(first, Exit.void))
    await Effect.runPromise(Scope.close(second, Exit.void))
    await Effect.runPromise(Scope.close(owner, Exit.void))
  }
  expect(new Set(finalized).size).toBe(acquired)
  expect(finalized).toHaveLength(acquired)
})

it("usage TTL still retires excess items in allocation order without dropping below minimum", async () => {
  await Effect.runPromise(
    Effect.gen(function*() {
      let acquired = 0
      const finalized: Array<number> = []
      const pool = yield* Pool.makeWithTTL({
        acquire: Effect.acquireRelease(
          Effect.sync(() => ++acquired),
          (value) =>
            Effect.sync(() => {
              finalized.push(value)
            })
        ),
        min: 1,
        max: 3,
        timeToLive: "1 second"
      })
      const leases = [
        Scope.makeUnsafe(),
        Scope.makeUnsafe(),
        Scope.makeUnsafe()
      ]
      try {
        for (const lease of leases) {
          yield* Pool.get(pool).pipe(Effect.provideService(Scope.Scope, lease))
        }
        expect(acquired).toBe(3)
      } finally {
        for (const lease of leases) yield* Scope.close(lease, Exit.void)
      }
      yield* TestClock.adjust("1 second")
      expect(finalized).toEqual([1, 2])
      yield* TestClock.adjust("5 seconds")
      expect(finalized).toEqual([1, 2])
      expect(yield* Effect.scoped(Pool.get(pool))).toBe(3)
    }).pipe(Effect.scoped, Effect.provide(TestClock.layer()))
  )
})
