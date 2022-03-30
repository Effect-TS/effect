import { Effect } from "../../../src/io/Effect"
import { Random } from "../../../src/io/Random"

describe("Effect", () => {
  describe("memoize", () => {
    it("non-memoized returns new instances on repeated calls", async () => {
      const io = Random.nextInt
      const program = io.zip(io)

      const {
        tuple: [first, second]
      } = await program.unsafeRunPromise()

      expect(first).not.toBe(second)
    })

    it("memoized returns the same instance on repeated calls", async () => {
      const ioMemo = Random.nextInt.memoize()
      const program = ioMemo.flatMap((io) => io.zip(io))

      const {
        tuple: [first, second]
      } = await program.unsafeRunPromise()

      expect(first).toBe(second)
    })

    it("memoized function returns the same instance on repeated calls", async () => {
      const program = Effect.Do()
        .bind("memoized", () =>
          Effect.memoize((n: number) => Random.nextIntBetween(n, n + n))
        )
        .bind("a", ({ memoized }) => memoized(10))
        .bind("b", ({ memoized }) => memoized(10))
        .bind("c", ({ memoized }) => memoized(11))
        .bind("d", ({ memoized }) => memoized(11))
        .apply(Random.withSeed(100))

      const { a, b, c, d } = await program.unsafeRunPromise()

      expect(a).toBe(b)
      expect(b).not.toBe(c)
      expect(c).toBe(d)
    })
  })
})
