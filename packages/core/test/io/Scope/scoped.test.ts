import { Chunk } from "../../../src/collection/immutable/Chunk"
import { Effect } from "../../../src/io/Effect"
import { Ref } from "../../../src/io/Ref"
import { Action, resource } from "./test-utils"

describe("Scope", () => {
  describe("scoped", () => {
    it("runs finalizers when scope is closed", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(Chunk.empty<Action>()))
        .tap(({ ref }) =>
          Effect.scoped(
            resource(1, ref).flatMap((id) =>
              ref.update((chunk) => chunk.append(Action.Use(id)))
            )
          )
        )
        .flatMap(({ ref }) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([
        Action.Acquire(1),
        Action.Use(1),
        Action.Release(1)
      ])
    })
  })
})
