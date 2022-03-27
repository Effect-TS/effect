import { Either } from "../../../src/data/Either"
import { Option } from "../../../src/data/Option"
import { Stream } from "../../../src/stream/Stream"

describe("Stream", () => {
  describe("orElse", () => {
    it("simple example", async () => {
      const stream1 = Stream(1, 2, 3) + Stream.fail("boom")
      const stream2 = Stream(4, 5, 6)
      const program = stream1
        .orElse(stream2)
        .runCollect()
        .map((chunk) => chunk.toArray())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([1, 2, 3, 4, 5, 6])
    })
  })

  describe("orElseEither", () => {
    it("simple example", async () => {
      const stream1 = Stream.succeed(1) + Stream.fail("boom")
      const stream2 = Stream.succeed(2)
      const program = stream1
        .orElseEither(stream2)
        .runCollect()
        .map((chunk) => chunk.toArray())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([Either.left(1), Either.right(2)])
    })
  })

  describe("orElseFail", () => {
    it("simple example", async () => {
      const stream = Stream.succeed(1) + Stream.fail("boom")
      const program = stream.orElseFail("boomer").runCollect().either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left("boomer"))
    })
  })

  describe("orElseOptional", () => {
    it("simple example", async () => {
      const stream1 = Stream.succeed(1) + Stream.fail(Option.none)
      const stream2 = Stream.succeed(2)
      const program = stream1
        .orElseOptional(stream2)
        .runCollect()
        .map((chunk) => chunk.toArray())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([1, 2])
    })
  })

  describe("orElseSucceed", () => {
    it("simple example", async () => {
      const stream = Stream.succeed(1) + Stream.fail(Option.none)
      const program = stream
        .orElseSucceed(2)
        .runCollect()
        .map((chunk) => chunk.toArray())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([1, 2])
    })
  })
})
