import { TRef } from "../../../src/stm/TRef"

describe("STM", () => {
  describe("Make a new `TRef` and", () => {
    it("get its initial value", async () => {
      const program = TRef.make(14)
        .flatMap((ref) => ref.get())
        .commit()

      const result = await program.unsafeRunPromise()

      expect(result).toBe(14)
    })

    it("set a new value", async () => {
      const program = TRef.make(14)
        .tap((ref) => ref.set(42))
        .flatMap((ref) => ref.get())
        .commit()

      const result = await program.unsafeRunPromise()

      expect(result).toBe(42)
    })
  })
})
