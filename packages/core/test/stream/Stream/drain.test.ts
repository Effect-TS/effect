import { List } from "../../../src/collection/immutable/List"
import { Either } from "../../../src/data/Either"
import { constFalse, constTrue } from "../../../src/data/Function"
import { RuntimeError } from "../../../src/io/Cause"
import { Effect } from "../../../src/io/Effect"
import { Exit } from "../../../src/io/Exit"
import { Promise } from "../../../src/io/Promise"
import { Ref } from "../../../src/io/Ref"
import { Stream } from "../../../src/stream/Stream"

describe("Stream", () => {
  describe("drain", () => {
    it("drain", async () => {
      const program = Ref.make(List.empty<number>())
        .tap((ref) =>
          Stream.range(0, 10)
            .mapEffect((n) => ref.update((list) => list.prepend(n)))
            .drain()
            .runDrain()
        )
        .flatMap((ref) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result.reverse().toArray()).toEqual(List.range(0, 10).toArray())
    })

    it("isn't too eager", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .bind("res", ({ ref }) =>
          (Stream(1).tap((n) => ref.set(n)) + Stream.fail("fail")).runDrain().either()
        )
        .bind("refRes", ({ ref }) => ref.get)

      const { refRes, res } = await program.unsafeRunPromise()

      expect(res).toEqual(Either.left("fail"))
      expect(refRes).toEqual(1)
    })
  })

  describe("drainFork", () => {
    it("runs the other stream in the background", async () => {
      const program = Promise.make<never, void>().flatMap((latch) =>
        Stream.fromEffect(latch.await())
          .drainFork(Stream.fromEffect(latch.succeed(undefined)))
          .runDrain()
          .map(constTrue)
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("interrupts the background stream when the foreground exits", async () => {
      const program = Effect.Do()
        .bind("backgroundInterrupted", () => Ref.make(constFalse))
        .bind("latch", () => Promise.make<never, void>())
        .tap(({ backgroundInterrupted, latch }) =>
          (Stream(1, 2, 3) + Stream.fromEffect(latch.await()).drain())
            .drainFork(
              Stream.fromEffect(
                (latch.succeed(undefined) > Effect.never).onInterrupt(() =>
                  backgroundInterrupted.set(true)
                )
              )
            )
            .runDrain()
        )
        .flatMap(({ backgroundInterrupted }) => backgroundInterrupted.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("fails the foreground stream if the background fails with a typed error", async () => {
      const program = Stream.never.drainFork(Stream.fail("boom")).runDrain()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail("boom"))
    })

    it("fails the foreground stream if the background fails with a defect", async () => {
      const error = new RuntimeError("boom")
      const program = Stream.never.drainFork(Stream.die(error)).runDrain()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.die(error))
    })
  })
})
