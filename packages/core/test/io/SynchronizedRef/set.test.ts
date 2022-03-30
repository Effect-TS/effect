import { SynchronizedRef } from "../../../src/io/Ref/Synchronized"

const current = "value"
const update = "new value"

describe("SynchronizedRef", () => {
  describe("set", () => {
    it("simple", async () => {
      const program = SynchronizedRef.make(current)
        .tap((ref) => ref.set(update))
        .flatMap((ref) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(update)
    })
  })
})
