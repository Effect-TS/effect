import { Either } from "../../../src/data/Either"
import { Effect } from "../../../src/io/Effect"
import { Ref } from "../../../src/io/Ref"
import { Sink } from "../../../src/stream/Sink"
import { Stream } from "../../../src/stream/Stream"

describe("Stream", () => {
  describe("tap", () => {
    it("tap", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .bind("result", ({ ref }) =>
          Stream(1, 1)
            .tap((m) => ref.update((n) => n + m))
            .runCollect()
        )
        .bind("sum", ({ ref }) => ref.get())

      const { result, sum } = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([1, 1])
      expect(sum).toBe(2)
    })

    it("laziness on chunks", async () => {
      const program = Stream(1, 2, 3)
        .tap((n) => Effect.when(n === 3, Effect.fail("fail")))
        .either()
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([
        Either.right(1),
        Either.right(2),
        Either.left("fail")
      ])
    })
  })

  describe("tapError", () => {
    it("tapError", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(""))
        .bind("result", ({ ref }) =>
          (Stream(1, 1) + Stream.fail("ouch"))
            .tapError((err) => ref.update((s) => s + err))
            .runCollect()
            .either()
        )
        .bind("err", ({ ref }) => ref.get())

      const { err, result } = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left("ouch"))
      expect(err).toBe("ouch")
    })
  })

  describe("tapSink", () => {
    it("sink that is done after stream", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .bindValue("sink", ({ ref }) =>
          Sink.forEach((m: number) => ref.update((n) => n + m))
        )
        .bindValue("stream", ({ sink }) => Stream(1, 1, 2, 3, 5, 8).tapSink(sink))
        .bind("elements", ({ stream }) => stream.runCollect())
        .bind("done", ({ ref }) => ref.get())

      const { done, elements } = await program.unsafeRunPromise()

      expect(elements.toArray()).toEqual([1, 1, 2, 3, 5, 8])
      expect(done).toBe(20)
    })

    it("sink that is done before stream", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .bindValue("sink", ({ ref }) =>
          Sink.take<number>(3)
            .map((chunk) => chunk.reduce(0, (a, b) => a + b))
            .mapEffect((m) => ref.update((n) => n + m))
        )
        .bindValue("stream", ({ sink }) => Stream(1, 1, 2, 3, 5, 8).tapSink(sink))
        .bind("elements", ({ stream }) => stream.runCollect())
        .bind("done", ({ ref }) => ref.get())

      const { done, elements } = await program.unsafeRunPromise()

      expect(elements.toArray()).toEqual([1, 1, 2, 3, 5, 8])
      expect(done).toBe(4)
    })

    it("sink that fails before stream", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .bindValue("sink", ({ ref }) => Sink.fail("error"))
        .bindValue("stream", ({ sink }) => Stream.never.tapSink(sink))
        .flatMap(({ stream }) => stream.runCollect().flip())

      const result = await program.unsafeRunPromise()

      expect(result).toBe("error")
    })

    it("does not read ahead", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .bindValue("sink", ({ ref }) =>
          Sink.forEach((m: number) => ref.update((n) => n + m))
        )
        .bindValue("stream", () => Stream(1, 2, 3, 4, 5).rechunk(1).forever())
        .bind("elements", ({ sink, stream }) => stream.tapSink(sink).take(3).runDrain())
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(6)
    })
  })
})
