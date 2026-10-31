import { String } from "effect"
import { describe, expect, it } from "tstyche"

describe("String", () => {
  it("capitalize", () => {
    expect(String.capitalize).type.toBe<(<T extends string>(self: T) => Capitalize<T>)>()
    expect(String.capitalize("hello" as string)).type.toBe<Capitalize<string>>()
  })

  it("uncapitalize", () => {
    expect(String.uncapitalize).type.toBe<(<T extends string>(self: T) => Uncapitalize<T>)>()
    expect(String.uncapitalize("hello" as string)).type.toBe<Uncapitalize<string>>()
    expect(String.uncapitalize("AΣ")).type.toBe<"aΣ">()
  })

  it("replace", () => {
    expect(String.replace).type.toBeCallableWith(/(\w)-(\w)/, (_: string, a: string, b: string) => `${b}-${a}`)
    expect(String.replace).type.not.toBeCallableWith("a", () => 1)
  })

  it("replaceAll", () => {
    expect(String.replaceAll).type.toBeCallableWith(/[a-c]/g, (char: string) => char.toUpperCase())
    expect(String.replaceAll).type.not.toBeCallableWith("a", () => 1)
  })

  it("matchAll", () => {
    expect(String.matchAll(/l/g)("hello")).type.toBe<RegExpStringIterator<RegExpExecArray>>()
  })

  it("localeCompare", () => {
    const locales: ReadonlyArray<string> = ["sv", "de"]
    expect(String.localeCompare).type.toBeCallableWith("z", "sv")
    expect(String.localeCompare).type.toBeCallableWith("z", locales)
    expect(String.localeCompare).type.toBeCallableWith("z", new Intl.Locale("sv"))
  })

  it("toLocaleLowerCase", () => {
    const locales: ReadonlyArray<string> = ["tr"]
    expect(String.toLocaleLowerCase).type.toBeCallableWith(locales)
    expect(String.toLocaleLowerCase).type.toBeCallableWith(new Intl.Locale("tr"))
  })

  it("toLocaleUpperCase", () => {
    const locales: ReadonlyArray<string> = ["tr"]
    expect(String.toLocaleUpperCase).type.toBeCallableWith(locales)
    expect(String.toLocaleUpperCase).type.toBeCallableWith(new Intl.Locale("tr"))
  })
})
