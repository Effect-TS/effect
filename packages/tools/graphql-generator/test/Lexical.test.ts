/**
 * Lexical semantics observed through the parser: string and block string
 * values from the spec's lexical section, number classification, ignored
 * tokens and the diagnostics for malformed input. Positions below count from
 * the `{ f(s: ` prefix that `stringValue` / `assertDiagnostic` wrap literals
 * in, so a literal starts at column 8.
 */
import { assert, describe, it } from "@effect/vitest"
import { argumentValue, assertDiagnostic, stringValue } from "./utils/ast.ts"

const inArgument = (literal: string) => `{ f(s: ${literal}) }`

describe("Lexical", () => {
  describe("strings", () => {
    it("plain and empty strings", () => {
      assert.strictEqual(stringValue("\"simple\""), "simple")
      assert.strictEqual(stringValue("\"\""), "")
      assert.strictEqual(stringValue("\"a # not a comment\""), "a # not a comment")
    })

    it("every escape sequence", () => {
      assert.strictEqual(stringValue("\"\\\" \\\\ \\/ \\b \\f \\n \\r \\t\""), "\" \\ / \b \f \n \r \t")
    })

    it("fixed-width unicode escapes", () => {
      assert.strictEqual(stringValue("\"\\u0041\\u00e9\""), "Aé")
    })

    it("surrogate pairs written as two fixed-width escapes", () => {
      assert.strictEqual(stringValue("\"\\uD83D\\uDE00\""), "😀")
    })

    it("variable-width unicode escapes", () => {
      assert.strictEqual(stringValue("\"\\u{1F600}\""), "😀")
      assert.strictEqual(stringValue("\"\\u{41}\""), "A")
    })

    it("raw astral characters", () => {
      assert.strictEqual(stringValue("\"😀 raw\""), "😀 raw")
    })

    it("diagnostics", () => {
      assertDiagnostic(inArgument("\"\\x\""), {
        line: 1,
        column: 9,
        message: "Invalid character escape sequence: \"\\x\"."
      })
      assertDiagnostic(inArgument("\"\\uD83D\""), {
        line: 1,
        column: 9,
        message: "Invalid Unicode escape sequence: \"\\uD83D\"."
      })
      assertDiagnostic(inArgument("\"\\uDE00\""), {
        line: 1,
        column: 9,
        message: "Invalid Unicode escape sequence: \"\\uDE00\"."
      })
      assertDiagnostic(inArgument("\"\\u{110000}\""), {
        line: 1,
        column: 9,
        message: "Invalid Unicode escape sequence: \"\\u{110000}\"."
      })
      assertDiagnostic(inArgument("\"ab\ncd\""), { line: 1, column: 11, message: "Unterminated string." })
      assertDiagnostic("{ f(s: \"abc) }", { line: 1, column: 15, message: "Unterminated string." })
      assertDiagnostic(inArgument("'x'"), {
        line: 1,
        column: 8,
        message: "Unexpected single quote character ('), did you mean to use a double quote (\")?"
      })
    })
  })

  describe("block strings", () => {
    it("single line", () => {
      assert.strictEqual(stringValue("\"\"\"simple\"\"\""), "simple")
      assert.strictEqual(stringValue("\"\"\"\"\"\""), "")
      assert.strictEqual(stringValue("\"\"\"say \"hi\" \"\"\""), "say \"hi\" ")
    })

    it("the spec's indentation example", () => {
      assert.strictEqual(
        stringValue("\"\"\"\n    Hello,\n      World!\n\n    Yours,\n      GraphQL.\n  \"\"\""),
        "Hello,\n  World!\n\nYours,\n  GraphQL."
      )
    })

    it("the first line keeps its indentation and does not count toward the common indent", () => {
      assert.strictEqual(stringValue("\"\"\"  first\n    second\"\"\""), "  first\nsecond")
    })

    it("leading and trailing blank lines are removed", () => {
      assert.strictEqual(stringValue("\"\"\"\n\n  a\n  b\n\n\"\"\""), "a\nb")
      assert.strictEqual(stringValue("\"\"\"   \n  a\"\"\""), "a")
    })

    it("whitespace-only lines are kept but ignored for the common indent", () => {
      assert.strictEqual(stringValue("\"\"\"\n    a\n\n  \n    b\"\"\""), "a\n\n\nb")
    })

    it("trailing whitespace is kept", () => {
      assert.strictEqual(stringValue("\"\"\"\n  a   \n  b\"\"\""), "a   \nb")
    })

    it("only the triple quote is escapable and nothing else is", () => {
      assert.strictEqual(stringValue("\"\"\"a \\\"\"\" b\"\"\""), "a \"\"\" b")
      assert.strictEqual(stringValue("\"\"\"\\n \\u0041\"\"\""), "\\n \\u0041")
    })

    it("line terminators are normalised to a line feed", () => {
      assert.strictEqual(stringValue("\"\"\"\r\n  a\r\n  b\r\n\"\"\""), "a\nb")
      assert.strictEqual(stringValue("\"\"\"\r  a\r  b\r\"\"\""), "a\nb")
    })

    it("unterminated block string", () => {
      assertDiagnostic("{ f(s: \"\"\"abc) }", { line: 1, column: 17, message: "Unterminated string." })
    })
  })

  describe("numbers", () => {
    it("int and float classification", () => {
      assert.strictEqual(argumentValue("0")._tag, "IntValue")
      assert.strictEqual(argumentValue("-12")._tag, "IntValue")
      assert.strictEqual(argumentValue("1.0")._tag, "FloatValue")
      assert.strictEqual(argumentValue("1e5")._tag, "FloatValue")
      assert.strictEqual(argumentValue("1E+5")._tag, "FloatValue")
      assert.strictEqual(argumentValue("-0.5e-3")._tag, "FloatValue")
    })

    it("diagnostics", () => {
      assertDiagnostic(inArgument("01"), {
        line: 1,
        column: 9,
        message: "Invalid number, unexpected digit after 0: \"1\"."
      })
      assertDiagnostic(inArgument("1."), {
        line: 1,
        column: 10,
        message: "Invalid number, expected digit but got: \")\"."
      })
      assertDiagnostic(inArgument("1.0e"), {
        line: 1,
        column: 12,
        message: "Invalid number, expected digit but got: \")\"."
      })
      assertDiagnostic(inArgument("1a"), {
        line: 1,
        column: 9,
        message: "Invalid number, expected digit but got: \"a\"."
      })
      assertDiagnostic(inArgument("-"), {
        line: 1,
        column: 9,
        message: "Invalid number, expected digit but got: \")\"."
      })
      assertDiagnostic(inArgument(".5"), { line: 1, column: 8, message: "Unexpected character: \".\"." })
    })
  })

  describe("unexpected characters", () => {
    it("printable ASCII is quoted, everything else is a code point", () => {
      assertDiagnostic("{ a ? }", { line: 1, column: 5, message: "Unexpected character: \"?\"." })
      assertDiagnostic("{ a \u0007 }", { line: 1, column: 5, message: "Unexpected character: U+0007." })
      assertDiagnostic("{ a é }", { line: 1, column: 5, message: "Unexpected character: U+00E9." })
    })
  })
})
