import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Exit, Fiber } from "effect"
import { ResourceMap } from "effect/cluster/internal/resourceMap"

describe("ResourceMap", () => {
  it.effect("closes a failed lookup scope", () =>
    Effect.scoped(Effect.gen(function*() {
      let finalized = 0
      const map = yield* ResourceMap.make((_key: string) =>
        Effect.gen(function*() {
          yield* Effect.addFinalizer(() => Effect.sync(() => finalized++))
          return yield* Effect.fail("failed")
        })
      )
      yield* Effect.exit(map.get("key"))
      assert.strictEqual(finalized, 1)
    })))

  describe("interruption", () => {
    it.effect("interrupting the first get keeps the lookup alive for the remaining get", () =>
      Effect.scoped(Effect.gen(function*() {
        let lookups = 0
        let interrupted = false
        const started = yield* Deferred.make<void>()
        const release = yield* Deferred.make<void>()
        const map = yield* ResourceMap.make((_key: string) =>
          Effect.gen(function*() {
            lookups++
            yield* Deferred.succeed(started, void 0)
            yield* Deferred.await(release)
            return lookups
          }).pipe(Effect.onInterrupt(() =>
            Effect.sync(() => {
              interrupted = true
            })
          ))
        )

        const first = yield* Effect.forkChild(map.get("key"), { startImmediately: true })
        yield* Deferred.await(started)
        const second = yield* Effect.forkChild(map.get("key"), { startImmediately: true })
        yield* Fiber.interrupt(first)
        assert.isFalse(interrupted)

        yield* Deferred.succeed(release, void 0)
        assert.deepStrictEqual(yield* Fiber.await(second), Exit.succeed(1))
        assert.strictEqual(yield* map.get("key"), 1)
        assert.strictEqual(lookups, 1)
      })))

    it.effect("interrupting every get interrupts the lookup and the next get starts fresh", () =>
      Effect.scoped(Effect.gen(function*() {
        let lookups = 0
        const started = yield* Deferred.make<void>()
        const interrupted = yield* Deferred.make<void>()
        const map = yield* ResourceMap.make((_key: string) =>
          Effect.suspend(() => {
            if (++lookups > 1) return Effect.succeed(lookups)
            return Deferred.succeed(started, void 0).pipe(
              Effect.andThen(Effect.never),
              Effect.onInterrupt(() => Deferred.succeed(interrupted, void 0))
            )
          })
        )

        const first = yield* Effect.forkChild(map.get("key"), { startImmediately: true })
        yield* Deferred.await(started)
        const second = yield* Effect.forkChild(map.get("key"), { startImmediately: true })
        yield* Fiber.interrupt(first)
        assert.isFalse(yield* Deferred.isDone(interrupted))
        yield* Fiber.interrupt(second)
        yield* Deferred.await(interrupted)

        assert.strictEqual(yield* map.get("key"), 2)
        assert.strictEqual(lookups, 2)
      })))

    it.effect("a get made while an abandoned lookup is finalizing starts fresh", () =>
      Effect.scoped(Effect.gen(function*() {
        let lookups = 0
        const started = yield* Deferred.make<void>()
        const finalizing = yield* Deferred.make<void>()
        const finishFinalizer = yield* Deferred.make<void>()
        const map = yield* ResourceMap.make((_key: string) =>
          Effect.suspend(() => {
            if (++lookups > 1) return Effect.succeed(lookups)
            return Deferred.succeed(started, void 0).pipe(
              Effect.andThen(Effect.never),
              Effect.onInterrupt(() =>
                Deferred.succeed(finalizing, void 0).pipe(Effect.andThen(Deferred.await(finishFinalizer)))
              )
            )
          })
        )

        const owner = yield* Effect.forkChild(map.get("key"), { startImmediately: true })
        yield* Deferred.await(started)
        const interruptOwner = yield* Effect.forkChild(Fiber.interrupt(owner), { startImmediately: true })
        yield* Deferred.await(finalizing)
        const fresh = yield* Effect.forkChild(map.get("key"), { startImmediately: true })
        yield* Deferred.succeed(finishFinalizer, void 0)
        yield* Fiber.join(interruptOwner)

        assert.deepStrictEqual(yield* Fiber.await(fresh), Exit.succeed(2))
      })))

    it.effect("an abandoned lookup does not remove a replacement entry", () =>
      Effect.scoped(Effect.gen(function*() {
        let lookups = 0
        const started = yield* Deferred.make<void>()
        const release = yield* Deferred.make<void>()
        const map = yield* ResourceMap.make((_key: string) =>
          Effect.suspend(() => {
            const lookup = ++lookups
            if (lookup === 1) return Deferred.succeed(started, void 0).pipe(Effect.andThen(Effect.never))
            return Deferred.await(release).pipe(Effect.as(lookup))
          })
        )

        const abandoned = yield* Effect.forkChild(map.get("key"), { startImmediately: true })
        yield* Deferred.await(started)
        yield* map.remove("key")
        const replacement = yield* Effect.forkChild(map.get("key"), { startImmediately: true })
        yield* Fiber.interrupt(abandoned)
        const joiner = yield* Effect.forkChild(map.get("key"), { startImmediately: true })

        yield* Deferred.succeed(release, void 0)
        assert.deepStrictEqual(yield* Fiber.await(replacement), Exit.succeed(2))
        assert.deepStrictEqual(yield* Fiber.await(joiner), Exit.succeed(2))
        assert.strictEqual(lookups, 2)
      })))
  })
})
