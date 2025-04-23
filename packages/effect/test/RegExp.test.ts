import { describe, it } from "@effect/vitest"
import { RegExp } from "effect"
import { assertFalse, assertTrue, strictEqual } from "@effect/vitest/utils"

describe("RegExp", () => {
  it("isRegExp", () => {
    assertTrue(RegExp.isRegExp(/a/))
    assertFalse(RegExp.isRegExp(null))
    assertFalse(RegExp.isRegExp("a"))
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
        strictEqual(result, expected)
      })
    })
  })
})
