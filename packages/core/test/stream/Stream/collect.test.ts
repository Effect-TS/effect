import { Chunk } from "../../../src/collection/immutable/Chunk"
import { Either } from "../../../src/data/Either"
import { identity } from "../../../src/data/Function"
import { Option } from "../../../src/data/Option"
import { Effect } from "../../../src/io/Effect"
import { Stream } from "../../../src/stream/Stream"

describe("Stream", () => {
  describe("collect", () => {
    it("collects values according to the partial function", async () => {
      const program = Stream<Either<number, number>>(
        Either.left(1),
        Either.right(2),
        Either.left(3)
      )
        .collect((either) =>
          either.isRight() ? Option.some(either.right) : Option.none
        )
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([2])
    })
  })

  describe("collectEffect", () => {
    it("simple example", async () => {
      const program = Stream<Either<number, number>>(
        Either.left(1),
        Either.right(2),
        Either.left(3)
      )
        .collectEffect((either) =>
          either.isRight() ? Option.some(Effect.succeed(either.right * 2)) : Option.none
        )
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([4])
    })

    it("collects on multiple chunks", async () => {
      const program = Stream.fromChunks<Either<number, number>>(
        Chunk(Either.left(1), Either.right(2)),
        Chunk(Either.right(3), Either.left(4))
      )
        .collectEffect((either) =>
          either.isRight()
            ? Option.some(Effect.succeed(either.right * 10))
            : Option.none
        )
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([20, 30])
    })

    it("fails", async () => {
      const program = Stream.fromChunks<Either<number, number>>(
        Chunk(Either.left(1), Either.right(2)),
        Chunk(Either.left(3), Either.right(4))
      )
        .collectEffect((either) =>
          either.isRight() ? Option.some(Effect.fail("ouch")) : Option.none
        )
        .runDrain()
        .either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left("ouch"))
    })

    it("laziness on chunks", async () => {
      const program = Stream(1, 2, 3, 4)
        .collectEffect((n) =>
          n === 3 ? Option.some(Effect.fail("boom")) : Option.some(Effect.succeed(n))
        )
        .either()
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([
        Either.right(1),
        Either.right(2),
        Either.left("boom")
      ])
    })
  })

  describe("collectSome", () => {
    it("simple example", async () => {
      const stream = Stream(Option.some(1), Option.none, Option.some(2))
      const program = Effect.struct({
        actual: stream
          .collectSome()
          .runCollect()
          .map((chunk) => chunk.toArray()),
        expected: stream.runCollect().map((chunk) => chunk.compact().toArray())
      })

      const { actual, expected } = await program.unsafeRunPromise()

      expect(actual).toEqual(expected)
    })
  })

  describe("collectWhile", () => {
    it("simple example", async () => {
      const program = Stream(
        Option.some(1),
        Option.some(2),
        Option.some(3),
        Option.none,
        Option.some(4)
      )
        .collectWhile(identity)
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([1, 2, 3])
    })

    it("short circuits", async () => {
      const program = (Stream(Option.some(1)) + Stream.fail("ouch"))
        .collectWhile((option) => (option.isNone() ? Option.some(1) : Option.none))
        .runDrain()
        .either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.right(undefined))
    })
  })

  describe("collectWhileEffect", () => {
    it("simple example", async () => {
      const program = Stream(
        Option.some(1),
        Option.some(2),
        Option.some(3),
        Option.none,
        Option.some(4)
      )
        .collectWhileEffect((option) =>
          option.isSome() ? Option.some(Effect.succeed(option.value * 2)) : Option.none
        )
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([2, 4, 6])
    })

    it("short circuits", async () => {
      const program = (Stream(Option.some(1)) + Stream.fail("ouch"))
        .collectWhileEffect((option) =>
          option.isNone() ? Option.some(Effect.succeedNow(1)) : Option.none
        )
        .runDrain()
        .either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.right(undefined))
    })

    it("fails", async () => {
      const program = Stream(
        Option.some(1),
        Option.some(2),
        Option.some(3),
        Option.none,
        Option.some(4)
      )
        .collectWhileEffect((option) =>
          option.isSome() ? Option.some(Effect.fail("ouch")) : Option.none
        )
        .runDrain()
        .either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left("ouch"))
    })

    it("laziness on chunks", async () => {
      const program = Stream(1, 2, 3, 4)
        .collectWhileEffect((n) =>
          n === 3 ? Option.some(Effect.fail("boom")) : Option.some(Effect.succeed(n))
        )
        .either()
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([
        Either.right(1),
        Either.right(2),
        Either.left("boom")
      ])
    })
  })
})
