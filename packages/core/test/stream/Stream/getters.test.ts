import { Either } from "../../../src/data/Either"
import { Option } from "../../../src/data/Option"
import { Stream } from "../../../src/stream/Stream"

describe("Stream", () => {
  describe("right", () => {
    it("simple example", async () => {
      const program = (
        Stream.succeed(Either.right(1)) + Stream.succeed(Either.left(0))
      ).right
        .runCollect()
        .either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left(Option.none))
    })
  })

  describe("rightOrFail", () => {
    it("simple example", async () => {
      const program = (Stream.succeed(Either.right(1)) + Stream.succeed(Either.left(0)))
        .rightOrFail(-1)
        .runCollect()
        .either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left(-1))
    })
  })
})
