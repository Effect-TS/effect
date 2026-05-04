import { describe, it } from "@effect/vitest"
import { assertEquals, assertFalse, assertTrue, strictEqual } from "@effect/vitest/utils"
import * as Cause from "effect/Cause"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { pipe } from "effect/Function"
import * as Ref from "effect/Ref"

const disposable = (hook: () => void) => ({
  [Symbol.dispose]() {
    hook()
  }
})
const asyncDisposable = (hook: () => Promise<void>) => ({
  async [Symbol.asyncDispose]() {
    await hook()
  }
})

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
      assertEquals(Cause.failures(result), Chunk.of("use failed"))
      assertEquals(Cause.defects(result), Chunk.of(releaseDied))
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
      assertEquals(Cause.failures(result), Chunk.of("use failed"))
      assertEquals(Cause.defects(result), Chunk.of(releaseDied))
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
      assertEquals(Cause.defects(result), Chunk.of(useDied))
      assertTrue(released)
    }))
  it.effect("acquireDisposable - happy path", () =>
    Effect.gen(function*() {
      let disposed = false
      yield* Effect.succeed(
        disposable(() => {
          disposed = true
        })
      )
        .pipe(
          Effect.acquireDisposable,
          Effect.tap(() => assertFalse(disposed)),
          Effect.scoped
        )
      assertTrue(disposed)
    }))
  it.effect("acquireDisposable - happy path async", () =>
    Effect.gen(function*() {
      let disposed = false
      yield* Effect.succeed(
        asyncDisposable(() =>
          new Promise((resolve) => {
            disposed = true
            resolve()
          })
        )
      )
        .pipe(
          Effect.acquireDisposable,
          Effect.tap(() => assertFalse(disposed)),
          Effect.scoped
        )
      assertTrue(disposed)
    }))
  it.effect("acquireDisposable - error handling", () =>
    Effect.gen(function*() {
      const err = new Error("oh no!")
      const exit = yield* Effect.succeed(
        disposable(() => {
          throw err
        })
      )
        .pipe(
          Effect.acquireDisposable,
          Effect.scoped,
          Effect.exit
        )
      const result = yield* Exit.matchEffect(
        exit,
        {
          onFailure: Effect.succeed,
          onSuccess: () => Effect.fail("effect should have failed")
        }
      )
      assertEquals(Cause.defects(result), Chunk.of(err))
    }))
})
