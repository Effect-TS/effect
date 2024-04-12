import * as RegExp from "effect/RegExp"
import { describe, expect, it } from "vitest"

describe("RegExp", () => {
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
