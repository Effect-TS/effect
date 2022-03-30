import { Chunk } from "../../../src/collection/immutable/Chunk"
import { constTrue } from "../../../src/data/Function"
import { Effect } from "../../../src/io/Effect"
import { Promise } from "../../../src/io/Promise"
import { Ref } from "../../../src/io/Ref"
import { Action, resource } from "./test-utils"

describe("Scope", () => {
  describe("parallelFinalizers", () => {
    it("runs finalizers when scope is closed", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(Chunk.empty<Action>()))
        .tap(({ ref }) =>
          Effect.scoped(
            Effect.parallelFinalizers(
              resource(1, ref).zipPar(resource(2, ref))
            ).flatMap(({ tuple: [resource1, resource2] }) =>
              ref
                .update((chunk) => chunk.append(Action.Use(resource1)))
                .zipPar(ref.update((chunk) => chunk.append(Action.Use(resource2))))
            )
          )
        )
        .flatMap(({ ref }) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result.toArray().slice(0, 2)).toContainEqual(Action.Acquire(1))
      expect(result.toArray().slice(0, 2)).toContainEqual(Action.Acquire(2))
      expect(result.toArray().slice(2, 4)).toContainEqual(Action.Use(1))
      expect(result.toArray().slice(2, 4)).toContainEqual(Action.Use(2))
      expect(result.toArray().slice(4, 6)).toContainEqual(Action.Release(1))
      expect(result.toArray().slice(4, 6)).toContainEqual(Action.Release(2))
    })

    it("runs finalizers in parallel", async () => {
      const program = Effect.Do()
        .bind("promise", () => Promise.make<never, void>())
        .tap(({ promise }) =>
          Effect.scoped(
            Effect.parallelFinalizers(
              Effect.addFinalizer(promise.succeed(undefined)) >
                Effect.addFinalizer(promise.await())
            )
          )
        )
        .map(constTrue)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })
  })
})
