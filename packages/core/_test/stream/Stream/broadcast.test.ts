import { List } from "../../../src/collection/immutable/List"
import { Effect } from "../../../src/io/Effect"
import { Promise } from "../../../src/io/Promise"
import { Ref } from "../../../src/io/Ref"
import { Stream } from "../../../src/stream/Stream"

describe("Stream", () => {
  describe("broadcast", () => {
    it("values", async () => {
      const program = Effect.scoped(
        Stream.range(0, 5)
          .broadcast(2, 12)
          .flatMap((streams) =>
            Effect.struct({
              out1: streams
                .unsafeGet(0)!
                .runCollect()
                .map((chunk) => chunk.toArray()),
              out2: streams
                .unsafeGet(1)!
                .runCollect()
                .map((chunk) => chunk.toArray()),
              expected: Effect.succeed(List.range(0, 5).toArray())
            })
          )
      )

      const { expected, out1, out2 } = await program.unsafeRunPromise()

      expect(out1).toEqual(expected)
      expect(out2).toEqual(expected)
    })

    it("errors", async () => {
      const program = Effect.scoped(
        (Stream.range(0, 1) + Stream.fail("boom")).broadcast(2, 12).flatMap((streams) =>
          Effect.struct({
            out1: streams
              .unsafeGet(0)!
              .runCollect()
              .map((chunk) => chunk.toArray())
              .either(),
            out2: streams
              .unsafeGet(1)!
              .runCollect()
              .map((chunk) => chunk.toArray())
              .either(),
            expected: Effect.left("boom")
          })
        )
      )

      const { expected, out1, out2 } = await program.unsafeRunPromise()

      expect(out1).toEqual(expected)
      expect(out2).toEqual(expected)
    })

    it("backPressure", async () => {
      const program = Effect.scoped(
        Stream.range(0, 5)
          .flatMap((n) => Stream.succeed(n))
          .broadcast(2, 2)
          .flatMap((streams) =>
            Effect.Do()
              .bind("ref", () => Ref.make(List.empty<number>()))
              .bind("latch", () => Promise.make<never, void>())
              .bind("fib", ({ latch, ref }) =>
                streams
                  .unsafeGet(0)!
                  .tap(
                    (n) =>
                      ref.update((list) => list.prepend(n)) >
                      Effect.when(n === 1, latch.succeed(undefined))
                  )
                  .runDrain()
                  .fork()
              )
              .tap(({ latch }) => latch.await())
              .bind("snapshot1", ({ ref }) => ref.get())
              .tap(() => streams.unsafeGet(1)!.runDrain())
              .tap(({ fib }) => fib.await())
              .bind("snapshot2", ({ ref }) => ref.get())
          )
      )

      const { snapshot1, snapshot2 } = await program.unsafeRunPromise()

      expect(snapshot1.toArray()).toEqual([1, 0])
      expect(snapshot2.toArray()).toEqual([4, 3, 2, 1, 0])
    })

    it("unsubscribe", async () => {
      const program = Effect.scoped(
        Stream.range(0, 5)
          .broadcast(2, 2)
          .flatMap(
            (streams) =>
              Effect.scoped(streams.unsafeGet(0)!.toPull().ignore()) >
              streams.unsafeGet(1)!.runCollect()
          )
      )

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([0, 1, 2, 3, 4])
    })
  })
})
