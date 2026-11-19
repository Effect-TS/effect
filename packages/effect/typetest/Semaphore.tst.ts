import { Semaphore } from "effect"
import { expect, it } from "tstyche"

it("requires a traceable semaphore only for traced waits", () => {
  const limit = Semaphore.makeUnsafe(1)
  const plain: Semaphore.Semaphore = limit
  expect(Semaphore.withPermitsTraced).type.toBeCallableWith(limit, 1, "wait")
  expect(Semaphore.withPermitsTraced).type.not.toBeCallableWith(plain, 1, "wait")
  expect(Semaphore.withPermits).type.toBeCallableWith(plain, 1)
})
