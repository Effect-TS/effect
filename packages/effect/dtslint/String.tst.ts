import { hole, String as Str } from "effect"
import { describe, expect, it } from "tstyche"

describe("String", () => {
  it("concat", () => {
    expect(Str.concat(Str.capitalize("foo"), Str.capitalize("bar")))
      .type.toBe("FooBar")
  })

  it("toUpperCase", () => {
    expect(Str.toUpperCase("foo"))
      .type.toBe("FOO")
  })

  it("toLowerCase", () => {
    expect(Str.toLowerCase("BAR"))
      .type.toBe("bar")
  })

  it("capitalize", () => {
    expect(Str.capitalize("foo"))
      .type.toBe("Foo")
  })

  it("uncapitalize", () => {
    expect(Str.uncapitalize("BAR"))
      .type.toBe("bAR")
  })

  it("trim", () => {
    expect(Str.trim("   foo   ")).type.toBe("foo")
    expect(
      Str.trim(`
  \t     foo
  \r\n
`)
    ).type.toBe("foo")
  })

  it("trimEnd", () => {
    expect(
      Str.trimEnd(` foo
  \r\n
`)
    ).type.toBe(" foo")
  })

  it("trimStart", () => {
    expect(
      Str.trimStart(`
   \r\n\t   foo `)
    ).type.toBe("foo ")
  })

  describe("String type helpers", () => {
    type FooCapitalCase = "Foo"
    type BarCapitalCase = "Bar"

    it("Str.Concat", () => {
      type Test = Str.Concat<FooCapitalCase, BarCapitalCase>
      expect(hole<Test>())
        .type.toBe<"FooBar">()
    })

    type LeadingSpaces = "   foo"
    type TrailingSpaces = "bar   "
    type LeadingAndTrailingSpaces = "   baz   "

    type NewLines = `
        foo
  `
    type NewLinesAndTabs = `
      \t\t  foo
  `
    type CarriageReturns = `
    \r\n foo
  `

    it("Str.TrimStart", () => {
      expect<Str.TrimStart<LeadingSpaces>>()
        .type.toBe<"foo">()
    })

    it("Str.TrimEnd", () => {
      expect<Str.TrimEnd<TrailingSpaces>>()
        .type.toBe<"bar">()
    })

    it("Str.Trim", () => {
      expect<Str.Trim<LeadingAndTrailingSpaces>>()
        .type.toBe<"baz">()
      expect<Str.Trim<NewLines>>()
        .type.toBe<"foo">()
      expect<Str.Trim<NewLinesAndTabs>>()
        .type.toBe<"foo">()
      expect<Str.Trim<CarriageReturns>>()
        .type.toBe<"foo">()
    })
  })
})
