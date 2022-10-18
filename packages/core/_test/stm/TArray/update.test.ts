import { boom, makeTArray, valuesOf } from "@effect/core/test/stm/TArray/test-utils"

describe.concurrent("TArray", () => {
  describe.concurrent("update", () => {
    it("happy-path", async () => {
      const program = makeTArray(1, 42)
        .commit
        .flatMap((tArray) => (tArray.update(0, (n) => -n) > valuesOf(tArray)).commit)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(-42))
    })

    it("dies with ArrayIndexOutOfBounds when index is out of bounds", async () => {
      const program = makeTArray(1, 42)
        .commit
        .flatMap((tArray) => tArray.update(-1, identity).commit)

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(
        result.isFailure() &&
          result.cause.isDie &&
          result.cause.defects.find((d) =>
            d instanceof IndexOutOfBounds &&
            d.index === -1 &&
            d.min === 0 &&
            d.max === 1
          ).isSome()
      )
    })
  })

  describe.concurrent("updateSTM", () => {
    it("happy-path", async () => {
      const program = makeTArray(1, 42)
        .commit
        .flatMap((tArray) =>
          (tArray.updateSTM(0, (n) => STM.succeed(-n)) > valuesOf(tArray)).commit
        )

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(-42))
    })

    it("dies with ArrayIndexOutOfBounds when index is out of bounds", async () => {
      const program = makeTArray(1, 42)
        .commit
        .flatMap((tArray) => tArray.updateSTM(-1, STM.succeed).commit)

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(
        result.isFailure() &&
          result.cause.isDie &&
          result.cause.defects.find((d) =>
            d instanceof IndexOutOfBounds &&
            d.index === -1 &&
            d.min === 0 &&
            d.max === 1
          ).isSome()
      )
    })

    it("failure", async () => {
      const program = makeTArray(1, 42)
        .commit
        .flatMap((tArray) =>
          tArray
            .updateSTM(0, () => STM.failSync(boom))
            .commit
            .flip
        )

      const result = await program.unsafeRunPromise()

      assert.deepEqual(result, boom)
    })
  })
})
