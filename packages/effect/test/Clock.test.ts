import { assert, describe, it, vi } from "@effect/vitest"
import { Clock, Effect } from "effect"

describe.sequential("Clock", () => {
  it.live("keeps wall time aligned while exposing the monotonic source", () =>
    Effect.acquireUseRelease(
      Effect.sync(() => {
        let wallMillis = 1_000_000
        let monotonicNanos = 5_000_000_000n
        const dateNow = vi.spyOn(Date, "now").mockImplementation(() => wallMillis)
        const hrtime = vi.spyOn(process.hrtime, "bigint").mockImplementation(() => monotonicNanos)
        return {
          dateNow,
          hrtime,
          readWallMillis: () => wallMillis,
          readMonotonicNanos: () => monotonicNanos,
          updateWallMillis: (f: (value: number) => number) => {
            wallMillis = f(wallMillis)
          },
          updateMonotonicNanos: (f: (value: bigint) => bigint) => {
            monotonicNanos = f(monotonicNanos)
          }
        }
      }),
      (state) =>
        Effect.gen(function*() {
          const clock = yield* Clock.Clock
          const nanosPerMilli = 1_000_000n

          assert.strictEqual(
            clock.currentTimeNanosUnsafe(),
            BigInt(state.readWallMillis()) * nanosPerMilli
          )
          assert.strictEqual(clock.monotonicTimeNanosUnsafe(), state.readMonotonicNanos())

          state.updateWallMillis((value) => value + 250)
          state.updateMonotonicNanos((value) => value + 250_000_000n)
          assert.strictEqual(
            clock.currentTimeNanosUnsafe(),
            BigInt(state.readWallMillis()) * nanosPerMilli
          )

          state.updateWallMillis((value) => value + 5_000)
          const beforeSuspend = clock.monotonicTimeNanosUnsafe()
          assert.strictEqual(
            clock.currentTimeNanosUnsafe(),
            BigInt(state.readWallMillis()) * nanosPerMilli
          )
          assert.strictEqual(clock.monotonicTimeNanosUnsafe(), beforeSuspend)

          state.updateWallMillis((value) => value - 3_000)
          state.updateMonotonicNanos((value) => value + 100_000_000n)
          assert.strictEqual(
            clock.currentTimeNanosUnsafe(),
            BigInt(state.readWallMillis()) * nanosPerMilli
          )
          assert.isTrue(clock.monotonicTimeNanosUnsafe() > beforeSuspend)
        }),
      (state) =>
        Effect.sync(() => {
          state.dateNow.mockRestore()
          state.hrtime.mockRestore()
        })
    ))
})
