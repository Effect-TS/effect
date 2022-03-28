import { Chunk } from "../../../src/collection/immutable/Chunk"
import { Tuple } from "../../../src/collection/immutable/Tuple"
import { Option } from "../../../src/data/Option"
import { Effect } from "../../../src/io/Effect"
import { HasRandom, Random } from "../../../src/io/Random"
import { Stream } from "../../../src/stream/Stream"
import { findSink, sinkRaceLaw } from "./test-utils"

describe("Sink", () => {
  describe("raceBoth", () => {
    it("", async () => {
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

          return sinkRaceLaw(
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
