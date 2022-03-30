import { List } from "../../../src/collection/immutable/List"
import { Effect } from "../../../src/io/Effect"
import { Promise } from "../../../src/io/Promise"
import { Ref } from "../../../src/io/Ref"
import { Stream } from "../../../src/stream/Stream"

describe("Stream", () => {
  describe("unwrapScoped", () => {
    it("unwraps a scoped stream", async () => {
      function stream(ref: Ref<List<string>>, promise: Promise<never, void>) {
        return Stream.unwrapScoped(
          Effect.acquireRelease(
            ref.update((list) => list.prepend("acquire outer")),
            () => ref.update((list) => list.prepend("release outer"))
          ) >
            Effect.suspendSucceed(promise.succeed(undefined) > Effect.never) >
            Effect.succeed(Stream(1, 2, 3))
        )
      }

      const program = Effect.Do()
        .bind("ref", () => Ref.make(List.empty<string>()))
        .bind("promise", () => Promise.make<never, void>())
        .bind("fiber", ({ promise, ref }) => stream(ref, promise).runDrain().fork())
        .tap(({ promise }) => promise.await())
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ ref }) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result.reverse().toArray()).toEqual(["acquire outer", "release outer"])
    })
  })
})
