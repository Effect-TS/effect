import { Semaphore } from "effect"
import { expect, it } from "tstyche"

it("accepts a semaphore typed as Semaphore for traced waits", () => {
  const limit: Semaphore.Semaphore = Semaphore.makeUnsafe(1)
  expect(Semaphore.withPermitsTraced).type.toBeCallableWith(limit, 1, "wait")
})
