import type * as ParseResult from "effect/ParseResult"
import { describe, expect, it } from "tstyche"

declare const issue: ParseResult.ParseIssue

describe("ParseResult", () => {
  it("should always have an `actual` field", () => {
    expect(issue.actual)
      .type.toBe<unknown>()
  })
})
