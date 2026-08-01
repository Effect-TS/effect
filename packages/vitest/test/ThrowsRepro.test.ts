import * as testAssert from "@effect/vitest/utils"
import { expect, it } from "vitest"

it("throws fails when the thunk does not throw", () => {
  expect(() => testAssert.throws(() => {})).toThrow()
})

it("throwsAsync fails when the promise resolves", async () => {
  await expect(testAssert.throwsAsync(() => Promise.resolve())).rejects.toThrow()
})
