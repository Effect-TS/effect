import { EntityKeepAliveHandler, makeEntityKeepAlive } from "@effect/platform-cloudflare/internal/entityKeepAlive"
import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Fiber } from "effect"
import { TestClock } from "effect/testing"
import { EntityResource } from "effect/unstable/cluster"

const makeFixture = Effect.gen(function*() {
  const started = yield* Deferred.make<void>()
  let keepAlive!: ReturnType<typeof makeEntityKeepAlive>
  keepAlive = makeEntityKeepAlive(() => {
    Deferred.doneUnsafe(started, Effect.void)
    return Effect.runPromise(keepAlive.await)
  })
  return { keepAlive, started }
})

const provideKeepAlive = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  keepAlive: ReturnType<typeof makeEntityKeepAlive>
) => Effect.provideService(effect, EntityKeepAliveHandler, keepAlive.update) as Effect.Effect<A, E, never>

describe("EntityKeepAlive", () => {
  it.effect("keeps the pin until the last holder releases", () =>
    Effect.gen(function*() {
      const { keepAlive, started } = yield* makeFixture
      yield* keepAlive.update(true)
      yield* Deferred.await(started)
      yield* keepAlive.update(true)

      assert.strictEqual(keepAlive.holderCount(), 2)
      const waiter = yield* Effect.forkChild(keepAlive.await)
      yield* keepAlive.update(false)
      assert.strictEqual(keepAlive.holderCount(), 1)

      yield* keepAlive.update(false)
      yield* Fiber.join(waiter)
      assert.strictEqual(keepAlive.holderCount(), 0)
    }))

  it.effect("releases an EntityResource pin after its idle TTL", () =>
    Effect.gen(function*() {
      const { keepAlive, started } = yield* makeFixture
      const resource = yield* provideKeepAlive(
        EntityResource.make({
          acquire: Effect.succeed("resource"),
          idleTimeToLive: "1 second"
        }),
        keepAlive
      )

      yield* Effect.scoped(resource.get)
      yield* Deferred.await(started)
      assert.strictEqual(keepAlive.holderCount(), 1)

      yield* TestClock.adjust("999 millis")
      assert.strictEqual(keepAlive.holderCount(), 1)
      yield* TestClock.adjust("1 millis")
      assert.strictEqual(keepAlive.holderCount(), 0)
    }).pipe(Effect.scoped))

  it.effect("releases an EntityResource pin when it is closed", () =>
    Effect.gen(function*() {
      const { keepAlive, started } = yield* makeFixture
      const resource = yield* provideKeepAlive(
        EntityResource.make({ acquire: Effect.succeed("resource") }),
        keepAlive
      )

      yield* Effect.scoped(resource.get)
      yield* Deferred.await(started)
      assert.strictEqual(keepAlive.holderCount(), 1)

      yield* resource.close
      assert.strictEqual(keepAlive.holderCount(), 0)
    }).pipe(Effect.scoped))
})
