import { assert, describe, it } from "@effect/vitest"
import { Filter, pipe, Result } from "effect"

describe("Filter.map", () => {
  const length = Filter.make((s: string) => s.length > 0 ? Result.succeed(s.length) : Result.fail("empty"))

  it("maps the passing value data-first", () => {
    const mapped = Filter.map(length, (n) => n * 2)
    assert.deepStrictEqual(mapped("abc"), Result.succeed(6))
  })

  it("preserves failures without calling the mapper data-last", () => {
    const mapped = pipe(length, Filter.map(() => {
      throw new Error("mapper called on a failure")
    }))
    assert.deepStrictEqual(mapped(""), Result.fail("empty"))
  })
})
