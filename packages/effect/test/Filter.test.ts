import { describe, it } from "@effect/vitest"
import { assertFailure, assertSuccess } from "@effect/vitest/utils"
import { Filter, pipe, Result } from "effect"

describe("Filter.map", () => {
  const length = Filter.make((s: string) => s.length > 0 ? Result.succeed(s.length) : Result.fail("empty"))

  it("maps the passing value data-first", () => {
    assertSuccess(Filter.map(length, (n) => n * 2)("abc"), 6)
  })

  it("preserves failures without calling the mapper data-last", () => {
    const mapped = pipe(
      length,
      Filter.map(() => {
        throw new Error("mapper called on a failure")
      })
    )
    assertFailure(mapped(""), "empty")
  })
})
