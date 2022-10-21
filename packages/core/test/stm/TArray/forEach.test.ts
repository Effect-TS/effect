import { makeTArray, n } from "@effect/core/test/stm/TArray/test-utils"

describe.concurrent("TArray", () => {
  describe.concurrent("forEach", () => {
    it("side-effect is transactional", () =>
      Do(($) => {
        const ref = $(TRef.makeCommit(0))
        const array = $(makeTArray(n, 1).commit)
        const fiber = $(array.forEach((i) => ref.update((j) => i + j).unit).commit.fork)
        const result = $(ref.get.commit)
        $(fiber.join)
        assert.isTrue(result === 0 || result === n)
      }).unsafeRunPromise())
  })
})
