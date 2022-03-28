import { Chunk } from "../../../src/collection/immutable/Chunk"
import { Effect } from "../../../src/io/Effect"
import { Ref } from "../../../src/io/Ref"
import { Stream } from "../../../src/stream/Stream"

describe("Stream", () => {
  describe("acquireReleaseWith", () => {
    it("simple example", async () => {
      const program = Effect.Do()
        .bind("done", () => Ref.make(false))
        .bindValue("stream", ({ done }) =>
          Stream.acquireReleaseWith(Effect.succeed(Chunk.range(0, 2)), () =>
            done.set(true)
          ).flatMap((chunk) => Stream.fromIterable(chunk))
        )
        .bind("result", ({ stream }) => stream.runCollect())
        .bind("released", ({ done }) => done.get())

      const { released, result } = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([0, 1, 2])
      expect(released).toBe(true)
    })

    it("short circuits", async () => {
      const program = Effect.Do()
        .bind("done", () => Ref.make(false))
        .bindValue("stream", ({ done }) =>
          Stream.acquireReleaseWith(Effect.succeed(Chunk.range(0, 3)), () =>
            done.set(true)
          )
            .flatMap((chunk) => Stream.fromIterable(chunk))
            .take(2)
        )
        .bind("result", ({ stream }) => stream.runCollect())
        .bind("released", ({ done }) => done.get())

      const { released, result } = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([0, 1])
      expect(released).toBe(true)
    })

    it("no acquisition when short circuiting", async () => {
      const program = Effect.Do()
        .bind("acquired", () => Ref.make(false))
        .bindValue("stream", ({ acquired }) =>
          (
            Stream(1) + Stream.acquireReleaseWith(acquired.set(true), () => Effect.unit)
          ).take(0)
        )
        .bind("result", ({ stream }) => stream.runDrain())
        .flatMap(({ acquired }) => acquired.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(false)
    })

    it("releases when there are defects", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(false))
        .tap(({ ref }) =>
          Stream.acquireReleaseWith(Effect.unit, () => ref.set(true))
            .flatMap(() => Stream.fromEffect(Effect.dieMessage("boom")))
            .runDrain()
            .exit()
        )
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("flatMap associativity doesn't affect acquire release lifetime", async () => {
      const program = Effect.struct({
        leftAssoc: Stream.acquireReleaseWith(Ref.make(true), (ref) => ref.set(false))
          .flatMap((ref) => Stream.succeed(ref))
          .flatMap((ref) => Stream.fromEffect(ref.get()))
          .runCollect()
          .map((chunk) => chunk.unsafeHead()),
        rightAssoc: Stream.acquireReleaseWith(Ref.make(true), (ref) => ref.set(false))
          .flatMap((ref) =>
            Stream.succeed(ref).flatMap((ref) => Stream.fromEffect(ref.get()))
          )
          .runCollect()
          .map((chunk) => chunk.unsafeHead())
      })

      const { leftAssoc, rightAssoc } = await program.unsafeRunPromise()

      expect(rightAssoc).toBe(true)
      expect(leftAssoc).toBe(true)
    })

    it("propagates errors", async () => {
      const program = Stream.acquireReleaseWith(Effect.unit, () =>
        Effect.dieMessage("die")
      ).runCollect()

      const result = await program.unsafeRunPromiseExit()

      expect(result.isFailure() && result.cause.isDie()).toBe(true)
    })
  })
})
