import { bindParameters, escapeValue } from "@effect/sql-mysql/internal/escape"
import { assert, describe, it } from "@effect/vitest"

const throwsCodecError = (run: () => unknown): void => {
  try {
    run()
  } catch (error) {
    assert.strictEqual((error as { readonly _tag?: string })._tag, "MysqlCodecError")
    return
  }
  assert.fail("Expected MysqlCodecError")
}

describe("escape", () => {
  describe("escapeValue", () => {
    it("renders null and undefined as NULL", () => {
      assert.strictEqual(escapeValue(null), "NULL")
      assert.strictEqual(escapeValue(undefined), "NULL")
    })

    it("quotes strings", () => {
      assert.strictEqual(escapeValue("alice"), "'alice'")
      assert.strictEqual(escapeValue(""), "''")
    })

    it("escapes quotes so a value cannot end its own literal", () => {
      assert.strictEqual(escapeValue("O'Brien"), "'O\\'Brien'")
      assert.strictEqual(escapeValue("' OR 1=1 -- "), "'\\' OR 1=1 -- '")
      assert.strictEqual(escapeValue("say \"hi\""), "'say \\\"hi\\\"'")
    })

    it("escapes backslashes, so an escaped quote cannot be smuggled in", () => {
      // Without escaping the backslash, `\'` would leave the quote unescaped
      // and close the literal.
      assert.strictEqual(escapeValue("\\' OR 1=1"), "'\\\\\\' OR 1=1'")
    })

    it("escapes control characters MySQL treats specially", () => {
      assert.strictEqual(escapeValue("a\0b"), "'a\\0b'")
      assert.strictEqual(escapeValue("a\nb"), "'a\\nb'")
      assert.strictEqual(escapeValue("a\rb"), "'a\\rb'")
      assert.strictEqual(escapeValue("a\tb"), "'a\\tb'")
      assert.strictEqual(escapeValue("a\bb"), "'a\\bb'")
      assert.strictEqual(escapeValue("a\x1ab"), "'a\\Zb'")
    })

    it("renders numbers and bigints unquoted", () => {
      assert.strictEqual(escapeValue(42), "42")
      assert.strictEqual(escapeValue(-1.5), "-1.5")
      assert.strictEqual(escapeValue(9007199254740993n), "9007199254740993")
    })

    it("refuses non-finite numbers rather than emitting invalid SQL", () => {
      throwsCodecError(() => escapeValue(Number.NaN))
      throwsCodecError(() => escapeValue(Number.POSITIVE_INFINITY))
    })

    it("renders booleans as 1 and 0", () => {
      assert.strictEqual(escapeValue(true), "1")
      assert.strictEqual(escapeValue(false), "0")
    })

    it("renders bytes as a hex literal", () => {
      assert.strictEqual(escapeValue(new Uint8Array([0xde, 0xad, 0x00, 0x0f])), "X'dead000f'")
      assert.strictEqual(escapeValue(new Uint8Array(0)), "X''")
    })

    it("renders a Date as a UTC datetime literal", () => {
      assert.strictEqual(
        escapeValue(new Date(Date.UTC(2026, 8, 10, 14, 30, 5, 123))),
        "'2026-09-10 14:30:05.123'"
      )
    })

    it("refuses an invalid Date", () => {
      throwsCodecError(() => escapeValue(new Date(Number.NaN)))
    })

    it("renders an array as a comma-separated list, which sql.in needs", () => {
      assert.strictEqual(escapeValue([1, "two", null]), "1, 'two', NULL")
    })

    it("renders a plain object as JSON", () => {
      assert.strictEqual(escapeValue({ a: 1 }), "'{\\\"a\\\":1}'")
    })
  })

  describe("bindParameters", () => {
    it("substitutes in order", () => {
      assert.strictEqual(
        bindParameters("SELECT * FROM t WHERE a = ? AND b = ?", [1, "x"]),
        "SELECT * FROM t WHERE a = 1 AND b = 'x'"
      )
    })

    it("returns the statement untouched when there are no parameters", () => {
      assert.strictEqual(bindParameters("SELECT 1", []), "SELECT 1")
    })

    it("leaves a question mark inside a string literal alone", () => {
      assert.strictEqual(
        bindParameters("SELECT 'why?' AS q, ? AS p", [1]),
        "SELECT 'why?' AS q, 1 AS p"
      )
    })

    it("leaves a question mark inside a double-quoted literal alone", () => {
      assert.strictEqual(bindParameters(`SELECT "why?", ?`, [1]), `SELECT "why?", 1`)
    })

    it("leaves a question mark inside a quoted identifier alone", () => {
      assert.strictEqual(bindParameters("SELECT `wat?`, ?", [1]), "SELECT `wat?`, 1")
    })

    it("handles a doubled quote inside a literal", () => {
      assert.strictEqual(bindParameters("SELECT 'it''s ?', ?", [1]), "SELECT 'it''s ?', 1")
    })

    it("handles a backslash-escaped quote inside a literal", () => {
      assert.strictEqual(bindParameters("SELECT 'it\\'s ?', ?", [1]), "SELECT 'it\\'s ?', 1")
    })

    it("leaves a question mark inside comments alone", () => {
      assert.strictEqual(bindParameters("SELECT 1 -- what?\n, ?", [2]), "SELECT 1 -- what?\n, 2")
      assert.strictEqual(bindParameters("SELECT 1 # what?\n, ?", [2]), "SELECT 1 # what?\n, 2")
      assert.strictEqual(bindParameters("SELECT /* what? */ ?", [2]), "SELECT /* what? */ 2")
    })

    it("does not let a substituted value introduce a new placeholder", () => {
      // The '?' in the first value must not consume the second parameter.
      assert.strictEqual(
        bindParameters("SELECT ?, ?", ["a?b", "c"]),
        "SELECT 'a?b', 'c'"
      )
    })

    it("rejects too few parameters", () => {
      throwsCodecError(() => bindParameters("SELECT ?, ?", [1]))
    })

    it("rejects too many parameters", () => {
      throwsCodecError(() => bindParameters("SELECT ?", [1, 2]))
    })
  })
})
