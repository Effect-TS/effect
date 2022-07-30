import { Action, resource } from "@effect/core/test/io/Scope/test-utils"

describe.concurrent("Scope", () => {
  describe.concurrent("scoped", () => {
    it("runs finalizers when scope is closed", () =>
      Do(($) => {
        const ref = $(Ref.make(Chunk.empty<Action>()))
        $(Effect.scoped(
          resource(1, ref).flatMap((id) => ref.update((chunk) => chunk.append(Action.Use(id))))
        ))
        const result = $(ref.get())
        assert.isTrue(
          result == Chunk(
            Action.Acquire(1),
            Action.Use(1),
            Action.Release(1)
          )
        )
      }).unsafeRunPromise())
  })
})
