import { Ref } from "../../../src/io/Ref"

const current = "value"
const update = "new value"

describe("Ref", () => {
  describe("set", () => {
    it("simple", async () => {
      const program = Ref.make(current)
        .tap((ref) => ref.set(update))
        .flatMap((ref) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(update)
    })
  })
})
