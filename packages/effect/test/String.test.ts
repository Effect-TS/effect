import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Order from "effect/Order"
import * as S from "effect/String"
import { deepStrictEqual } from "effect/test/util"
import { describe, expect, it } from "vitest"

describe("String", () => {
  it("isString", () => {
    expect(S.isString("a")).toEqual(true)
    expect(S.isString(1)).toEqual(false)
    expect(S.isString(true)).toEqual(false)
  })

  it("empty", () => {
    expect(S.empty).toEqual("")
  })

  it("Equivalence", () => {
    expect(S.Equivalence("a", "a")).toBe(true)
    expect(S.Equivalence("a", "b")).toBe(false)
  })

  it("Order", () => {
    const lessThan = Order.lessThan(S.Order)
    const lessThanOrEqualTo = Order.lessThanOrEqualTo(S.Order)
    expect(pipe("a", lessThan("b"))).toEqual(true)
    expect(pipe("a", lessThan("a"))).toEqual(false)
    expect(pipe("a", lessThanOrEqualTo("a"))).toEqual(true)
    expect(pipe("b", lessThan("a"))).toEqual(false)
    expect(pipe("b", lessThanOrEqualTo("a"))).toEqual(false)
  })

  it("concat", () => {
    expect(pipe("a", S.concat("b"))).toBe("ab")
  })

  it("isEmpty", () => {
    expect(S.isEmpty("")).toBe(true)
    expect(S.isEmpty("a")).toBe(false)
  })

  it("isNonEmpty", () => {
    expect(S.isNonEmpty("")).toBe(false)
    expect(S.isNonEmpty("a")).toBe(true)
  })

  it("length", () => {
    expect(S.length("")).toBe(0)
    expect(S.length("a")).toBe(1)
    expect(S.length("aaa")).toBe(3)
  })

  it("toUpperCase", () => {
    expect(S.toUpperCase("a")).toBe("A")
  })

  it("toLowerCase", () => {
    expect(S.toLowerCase("A")).toBe("a")
  })

  it("capitalize", () => {
    expect(S.capitalize("")).toBe("")
    expect(S.capitalize("abc")).toBe("Abc")
  })

  it("uncapitalize", () => {
    expect(S.uncapitalize("")).toBe("")
    expect(S.uncapitalize("Abc")).toBe("abc")
  })

  it("replace", () => {
    expect(pipe("abc", S.replace("b", "d"))).toBe("adc")
  })

  it("split", () => {
    deepStrictEqual(pipe("abc", S.split("")), ["a", "b", "c"])
    deepStrictEqual(pipe("", S.split("")), [""])
  })

  it("trim", () => {
    expect(pipe(" a ", S.trim)).toBe("a")
  })

  it("trimStart", () => {
    expect(pipe(" a ", S.trimStart)).toBe("a ")
  })

  it("trimEnd", () => {
    expect(pipe(" a ", S.trimEnd)).toBe(" a")
  })

  it("includes", () => {
    expect(pipe("abc", S.includes("b"))).toBe(true)
    expect(pipe("abc", S.includes("d"))).toBe(false)
    expect(pipe("abc", S.includes("b", 1))).toBe(true)
    expect(pipe("abc", S.includes("a", 1))).toBe(false)
  })

  it("startsWith", () => {
    expect(pipe("abc", S.startsWith("a"))).toBe(true)
    expect(pipe("bc", S.startsWith("a"))).toBe(false)
    expect(pipe("abc", S.startsWith("b", 1))).toBe(true)
    expect(pipe("bc", S.startsWith("a", 1))).toBe(false)
  })

  it("endsWith", () => {
    expect(pipe("abc", S.endsWith("c"))).toBe(true)
    expect(pipe("ab", S.endsWith("c"))).toBe(false)
    expect(pipe("abc", S.endsWith("b", 2))).toBe(true)
    expect(pipe("abc", S.endsWith("c", 2))).toBe(false)
  })

  it("slice", () => {
    deepStrictEqual(pipe("abcd", S.slice(1, 3)), "bc")
  })

  it("charCodeAt", () => {
    expect(pipe("abc", S.charCodeAt(1))).toStrictEqual(Option.some(98))
    expect(pipe("abc", S.charCodeAt(4))).toStrictEqual(Option.none())
  })

  it("substring", () => {
    expect(pipe("abcd", S.substring(1))).toBe("bcd")
    expect(pipe("abcd", S.substring(1, 3))).toBe("bc")
  })

  it("at", () => {
    expect(pipe("abc", S.at(1))).toStrictEqual(Option.some("b"))
    expect(pipe("abc", S.at(4))).toStrictEqual(Option.none())
  })

  it("charAt", () => {
    expect(pipe("abc", S.charAt(1))).toStrictEqual(Option.some("b"))
    expect(pipe("abc", S.charAt(4))).toStrictEqual(Option.none())
  })

  it("codePointAt", () => {
    expect(pipe("abc", S.codePointAt(1))).toStrictEqual(Option.some(98))
    expect(pipe("abc", S.codePointAt(4))).toStrictEqual(Option.none())
  })

  it("indexOf", () => {
    expect(pipe("abbbc", S.indexOf("b"))).toStrictEqual(Option.some(1))
    expect(pipe("abbbc", S.indexOf("d"))).toStrictEqual(Option.none())
  })

  it("lastIndexOf", () => {
    expect(pipe("abbbc", S.lastIndexOf("b"))).toStrictEqual(Option.some(3))
    expect(pipe("abbbc", S.lastIndexOf("d"))).toStrictEqual(Option.none())
  })

  it("localeCompare", () => {
    expect(pipe("a", S.localeCompare("b"))).toBe(-1)
    expect(pipe("b", S.localeCompare("a"))).toBe(1)
    expect(pipe("a", S.localeCompare("a"))).toBe(0)
  })

  it("match", () => {
    expect(pipe("a", S.match(/a/))).toStrictEqual(Option.some(expect.arrayContaining(["a"])))
    expect(pipe("a", S.match(/b/))).toStrictEqual(Option.none())
  })

  it("matchAll", () => {
    expect(Array.from(pipe("apple, banana", S.matchAll(/a[pn]/g)))).toHaveLength(3)
    expect(Array.from(pipe("apple, banana", S.matchAll(/c/g)))).toHaveLength(0)
  })

  it("normalize", () => {
    const str = "\u1E9B\u0323"
    expect(pipe(str, S.normalize())).toBe("\u1E9B\u0323")
    expect(pipe(str, S.normalize("NFC"))).toBe("\u1E9B\u0323")
    expect(pipe(str, S.normalize("NFD"))).toBe("\u017F\u0323\u0307")
    expect(pipe(str, S.normalize("NFKC"))).toBe("\u1E69")
    expect(pipe(str, S.normalize("NFKD"))).toBe("\u0073\u0323\u0307")
  })

  it("padEnd", () => {
    expect(pipe("a", S.padEnd(5))).toBe("a    ")
    expect(pipe("a", S.padEnd(5, "_"))).toBe("a____")
  })

  it("padStart", () => {
    expect(pipe("a", S.padStart(5))).toBe("    a")
    expect(pipe("a", S.padStart(5, "_"))).toBe("____a")
  })

  it("repeat", () => {
    expect(pipe("a", S.repeat(3))).toBe("aaa")
  })

  it("replaceAll", () => {
    expect(pipe("ababb", S.replaceAll("b", "c"))).toBe("acacc")
    expect(pipe("ababb", S.replaceAll(/ba/g, "cc"))).toBe("accbb")
  })

  it("search", () => {
    expect(pipe("ababb", S.search("b"))).toStrictEqual(Option.some(1))
    expect(pipe("ababb", S.search(/abb/))).toStrictEqual(Option.some(2))
    expect(pipe("ababb", S.search(/c/))).toStrictEqual(Option.none())
  })

  it("toLocaleLowerCase", () => {
    const locales = ["tr", "TR", "tr-TR", "tr-u-co-search", "tr-x-turkish"]
    expect(pipe("\u0130", S.toLocaleLowerCase(locales))).toBe("i")
  })

  it("toLocaleUpperCase", () => {
    const locales = ["lt", "LT", "lt-LT", "lt-u-co-phonebk", "lt-x-lietuva"]
    expect(pipe("i\u0307", S.toLocaleUpperCase(locales))).toBe("I")
  })

  describe("takeLeft", () => {
    it("should take the specified number of characters from the left side of a string", () => {
      expect(S.takeLeft("Hello, World!", 7)).toBe("Hello, ")
    })

    it("should return the string for `n` larger than the string length", () => {
      const string = "Hello, World!"
      expect(S.takeLeft(string, 100)).toBe(string)
    })

    it("should return the empty string for a negative `n`", () => {
      expect(S.takeLeft("Hello, World!", -1)).toBe("")
    })

    it("should round down if `n` is a float", () => {
      expect(S.takeLeft("Hello, World!", 5.5)).toBe("Hello")
    })
  })

  describe("takeRight", () => {
    it("should take the specified number of characters from the right side of a string", () => {
      expect(S.takeRight("Hello, World!", 7)).toBe(" World!")
    })

    it("should return the string for `n` larger than the string length", () => {
      const string = "Hello, World!"
      expect(S.takeRight(string, 100)).toBe(string)
    })

    it("should return the empty string for a negative `n`", () => {
      expect(S.takeRight("Hello, World!", -1)).toBe("")
    })

    it("should round down if `n` is a float", () => {
      expect(S.takeRight("Hello, World!", 6.5)).toBe("World!")
    })
  })

  describe("stripMargin", () => {
    it("should strip a leading prefix from each line", () => {
      const string = `|
    |Hello,
    |World!
    |`
      const result = S.stripMargin(string)
      expect(result).toBe("\nHello,\nWorld!\n")
    })

    it("should strip a leading prefix from each line using a margin character", () => {
      const string = "\n$\n    $Hello,\r\n    $World!\n $"
      const result = S.stripMarginWith(string, "$")
      expect(result).toBe("\n\nHello,\r\nWorld!\n")
    })
  })

  describe("linesWithSeparators", () => {
    it("should split a string into lines with separators", () => {
      const string = "\n$\n    $Hello,\r\n    $World!\n $"
      const result = S.linesWithSeparators(string)
      deepStrictEqual(Array.from(result), ["\n", "$\n", "    $Hello,\r\n", "    $World!\n", " $"])
    })
  })

  describe("linesIterator", () => {
    it("should split a string into lines", () => {
      const string = "\n$\n    $Hello,\r\n    $World!\n $"
      const result = S.linesIterator(string)
      deepStrictEqual(Array.from(result), ["", "$", "    $Hello,", "    $World!", " $"])
    })
  })

  it("truncate", () => {
    expect(S.truncate("Hello World!", { length: 5 })).toBe("Hello...")
    expect(S.truncate("Hello World!", { length: 5, omission: "" })).toBe("Hello")
    expect(S.truncate("Hello World!", { length: 7 })).toBe("Hello W...")
    expect(S.truncate("Hello World!", { length: 7, separator: " " })).toBe(
      "Hello..."
    )
  })
})
