import { makeStair, n } from "@effect/core/test/stm/TArray/test-utils"
import { constTrue } from "@tsplus/stdlib/data/Function"

describe("TArray", () => {
  describe("count", () => {
    it("computes correct sum", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.count((n) => n % 2 === 0).commit())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 5)
    })

    it("zero for absent", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.count((_) => _ > n).commit())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 0)
    })

    it("zero for empty", async () => {
      const program = TArray.empty<number>()
        .commit()
        .flatMap((tArray) => tArray.count(constTrue).commit())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 0)
    })
  })

  describe("countSTM", () => {
    it("computes correct sum", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.countSTM((n) => STM.succeed(n % 2 === 0)).commit())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 5)
    })

    it("zero for absent", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.countSTM((_) => STM.succeed(_ > n)).commit())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 0)
    })

    it("zero for empty", async () => {
      const program = TArray.empty<number>()
        .commit()
        .flatMap((tArray) => tArray.countSTM(() => STM.succeed(constTrue)).commit())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 0)
    })
  })
})
