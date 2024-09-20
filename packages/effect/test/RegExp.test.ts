import * as RegExp from "effect/RegExp"
import { describe, expect, it } from "vitest"

describe("RegExp", () => {
  it("isRegExp", () => {
    expect(RegExp.isRegExp(/a/)).toEqual(true)
    expect(RegExp.isRegExp(null)).toEqual(false)
    expect(RegExp.isRegExp("a")).toEqual(false)
  })

  describe("escape", () => {
    it("should escape special characters correctly", () => {
      const testCases: Array<[string, string]> = [
        ["abc", "abc"],
        ["a*b", "a\\*b"],
        ["a.b", "a\\.b"],
        ["a|b", "a\\|b"],
        ["a?b", "a\\?b"],
        ["a+b", "a\\+b"],
        ["a(b", "a\\(b"],
        ["a)b", "a\\)b"],
        ["a[b", "a\\[b"],
        ["a]b", "a\\]b"],
        ["a{b", "a\\{b"],
        ["a}b", "a\\}b"],
        ["a^b", "a\\^b"],
        ["a$b", "a\\$b"],
        ["a\\b", "a\\\\b"],
        ["a/b", "a\\/b"]
      ]

      testCases.forEach(([input, expected]) => {
        const result = RegExp.escape(input)
        expect(result).toEqual(expected)
      })
    })
  })
})
