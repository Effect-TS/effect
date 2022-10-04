import { Action, resource } from "@effect/core/test/io/Scope/test-utils"

describe.concurrent("Scope", () => {
  describe.concurrent("parallelFinalizers", () => {
    it("runs finalizers when scope is closed", () =>
      Do(($) => {
        const ref = $(Ref.make(Chunk.empty<Action>()))
        $(
          Effect.scoped(
            Effect.parallelFinalizers(resource(1, ref).zipPar(resource(2, ref)))
              .flatMap(([resource1, resource2]) =>
                ref
                  .update((chunk) => chunk.append(Action.Use(resource1)))
                  .zipPar(ref.update((chunk) => chunk.append(Action.Use(resource2))))
              )
          )
        )
        const result = $(ref.get)
        assert.isTrue(result.take(2).find((action) => action == Action.Acquire(1)).isSome())
        assert.isTrue(result.take(2).find((action) => action == Action.Acquire(2)).isSome())
        assert.isTrue(result.drop(2).take(2).find((action) => action == Action.Use(1)).isSome())
        assert.isTrue(result.drop(2).take(2).find((action) => action == Action.Use(2)).isSome())
        assert.isTrue(result.drop(4).take(2).find((action) => action == Action.Release(1)).isSome())
        assert.isTrue(result.drop(4).take(2).find((action) => action == Action.Release(2)).isSome())
      }).unsafeRunPromise())

    it("runs finalizers in parallel", () =>
      Do(($) => {
        const deferred = $(Deferred.make<never, void>())
        const result = $(
          Effect.scoped(
            Effect.parallelFinalizers(
              Effect.addFinalizer(deferred.succeed(undefined)) >
                Effect.addFinalizer(deferred.await)
            )
          ).unit
        )
        assert.isUndefined(result)
      }).unsafeRunPromise())
  })
})
