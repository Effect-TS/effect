import type { Chunk } from "../../../src/collection/immutable/Chunk"
import { Either } from "../../../src/data/Either"
import { Effect } from "../../../src/io/Effect"
import { Exit } from "../../../src/io/Exit"
import { Sink } from "../../../src/stream/Sink"
import { Stream } from "../../../src/stream/Stream"

describe("Sink", () => {
  describe("contramap", () => {
    it("happy path", async () => {
      const sink = Sink.collectAll<number>().contramap((s: string) =>
        Number.parseInt(s)
      )
      const program = Stream("1", "2", "3").run(sink)

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([1, 2, 3])
    })

    it("error", async () => {
      const sink = Sink.fail("ouch").contramap((s: string) => Number.parseInt(s))
      const program = Stream("1", "2", "3").run(sink).either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left("ouch"))
    })
  })

  describe("contramapChunks", () => {
    it("happy path", async () => {
      const sink = Sink.collectAll<number>().contramapChunks((chunk: Chunk<string>) =>
        chunk.map((s) => Number.parseInt(s))
      )
      const program = Stream("1", "2", "3").run(sink)

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([1, 2, 3])
    })

    it("error", async () => {
      const sink = Sink.fail("ouch").contramapChunks((chunk: Chunk<string>) =>
        chunk.map((s) => Number.parseInt(s))
      )
      const program = Stream("1", "2", "3").run(sink).either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left("ouch"))
    })
  })

  describe("contramapEffect", () => {
    it("happy path", async () => {
      const sink = Sink.collectAll<number>().contramapEffect((s: string) =>
        Effect.attempt(Number.parseInt(s))
      )
      const program = Stream("1", "2", "3").run(sink)

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([1, 2, 3])
    })

    it("error", async () => {
      const sink = Sink.fail("ouch").contramapEffect((s: string) =>
        Effect.attempt(Number.parseInt(s))
      )
      const program = Stream("1", "2", "3").run(sink).either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left("ouch"))
    })

    it("error in transformation", async () => {
      const error = new Error("woops")
      const sink = Sink.collectAll<number>().contramapEffect((s: string) =>
        Effect.attempt(() => {
          const n = Number.parseInt(s)
          if (Number.isNaN(n)) {
            throw error
          }
          return n
        })
      )
      const program = Stream("1", "a").run(sink)

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(error))
    })
  })

  describe("contramapChunksEffect", () => {
    it("happy path", async () => {
      const sink = Sink.collectAll<number>().contramapChunksEffect(
        (chunk: Chunk<string>) =>
          chunk.mapEffect((s) => Effect.attempt(Number.parseInt(s)))
      )
      const program = Stream("1", "2", "3").run(sink)

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([1, 2, 3])
    })

    it("error", async () => {
      const sink = Sink.fail("ouch").contramapChunksEffect((chunk: Chunk<string>) =>
        chunk.mapEffect((s) => Effect.attempt(Number.parseInt(s)))
      )
      const program = Stream("1", "2", "3").run(sink).either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left("ouch"))
    })

    it("error in transformation", async () => {
      const error = new Error("woops")
      const sink = Sink.collectAll<number>().contramapChunksEffect(
        (chunk: Chunk<string>) =>
          chunk.mapEffect((s) =>
            Effect.attempt(() => {
              const n = Number.parseInt(s)
              if (Number.isNaN(n)) {
                throw error
              }
              return n
            })
          )
      )
      const program = Stream("1", "a").run(sink)

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(error))
    })
  })
})
