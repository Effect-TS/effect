import { String as Str } from "effect"
import { describe, expect, it } from "tstyche"

// ECMAScript WhiteSpace plus LineTerminator; Unicode 17 Space_Separator has 17 members.
type TrimCharacter =
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

type NonTrimCharacter = "\u0085" | "\u180e" | "\u200b" | "\u200c" | "\u200d"

describe("String trimming literal types", () => {
  it("corrects VT and FF in public aliases and native wrapper output types", () => {
    expect<Str.TrimStart<"\vhello">>().type.toBe<"hello">()
    expect<Str.TrimEnd<"hello\f">>().type.toBe<"hello">()
    expect<Str.Trim<"\vhello\f">>().type.toBe<"hello">()
    expect(Str.trimStart("\vhello")).type.toBe<"hello">()
    expect(Str.trimEnd("hello\f")).type.toBe<"hello">()
    expect(Str.trim("\vhello\f")).type.toBe<"hello">()
    const staleStart = (_: "\vhello") => {}
    const staleEnd = (_: "hello\f") => {}
    const staleBoth = (_: "\vhello\f") => {}
    expect(staleStart).type.not.toBeCallableWith(Str.trimStart("\vhello"))
    expect(staleEnd).type.not.toBeCallableWith(Str.trimEnd("hello\f"))
    expect(staleBoth).type.not.toBeCallableWith(Str.trim("\vhello\f"))
  })

  it("all three aliases recognize every current ECMAScript trim character", () => {
    expect<Str.TrimStart<`${TrimCharacter}hello`>>().type.toBe<"hello">()
    expect<Str.TrimEnd<`hello${TrimCharacter}`>>().type.toBe<"hello">()
    expect<Str.Trim<`${TrimCharacter}hello${TrimCharacter}`>>().type.toBe<"hello">()
  })

  it("trimStart infers exact native output for every trim character", () => {
    expect(Str.trimStart("\u0009hello")).type.toBe<"hello">()
    expect(Str.trimStart("\u000ahello")).type.toBe<"hello">()
    expect(Str.trimStart("\u000bhello")).type.toBe<"hello">()
    expect(Str.trimStart("\u000chello")).type.toBe<"hello">()
    expect(Str.trimStart("\u000dhello")).type.toBe<"hello">()
    expect(Str.trimStart("\u0020hello")).type.toBe<"hello">()
    expect(Str.trimStart("\u00a0hello")).type.toBe<"hello">()
    expect(Str.trimStart("\u1680hello")).type.toBe<"hello">()
    expect(Str.trimStart("\u2000hello")).type.toBe<"hello">()
    expect(Str.trimStart("\u2001hello")).type.toBe<"hello">()
    expect(Str.trimStart("\u2002hello")).type.toBe<"hello">()
    expect(Str.trimStart("\u2003hello")).type.toBe<"hello">()
    expect(Str.trimStart("\u2004hello")).type.toBe<"hello">()
    expect(Str.trimStart("\u2005hello")).type.toBe<"hello">()
    expect(Str.trimStart("\u2006hello")).type.toBe<"hello">()
    expect(Str.trimStart("\u2007hello")).type.toBe<"hello">()
    expect(Str.trimStart("\u2008hello")).type.toBe<"hello">()
    expect(Str.trimStart("\u2009hello")).type.toBe<"hello">()
    expect(Str.trimStart("\u200ahello")).type.toBe<"hello">()
    expect(Str.trimStart("\u2028hello")).type.toBe<"hello">()
    expect(Str.trimStart("\u2029hello")).type.toBe<"hello">()
    expect(Str.trimStart("\u202fhello")).type.toBe<"hello">()
    expect(Str.trimStart("\u205fhello")).type.toBe<"hello">()
    expect(Str.trimStart("\u3000hello")).type.toBe<"hello">()
    expect(Str.trimStart("\ufeffhello")).type.toBe<"hello">()
  })

  it("trimEnd infers exact native output for every trim character", () => {
    expect(Str.trimEnd("hello\u0009")).type.toBe<"hello">()
    expect(Str.trimEnd("hello\u000a")).type.toBe<"hello">()
    expect(Str.trimEnd("hello\u000b")).type.toBe<"hello">()
    expect(Str.trimEnd("hello\u000c")).type.toBe<"hello">()
    expect(Str.trimEnd("hello\u000d")).type.toBe<"hello">()
    expect(Str.trimEnd("hello\u0020")).type.toBe<"hello">()
    expect(Str.trimEnd("hello\u00a0")).type.toBe<"hello">()
    expect(Str.trimEnd("hello\u1680")).type.toBe<"hello">()
    expect(Str.trimEnd("hello\u2000")).type.toBe<"hello">()
    expect(Str.trimEnd("hello\u2001")).type.toBe<"hello">()
    expect(Str.trimEnd("hello\u2002")).type.toBe<"hello">()
    expect(Str.trimEnd("hello\u2003")).type.toBe<"hello">()
    expect(Str.trimEnd("hello\u2004")).type.toBe<"hello">()
    expect(Str.trimEnd("hello\u2005")).type.toBe<"hello">()
    expect(Str.trimEnd("hello\u2006")).type.toBe<"hello">()
    expect(Str.trimEnd("hello\u2007")).type.toBe<"hello">()
    expect(Str.trimEnd("hello\u2008")).type.toBe<"hello">()
    expect(Str.trimEnd("hello\u2009")).type.toBe<"hello">()
    expect(Str.trimEnd("hello\u200a")).type.toBe<"hello">()
    expect(Str.trimEnd("hello\u2028")).type.toBe<"hello">()
    expect(Str.trimEnd("hello\u2029")).type.toBe<"hello">()
    expect(Str.trimEnd("hello\u202f")).type.toBe<"hello">()
    expect(Str.trimEnd("hello\u205f")).type.toBe<"hello">()
    expect(Str.trimEnd("hello\u3000")).type.toBe<"hello">()
    expect(Str.trimEnd("hello\ufeff")).type.toBe<"hello">()
  })

  it("trim infers exact native output for every trim character", () => {
    expect(Str.trim("\u0009hello\u0009")).type.toBe<"hello">()
    expect(Str.trim("\u000ahello\u000a")).type.toBe<"hello">()
    expect(Str.trim("\u000bhello\u000b")).type.toBe<"hello">()
    expect(Str.trim("\u000chello\u000c")).type.toBe<"hello">()
    expect(Str.trim("\u000dhello\u000d")).type.toBe<"hello">()
    expect(Str.trim("\u0020hello\u0020")).type.toBe<"hello">()
    expect(Str.trim("\u00a0hello\u00a0")).type.toBe<"hello">()
    expect(Str.trim("\u1680hello\u1680")).type.toBe<"hello">()
    expect(Str.trim("\u2000hello\u2000")).type.toBe<"hello">()
    expect(Str.trim("\u2001hello\u2001")).type.toBe<"hello">()
    expect(Str.trim("\u2002hello\u2002")).type.toBe<"hello">()
    expect(Str.trim("\u2003hello\u2003")).type.toBe<"hello">()
    expect(Str.trim("\u2004hello\u2004")).type.toBe<"hello">()
    expect(Str.trim("\u2005hello\u2005")).type.toBe<"hello">()
    expect(Str.trim("\u2006hello\u2006")).type.toBe<"hello">()
    expect(Str.trim("\u2007hello\u2007")).type.toBe<"hello">()
    expect(Str.trim("\u2008hello\u2008")).type.toBe<"hello">()
    expect(Str.trim("\u2009hello\u2009")).type.toBe<"hello">()
    expect(Str.trim("\u200ahello\u200a")).type.toBe<"hello">()
    expect(Str.trim("\u2028hello\u2028")).type.toBe<"hello">()
    expect(Str.trim("\u2029hello\u2029")).type.toBe<"hello">()
    expect(Str.trim("\u202fhello\u202f")).type.toBe<"hello">()
    expect(Str.trim("\u205fhello\u205f")).type.toBe<"hello">()
    expect(Str.trim("\u3000hello\u3000")).type.toBe<"hello">()
    expect(Str.trim("\ufeffhello\ufeff")).type.toBe<"hello">()
  })

  it("does not trim NEL, MVS, zero-width space or joiners", () => {
    expect<Str.TrimStart<`${NonTrimCharacter}hello`>>().type.toBe<`${NonTrimCharacter}hello`>()
    expect<Str.TrimEnd<`hello${NonTrimCharacter}`>>().type.toBe<`hello${NonTrimCharacter}`>()
    expect<Str.Trim<`${NonTrimCharacter}hello${NonTrimCharacter}`>>()
      .type.toBe<`${NonTrimCharacter}hello${NonTrimCharacter}`>()
    expect(Str.trim("\u0085hello\u0085")).type.toBe<"\u0085hello\u0085">()
    expect(Str.trimStart("\u0085hello")).type.toBe<"\u0085hello">()
    expect(Str.trimEnd("hello\u0085")).type.toBe<"hello\u0085">()
    expect(Str.trim("\u180ehello\u180e")).type.toBe<"\u180ehello\u180e">()
    expect(Str.trimStart("\u180ehello")).type.toBe<"\u180ehello">()
    expect(Str.trimEnd("hello\u180e")).type.toBe<"hello\u180e">()
    expect(Str.trim("\u200bhello\u200b")).type.toBe<"\u200bhello\u200b">()
    expect(Str.trimStart("\u200bhello")).type.toBe<"\u200bhello">()
    expect(Str.trimEnd("hello\u200b")).type.toBe<"hello\u200b">()
    expect(Str.trim("\u200chello\u200c")).type.toBe<"\u200chello\u200c">()
    expect(Str.trimStart("\u200chello")).type.toBe<"\u200chello">()
    expect(Str.trimEnd("hello\u200c")).type.toBe<"hello\u200c">()
    expect(Str.trim("\u200dhello\u200d")).type.toBe<"\u200dhello\u200d">()
    expect(Str.trimStart("\u200dhello")).type.toBe<"\u200dhello">()
    expect(Str.trimEnd("hello\u200d")).type.toBe<"hello\u200d">()
  })

  it("preserves string-wide and never types", () => {
    expect<Str.TrimStart<string>>().type.toBe<string>()
    expect<Str.TrimEnd<string>>().type.toBe<string>()
    expect<Str.Trim<string>>().type.toBe<string>()
    const wide = (): string => "hello"
    expect(Str.trimStart(wide())).type.toBe<string>()
    expect(Str.trimEnd(wide())).type.toBe<string>()
    expect(Str.trim(wide())).type.toBe<string>()
    expect<Str.TrimStart<never>>().type.toBe<never>()
    expect<Str.TrimEnd<never>>().type.toBe<never>()
    expect<Str.Trim<never>>().type.toBe<never>()
    const startFromNever = (value: never) => Str.trimStart(value)
    const endFromNever = (value: never) => Str.trimEnd(value)
    const bothFromNever = (value: never) => Str.trim(value)
    expect(startFromNever).type.toBe<(value: never) => never>()
    expect(endFromNever).type.toBe<(value: never) => never>()
    expect(bothFromNever).type.toBe<(value: never) => never>()
  })

  it("distributes over literal unions in aliases and public call sites", () => {
    type Input = "\vfoo\f" | "\u00a0bar\ufeff"
    const input = (flag: boolean): Input => flag ? "\vfoo\f" : "\u00a0bar\ufeff"
    expect<Str.TrimStart<Input>>().type.toBe<"foo\f" | "bar\ufeff">()
    expect<Str.TrimEnd<Input>>().type.toBe<"\vfoo" | "\u00a0bar">()
    expect<Str.Trim<Input>>().type.toBe<"foo" | "bar">()
    expect(Str.trimStart(input(true))).type.toBe<"foo\f" | "bar\ufeff">()
    expect(Str.trimEnd(input(true))).type.toBe<"\vfoo" | "\u00a0bar">()
    expect(Str.trim(input(true))).type.toBe<"foo" | "bar">()
  })

  it("preserves empty and interior content", () => {
    expect<Str.TrimStart<"">>().type.toBe<"">()
    expect<Str.TrimEnd<"">>().type.toBe<"">()
    expect<Str.Trim<"">>().type.toBe<"">()
    expect(Str.trimStart("")).type.toBe<"">()
    expect(Str.trimEnd("")).type.toBe<"">()
    expect(Str.trim("")).type.toBe<"">()
    expect<Str.Trim<`he${TrimCharacter}llo`>>().type.toBe<`he${TrimCharacter}llo`>()
    expect(Str.trimStart("hel\vlo")).type.toBe<"hel\vlo">()
    expect(Str.trimEnd("hel\flo")).type.toBe<"hel\flo">()
    expect(Str.trim("he\u00a0llo")).type.toBe<"he\u00a0llo">()
  })

  it("preserves the opposite end and trims only the selected direction", () => {
    expect<Str.TrimStart<`hello${TrimCharacter}`>>().type.toBe<`hello${TrimCharacter}`>()
    expect<Str.TrimEnd<`${TrimCharacter}hello`>>().type.toBe<`${TrimCharacter}hello`>()
    expect(Str.trimStart("hello\f")).type.toBe<"hello\f">()
    expect(Str.trimEnd("\vhello")).type.toBe<"\vhello">()
    expect(Str.trimStart("\vhello\f")).type.toBe<"hello\f">()
    expect(Str.trimEnd("\vhello\f")).type.toBe<"\vhello">()
    expect(Str.trim("\t\v\u00a0hello\ufeff\f\r\n")).type.toBe<"hello">()
  })

  it("trims whitespace-only strings and stops at non-trim characters", () => {
    expect<Str.TrimStart<TrimCharacter>>().type.toBe<"">()
    expect<Str.TrimEnd<TrimCharacter>>().type.toBe<"">()
    expect<Str.Trim<TrimCharacter>>().type.toBe<"">()
    expect(Str.trimStart("\v\f\u3000")).type.toBe<"">()
    expect(Str.trimEnd("\v\f\u3000")).type.toBe<"">()
    expect(Str.trim("\v\f\u3000")).type.toBe<"">()
    expect(Str.trim("\v\u200bhello\u200b\f")).type.toBe<"\u200bhello\u200b">()
    expect(Str.trim("\u200b\vhello\f\u200b")).type.toBe<"\u200b\vhello\f\u200b">()
  })
})
