import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Exit, Pool, Scope } from "effect"
import { AsyncLocalStorage } from "node:async_hooks"

// A fiber woken by another fiber must resume in its own async context, not
// the waker's. See https://github.com/Effect-TS/effect/issues/8581

const storage = new AsyncLocalStorage<string>()
const current = () => storage.getStore() ?? "none"

const runWithStore = <A, E>(store: string | undefined, effect: Effect.Effect<A, E>): Promise<A> =>
  store === undefined ? Effect.runPromise(effect) : storage.run(store, () => Effect.runPromise(effect))

// Reads the store on resumption and inside async work started afterwards.
const observe = Effect.gen(function*() {
  const resumed = current()
  const promise = yield* Effect.promise(async () => current())
  const timer = yield* Effect.callback<string>((resume) => {
    setTimeout(() => resume(Effect.succeed(current())), 1)
  })
  yield* Effect.sleep(1)
  const afterSleep = current()
  return { resumed, promise, timer, afterSleep }
})

const expected = (store: string) => ({ resumed: store, promise: store, timer: store, afterSleep: store })

describe("AsyncLocalStorage", () => {
  for (const waiterStore of [undefined, "waiter"]) {
    const label = waiterStore === undefined ? "without a store" : "with its own store"

    describe(`waiter ${label}`, () => {
      it("Deferred.await resumes in the awaiter's context", async () => {
        const deferred = Deferred.makeUnsafe<void>()
        const waiter = runWithStore(waiterStore, Effect.andThen(Deferred.await(deferred), observe))
        const completer = await runWithStore(
          "waker",
          Effect.sleep(5).pipe(
            Effect.andThen(Deferred.succeed(deferred, undefined)),
            Effect.andThen(Effect.sync(current))
          )
        )
        assert.strictEqual(completer, "waker")
        assert.deepStrictEqual(await waiter, expected(waiterStore ?? "none"))
      })

      it("Pool.get resumes in the waiter's context", async () => {
        const scope = Scope.makeUnsafe()
        try {
          const pool = await Effect.runPromise(
            Pool.make({ acquire: Effect.succeed("conn"), size: 1 }).pipe(
              // Borrow once so the item is available before the holder runs.
              Effect.tap((pool) => Effect.scoped(Pool.get(pool))),
              Scope.provide(scope)
            )
          )
          const holderAcquired = Deferred.makeUnsafe<string>()
          const holder = runWithStore(
            "waker",
            Effect.scoped(
              Pool.get(pool).pipe(
                Effect.andThen(Effect.sync(current)),
                Effect.tap((store) => Deferred.succeed(holderAcquired, store)),
                Effect.andThen(Effect.sleep(10)),
                Effect.andThen(Effect.sync(current))
              )
            )
          )
          assert.strictEqual(await Effect.runPromise(Deferred.await(holderAcquired)), "waker")
          const waiter = runWithStore(waiterStore, Effect.andThen(Effect.scoped(Pool.get(pool)), observe))
          assert.strictEqual(await holder, "waker")
          assert.deepStrictEqual(await waiter, expected(waiterStore ?? "none"))
        } finally {
          await Effect.runPromise(Scope.close(scope, Exit.void))
        }
      })
    })
  }
})
