import { execFile } from "node:child_process"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"

import { assert, it } from "@effect/vitest"
import { Effect, Exit, Pool, Scope } from "effect"
import { TestClock } from "effect/testing"

const execute = promisify(execFile)
const fixture = fileURLToPath(new URL("./fixtures/pool-retention.ts", import.meta.url))

// Run GC assertions in separate Node processes against the workspace source.
// Other runtimes still run the lifecycle tests below.
for (
  const [scenario, tracked, finalized] of [
    ["invalidated", 20, 20],
    ["failed", 20, 0],
    ["failed-during-cleanup", 1, 1],
    ["shutdown", 1, 1]
  ] as const
) {
  it.live.skipIf(process.versions.bun !== undefined || process.versions.deno !== undefined)(
    `collects ${scenario} pool payloads while the pool remains reachable`,
    () =>
      Effect.gen(function*() {
        const { stdout } = yield* Effect.promise(() =>
          execute(process.execPath, ["--expose-gc", fixture, scenario], { timeout: 15_000 })
        )
        assert.deepStrictEqual(JSON.parse(stdout), { retained: 0, tracked, finalized })
      }),
    20_000
  )
}

it.effect("invalidating a busy item waits for its last lease and finalizes once", () =>
  Effect.gen(function*() {
    const owner = yield* Scope.make()
    const first = yield* Scope.make()
    const second = yield* Scope.make()
    const finalized: Array<number> = []
    let acquired = 0
    try {
      const pool = yield* Scope.provide(
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
        }),
        owner
      )
      const value = yield* Scope.provide(Pool.get(pool), first)
      assert.strictEqual(yield* Scope.provide(Pool.get(pool), second), value)
      yield* Pool.invalidate(pool, value)
      assert.deepStrictEqual(finalized, [])
      yield* Scope.close(first, Exit.void)
      assert.deepStrictEqual(finalized, [])
      yield* Scope.close(second, Exit.void)
      assert.deepStrictEqual(finalized, [value.id])
      assert.notStrictEqual(yield* Effect.scoped(Pool.get(pool)), value)
    } finally {
      yield* Scope.close(first, Exit.void)
      yield* Scope.close(second, Exit.void)
      yield* Scope.close(owner, Exit.void)
    }
    assert.strictEqual(new Set(finalized).size, acquired)
    assert.lengthOf(finalized, acquired)
  }))

it.effect("usage TTL still retires excess items in allocation order without dropping below minimum", () =>
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
    const leases = [yield* Scope.make(), yield* Scope.make(), yield* Scope.make()]
    try {
      for (const lease of leases) {
        yield* Scope.provide(Pool.get(pool), lease)
      }
      assert.strictEqual(acquired, 3)
    } finally {
      for (const lease of leases) yield* Scope.close(lease, Exit.void)
    }
    yield* TestClock.adjust("1 second")
    assert.deepStrictEqual(finalized, [1, 2])
    yield* TestClock.adjust("5 seconds")
    assert.deepStrictEqual(finalized, [1, 2])
    assert.strictEqual(yield* Effect.scoped(Pool.get(pool)), 3)
  }))
