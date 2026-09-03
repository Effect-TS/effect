import { String as Str } from "effect"
import { describe, expect, it } from "tstyche"

type TrimWhitespace =
  | "\u0009"
  | "\u000a"
  | "\u000b"
  | "\u000c"
  | "\u000d"
  | "\u0020"
  | "\u00a0"
  | "\u1680"
  | "\u2000"
  | "\u2001"
  | "\u2002"
  | "\u2003"
  | "\u2004"
  | "\u2005"
  | "\u2006"
  | "\u2007"
  | "\u2008"
  | "\u2009"
  | "\u200a"
  | "\u2028"
  | "\u2029"
  | "\u202f"
  | "\u205f"
  | "\u3000"
  | "\ufeff"

describe("String", () => {
  it("trim types match native whitespace handling", () => {
    expect<Str.TrimStart<`${TrimWhitespace}hello`>>().type.toBe<"hello">()
    expect<Str.TrimEnd<`hello${TrimWhitespace}`>>().type.toBe<"hello">()
    expect<Str.Trim<`${TrimWhitespace}hello${TrimWhitespace}`>>().type.toBe<"hello">()

    expect(Str.trimStart("\u00a0hello")).type.toBe<"hello">()
    expect(Str.trimEnd("hello\u00a0")).type.toBe<"hello">()
    expect(Str.trim("\u00a0hello\u00a0")).type.toBe<"hello">()

    expect(Str.trim("\u0085hello\u0085")).type.toBe<"\u0085hello\u0085">()
  })
})
