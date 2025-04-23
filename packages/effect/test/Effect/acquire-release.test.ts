import { describe, it } from "@effect/vitest"
import { assertTrue, strictEqual } from "@effect/vitest/utils"
import * as Cause from "effect/Cause"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import { equals } from "effect/Equal"
import * as Exit from "effect/Exit"
import { pipe } from "effect/Function"
import * as Ref from "effect/Ref"

describe("Effect", () => {
  it.effect("acquireUseRelease - happy path", () =>
    Effect.gen(function*() {
      const release = yield* (Ref.make(false))
      const result = yield* (
        Effect.acquireUseRelease(
          Effect.succeed(42),
          (n) => Effect.succeed(n + 1),
          () => Ref.set(release, true)
        )
      )
      const released = yield* (Ref.get(release))
      strictEqual(result, 43)
      assertTrue(released)
    }))
  it.effect("acquireUseRelease - happy path + disconnect", () =>
    Effect.gen(function*() {
      const release = yield* (Ref.make(false))
      const result = yield* pipe(
        Effect.acquireUseRelease(
          Effect.succeed(42),
          (n) => Effect.succeed(n + 1),
          () => Ref.set(release, true)
        ),
        Effect.disconnect
      )
      const released = yield* (Ref.get(release))
      strictEqual(result, 43)
      assertTrue(released)
    }))
  it.effect("acquireUseRelease - error handling", () =>
    Effect.gen(function*() {
      const releaseDied = new Cause.RuntimeException("release died")
      const exit = yield* pipe(
        Effect.acquireUseRelease(
          Effect.succeed(42),
          () => Effect.fail("use failed"),
          () => Effect.die(releaseDied)
        ),
        Effect.exit
      )
      const result = yield* pipe(
        exit,
        Exit.matchEffect({ onFailure: Effect.succeed, onSuccess: () => Effect.fail("effect should have failed") })
      )
      assertTrue(equals(Cause.failures(result), Chunk.of("use failed")))
      assertTrue(equals(Cause.defects(result), Chunk.of(releaseDied)))
    }))
  it.effect("acquireUseRelease - error handling + disconnect", () =>
    Effect.gen(function*() {
      const releaseDied = new Cause.RuntimeException("release died")
      const exit = yield* pipe(
        Effect.acquireUseRelease(
          Effect.succeed(42),
          () => Effect.fail("use failed"),
          () => Effect.die(releaseDied)
        ),
        Effect.disconnect,
        Effect.exit
      )
      const result = yield* pipe(
        exit,
        Exit.matchEffect({
          onFailure: Effect.succeed,
          onSuccess: () => Effect.fail("effect should have failed")
        })
      )
      assertTrue(equals(Cause.failures(result), Chunk.of("use failed")))
      assertTrue(equals(Cause.defects(result), Chunk.of(releaseDied)))
    }))
  it.effect("acquireUseRelease - beast mode error handling + disconnect", () =>
    Effect.gen(function*() {
      const useDied = new Cause.RuntimeException("use died")
      const release = yield* (Ref.make(false))
      const exit = yield* (
        pipe(
          Effect.acquireUseRelease(
            Effect.succeed(42),
            (): Effect.Effect<unknown, unknown> => {
              throw useDied
            },
            () => Ref.set(release, true)
          ),
          Effect.disconnect,
          Effect.exit
        )
      )
      const result = yield* (
        pipe(
          exit,
          Exit.matchEffect({
            onFailure: Effect.succeed,
            onSuccess: () => Effect.fail("effect should have failed")
          })
        )
      )
      const released = yield* (Ref.get(release))
      assertTrue(equals(Cause.defects(result), Chunk.of(useDied)))
      assertTrue(released)
    }))
})
