import { String } from "effect"
import { describe, expect, it } from "tstyche"

describe("String", () => {
  it("capitalize", () => {
    expect<String.Capitalize<"">>().type.toBe<"">()
    expect<String.Capitalize<"hello">>().type.toBe<"Hello">()
    expect<String.Capitalize<"é">>().type.toBe<"É">()
    expect<String.Capitalize<"ßx">>().type.toBe<"SSx">()
    expect<String.Capitalize<"𐐨foo">>().type.toBe<"𐐀foo">()
    expect<String.Capitalize<"😀x">>().type.toBe<"😀x">()
    expect<String.Capitalize<string>>().type.toBe<string>()
    expect<String.Capitalize<"a" | "𐐨foo">>().type.toBe<"A" | "𐐀foo">()

    const hello = String.capitalize("hello")
    const eszett = String.capitalize("ßx")
    const deseret = String.capitalize("𐐨foo")
    const emoji = String.capitalize("😀x")
    const wide = String.capitalize("hello" as string)
    const either = String.capitalize("𐐨foo" as "a" | "𐐨foo")

    expect<typeof hello>().type.toBe<"Hello">()
    expect<typeof eszett>().type.toBe<"SSx">()
    expect<typeof deseret>().type.toBe<"𐐀foo">()
    expect<typeof emoji>().type.toBe<"😀x">()
    expect<typeof wide>().type.toBe<string>()
    expect<typeof either>().type.toBe<"A" | "𐐀foo">()
  })

  it("uncapitalize", () => {
    expect<String.Uncapitalize<"Hello">>().type.toBe<"hello">()
    expect<String.Uncapitalize<"𐐀FOO">>().type.toBe<"𐐨FOO">()
    expect<String.Uncapitalize<"\u0130X">>().type.toBe<"i\u0307X">()

    const hello = String.uncapitalize("Hello")
    const deseret = String.uncapitalize("𐐀FOO")
    const dotted = String.uncapitalize("\u0130X")

    expect<typeof hello>().type.toBe<"hello">()
    expect<typeof deseret>().type.toBe<"𐐨FOO">()
    expect<typeof dotted>().type.toBe<"i\u0307X">()
  })
})
