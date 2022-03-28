import { Either } from "../../../src/data/Either"
import { constTrue } from "../../../src/data/Function"
import { Sink } from "../../../src/stream/Sink"
import { Stream } from "../../../src/stream/Stream"

describe("Stream", () => {
  describe("transduce", () => {
    it("simple example", async () => {
      const program = Stream("1", "2", ",", "3", "4")
        .transduce(Sink.collectAllWhile((c: string) => /\d/.test(c)))
        .map((chunk) => chunk.join(""))
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual(["12", "34"])
    })

    it("no remainder", async () => {
      const program = Stream(1, 2, 3, 4)
        .transduce(
          Sink.fold(
            100,
            (n) => n % 2 === 0,
            (a, b) => a + b
          )
        )
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([101, 105, 104])
    })

    it("with a sink that always signals more", async () => {
      const program = Stream(1, 2, 3)
        .transduce(Sink.fold(0, constTrue, (a, b) => a + b))
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([6])
    })

    it("propagate managed error", async () => {
      const fail = "I'm such a failure!"
      const program = Stream(1, 2, 3).transduce(Sink.fail(fail)).runCollect().either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left(fail))
    })
  })
})
