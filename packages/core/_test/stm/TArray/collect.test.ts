import {
  boom,
  largePrime,
  makeStairWithHoles,
  makeTArray,
  N,
  n
} from "@effect/core/test/stm/TArray/test-utils"

describe.concurrent("TArray", () => {
  describe.concurrent("collectFirst", () => {
    it("finds and transforms correctly", () =>
      Do(($) => {
        const array = $(makeStairWithHoles(n).commit)
        const result = $(
          array.collectFirst((option) =>
            option.isSome() && option.value > 2
              ? Maybe.some(option.value.toString())
              : Maybe.none
          ).commit
        )
        assert.isTrue(result == Maybe.some("4"))
      }).unsafeRunPromise())

    it("succeeds for empty", () =>
      Do(($) => {
        const array = $(makeTArray(0, Maybe.empty<number>()).commit)
        const result = $(array.collectFirst((option) => Maybe.some(option)).commit)
        assert.isTrue(result == Maybe.none)
      }).unsafeRunPromise())

    it("fails to find absent", () =>
      Do(($) => {
        const array = $(makeStairWithHoles(n).commit)
        const result = $(
          array.collectFirst((option) =>
            option.isSome() && option.value > n
              ? Maybe.some(option.value.toString())
              : Maybe.none
          ).commit
        )
        assert.isTrue(result == Maybe.none)
      }).unsafeRunPromise())

    it("is atomic", () =>
      Do(($) => {
        const array = $(makeStairWithHoles(N).commit)
        const fiber = $(
          array.collectFirst((option) =>
            option.isSome() && option.value % largePrime === 0
              ? Maybe.some(option.value.toString())
              : Maybe.none
          ).commit.fork
        )
        $(STM.forEach(Chunk.range(0, N - 1), (i) => array.update(i, () => Maybe.some(1))).commit)
        const result = $(fiber.join)
        assert.isTrue(
          result == Maybe.some(largePrime.toString()) ||
            result == Maybe.none
        )
      }).unsafeRunPromise())
  })

  describe.concurrent("collectFirstSTM", () => {
    it("finds and transforms correctly", () =>
      Do(($) => {
        const array = $(makeStairWithHoles(n).commit)
        const result = $(
          array.collectFirstSTM((option) =>
            option.isSome() && option.value > 2
              ? Maybe.some(STM.succeed(option.value.toString()))
              : Maybe.none
          ).commit
        )
        assert.isTrue(result == Maybe.some("4"))
      }).unsafeRunPromise())

    it("succeeds for empty", () =>
      Do(($) => {
        const array = $(makeTArray(0, Maybe.empty<number>()).commit)
        const result = $(array.collectFirstSTM((option) => Maybe.some(STM.succeed(option))).commit)
        assert.isTrue(result == Maybe.none)
      }).unsafeRunPromise())

    it("fails to find absent", () =>
      Do(($) => {
        const array = $(makeStairWithHoles(n).commit)
        const result = $(
          array.collectFirstSTM((option) =>
            option.isSome() && option.value > n
              ? Maybe.some(STM.succeed(option.value.toString()))
              : Maybe.none
          ).commit
        )
        assert.isTrue(result == Maybe.none)
      }).unsafeRunPromise())

    it("is atomic", () =>
      Do(($) => {
        const array = $(makeStairWithHoles(N).commit)
        const fiber = $(
          array.collectFirstSTM((option) =>
            option.isSome() && option.value % largePrime === 0
              ? Maybe.some(STM.succeed(option.value.toString()))
              : Maybe.none
          ).commit.fork
        )
        $(STM.forEach(Chunk.range(0, N - 1), (i) => array.update(i, () => Maybe.some(1))).commit)
        const result = $(fiber.join)
        assert.isTrue(
          result == Maybe.some(largePrime.toString()) ||
            result == Maybe.none
        )
      }).unsafeRunPromise())

    it("fails on errors before result found", () =>
      Do(($) => {
        const array = $(makeStairWithHoles(n).commit)
        const result = $(
          array.collectFirstSTM((option) =>
            option.fold(
              Maybe.some(STM.fail(boom)),
              (i) => i > 2 ? Maybe.some(STM.succeed(i.toString)) : Maybe.none
            )
          ).commit.flip
        )
        assert.deepEqual(result, boom)
      }).unsafeRunPromise())

    it("succeeds on errors after result found", () =>
      Do(($) => {
        const array = $(makeStairWithHoles(n).commit)
        const result = $(
          array.collectFirstSTM((option) =>
            option.isSome() && option.value > 2
              ? Maybe.some(STM.succeed(option.value.toString()))
              : option.isSome() && option.value === 7
              ? Maybe.some(STM.fail(boom))
              : Maybe.none
          ).commit
        )
        assert.isTrue(result == Maybe.some("4"))
      }).unsafeRunPromise())
  })
})
