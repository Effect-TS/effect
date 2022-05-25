import { boom, makeTArray, valuesOf } from "@effect/core/test/stm/TArray/test-utils"

describe.concurrent("TArray", () => {
  describe.concurrent("update", () => {
    it("happy-path", async () => {
      const program = makeTArray(1, 42)
        .commit()
        .flatMap((tArray) => (tArray.update(0, (n) => -n) > valuesOf(tArray)).commit())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(-42))
    })

    it("dies with ArrayIndexOutOfBounds when index is out of bounds", async () => {
      const program = makeTArray(1, 42)
        .commit()
        .flatMap((tArray) => tArray.update(-1, identity).commit())

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(
        result.isFailure() &&
          result.cause.isDieType() &&
          result.cause.value instanceof IndexOutOfBounds &&
          result.cause.value.index === -1 &&
          result.cause.value.min === 0 &&
          result.cause.value.max === 1
      )
    })
  })

  describe.concurrent("updateSTM", () => {
    it("happy-path", async () => {
      const program = makeTArray(1, 42)
        .commit()
        .flatMap((tArray) => (tArray.updateSTM(0, (n) => STM.succeed(-n)) > valuesOf(tArray)).commit())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(-42))
    })

    it("dies with ArrayIndexOutOfBounds when index is out of bounds", async () => {
      const program = makeTArray(1, 42)
        .commit()
        .flatMap((tArray) => tArray.updateSTM(-1, STM.succeedNow).commit())

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(
        result.isFailure() &&
          result.cause.isDieType() &&
          result.cause.value instanceof IndexOutOfBounds &&
          result.cause.value.index === -1 &&
          result.cause.value.min === 0 &&
          result.cause.value.max === 1
      )
    })

    it("failure", async () => {
      const program = makeTArray(1, 42)
        .commit()
        .flatMap((tArray) =>
          tArray
            .updateSTM(0, () => STM.fail(boom))
            .commit()
            .flip()
        )

      const result = await program.unsafeRunPromise()

      assert.deepEqual(result, boom)
    })
  })
})
