import { Either } from "../../../src/data/Either"
import { Effect } from "../../../src/io/Effect"
import { Sink } from "../../../src/stream/Sink"
import { Stream } from "../../../src/stream/Stream"

describe("Sink", () => {
  describe("as", () => {
    it("should map to the specified value", async () => {
      const program = Stream.range(1, 10).run(Sink.succeed(1).as("as"))

      const result = await program.unsafeRunPromise()

      expect(result).toBe("as")
    })
  })

  describe("map", () => {
    it("should map values", async () => {
      const program = Stream.range(1, 10).run(Sink.succeed(1).map((n) => n.toString()))

      const result = await program.unsafeRunPromise()

      expect(result).toBe("1")
    })
  })

  describe("mapError", () => {
    it("should map errors", async () => {
      const program = Stream.range(1, 10)
        .run(Sink.fail("fail").mapError((s) => s + "!"))
        .either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left("fail!"))
    })
  })

  describe("mapEffect", () => {
    it("happy path", async () => {
      const program = Stream.range(1, 10).run(
        Sink.succeed(1).mapEffect((n) => Effect.succeed(n + 1))
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(2)
    })

    it("failure", async () => {
      const program = Stream.range(1, 10)
        .run(Sink.succeed(1).mapEffect(() => Effect.fail("fail")))
        .flip()

      const result = await program.unsafeRunPromise()

      expect(result).toBe("fail")
    })
  })
})
