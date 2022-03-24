import { Chunk } from "../../../src/collection/immutable/Chunk"
import { Tuple } from "../../../src/collection/immutable/Tuple"
import { Option } from "../../../src/data/Option"
import { Effect } from "../../../src/io/Effect"
import { HasRandom, Random } from "../../../src/io/Random"
import { Sink } from "../../../src/stream/Sink"
import { Stream } from "../../../src/stream/Stream"
import { findSink, zipParLaw } from "./test-utils"

describe("Sink", () => {
  describe("zip", () => {
    it("should return the value of both sinks", async () => {
      const program = Stream(1, 2, 3).run(Sink.head().zip(Sink.succeed("hello")))

      const result = await program.unsafeRunPromise()

      expect(result.get(0)).toEqual(Option.some(1))
      expect(result.get(1)).toBe("hello")
    })
  })

  describe("zipRight", () => {
    it("should return the value of the right sink", async () => {
      const program = Stream(1, 2, 3).run(Sink.head() > Sink.succeed("hello"))

      const result = await program.unsafeRunPromise()

      expect(result).toBe("hello")
    })
  })

  describe("zipLeft", () => {
    it("should return the value of the left sink", async () => {
      const program = Stream(1, 2, 3).run(Sink.head() < Sink.succeed("hello"))

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(1))
    })
  })

  describe("zipWith", () => {
    test("should use the specified function to zip the sink values", async () => {
      const program = Stream(1, 2, 3).run(
        Sink.head().zipWith(Sink.succeed("hello"), (option, s) =>
          option.fold(s, (a) => s + 1)
        )
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe("hello1")
    })
  })

  describe("zipWithPar", () => {
    it("coherence", async () => {
      const program = Effect.Do()
        .bind("ints", () =>
          Chunk.unfoldEffect(0, (n) =>
            Random.nextIntBetween(0, 10).map((i) =>
              n <= 20 ? Option.some(Tuple(i, n + 1)) : Option.none
            )
          )
        )
        .bind("success1", () => Random.nextBoolean)
        .bind("success2", () => Random.nextBoolean)
        .flatMap(({ ints, success1, success2 }) => {
          const chunk = ints
            .concat(success1 ? Chunk.single(20) : Chunk.empty<number>())
            .concat(success2 ? Chunk.single(40) : Chunk.empty<number>())

          return zipParLaw(
            Stream.fromIterableEffect(
              Random.shuffle(chunk).provideService(HasRandom)(Random.default)
            ),
            findSink(20),
            findSink(40)
          )
        })

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })
  })
})
