import { assert, describe, it } from "@effect/vitest"
import { String as Str } from "effect"

// WhiteSpace (TAB, VT, FF, FEFF and all 17 Space_Separator code points), plus LineTerminator.
const trimCodePoints = [
  0x0009,
  0x000a,
  0x000b,
  0x000c,
  0x000d,
  0x0020,
  0x00a0,
  0x1680,
  0x2000,
  0x2001,
  0x2002,
  0x2003,
  0x2004,
  0x2005,
  0x2006,
  0x2007,
  0x2008,
  0x2009,
  0x200a,
  0x2028,
  0x2029,
  0x202f,
  0x205f,
  0x3000,
  0xfeff
]
const nonTrimCodePoints = [0x0085, 0x180e, 0x200b, 0x200c, 0x200d]

describe("String trimming native runtime controls", () => {
  for (const codePoint of trimCodePoints) {
    it(`already trims U+${codePoint.toString(16).padStart(4, "0")} at the correct boundaries`, () => {
      const char = String.fromCodePoint(codePoint)
      const both = `${char}hello${char}`
      assert.strictEqual(both.trimStart(), `hello${char}`)
      assert.strictEqual(both.trimEnd(), `${char}hello`)
      assert.strictEqual(both.trim(), "hello")
      assert.strictEqual(Str.trimStart(both), both.trimStart())
      assert.strictEqual(Str.trimEnd(both), both.trimEnd())
      assert.strictEqual(Str.trim(both), both.trim())
      assert.strictEqual(Str.trimStart(`hello${char}`), `hello${char}`)
      assert.strictEqual(Str.trimEnd(`${char}hello`), `${char}hello`)
      assert.strictEqual(Str.trim(`he${char}llo`), `he${char}llo`)
      assert.strictEqual(Str.trimStart(char), "")
      assert.strictEqual(Str.trimEnd(char), "")
      assert.strictEqual(Str.trim(char), "")
    })
  }

  for (const codePoint of nonTrimCodePoints) {
    it(`does not trim U+${codePoint.toString(16).padStart(4, "0")}`, () => {
      const char = String.fromCodePoint(codePoint)
      const both = `${char}hello${char}`
      assert.strictEqual(both.trimStart(), both)
      assert.strictEqual(both.trimEnd(), both)
      assert.strictEqual(both.trim(), both)
      assert.strictEqual(Str.trimStart(both), both)
      assert.strictEqual(Str.trimEnd(both), both)
      assert.strictEqual(Str.trim(both), both)
      assert.strictEqual(Str.trim(`\v${both}\f`), both)
      assert.strictEqual(Str.trim(`${char}\vhello\f${char}`), `${char}\vhello\f${char}`)
    })
  }

  it("preserves empty strings and trims a mixed sequence", () => {
    assert.strictEqual(Str.trimStart(""), "")
    assert.strictEqual(Str.trimEnd(""), "")
    assert.strictEqual(Str.trim(""), "")
    const all = String.fromCodePoint(...trimCodePoints)
    assert.strictEqual(Str.trimStart(`${all}hello${all}`), `hello${all}`)
    assert.strictEqual(Str.trimEnd(`${all}hello${all}`), `${all}hello`)
    assert.strictEqual(Str.trim(`${all}hello${all}`), "hello")
  })
})
