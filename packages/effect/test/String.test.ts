import { describe, it } from "@effect/vitest"
import { assertFalse, assertNone, assertSome, assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import { Order, pipe, String as Str } from "effect"

describe("String", () => {
  it("isString", () => {
    assertTrue(Str.isString("a"))
    assertFalse(Str.isString(1))
    assertFalse(Str.isString(true))
  })

  it("empty", () => {
    strictEqual(Str.empty, "")
  })

  it("Equivalence", () => {
    assertTrue(Str.Equivalence("a", "a"))
    assertFalse(Str.Equivalence("a", "b"))
  })

  it("Order", () => {
    const lessThan = Order.lessThan(Str.Order)
    const lessThanOrEqualTo = Order.lessThanOrEqualTo(Str.Order)
    assertTrue(pipe("a", lessThan("b")))
    assertFalse(pipe("a", lessThan("a")))
    assertTrue(pipe("a", lessThanOrEqualTo("a")))
    assertFalse(pipe("b", lessThan("a")))
    assertFalse(pipe("b", lessThanOrEqualTo("a")))
  })

  it("concat", () => {
    strictEqual(pipe("a", Str.concat("b")), "ab")
  })

  it("isEmpty", () => {
    assertTrue(Str.isEmpty(""))
    assertFalse(Str.isEmpty("a"))
  })

  it("isNonEmpty", () => {
    assertFalse(Str.isNonEmpty(""))
    assertTrue(Str.isNonEmpty("a"))
  })

  it("length", () => {
    strictEqual(Str.length(""), 0)
    strictEqual(Str.length("a"), 1)
    strictEqual(Str.length("aaa"), 3)
  })

  it("toUpperCase", () => {
    strictEqual(Str.toUpperCase("a"), "A")
  })

  it("toLowerCase", () => {
    strictEqual(Str.toLowerCase("A"), "a")
  })

  it("capitalize", () => {
    strictEqual(Str.capitalize(""), "")
    strictEqual(Str.capitalize("abc"), "Abc")
  })

  it("uncapitalize", () => {
    strictEqual(Str.uncapitalize(""), "")
    strictEqual(Str.uncapitalize("Abc"), "abc")
  })

  it("replace", () => {
    strictEqual(pipe("abc", Str.replace("b", "d")), "adc")
  })

  it("split", () => {
    deepStrictEqual(pipe("abc", Str.split("")), ["a", "b", "c"])
    deepStrictEqual(pipe("", Str.split("")), [""])
  })

  it("trim", () => {
    strictEqual(pipe(" a ", Str.trim), "a")
  })

  it("trimStart", () => {
    strictEqual(pipe(" a ", Str.trimStart), "a ")
  })

  it("trimEnd", () => {
    strictEqual(pipe(" a ", Str.trimEnd), " a")
  })

  it("includes", () => {
    assertTrue(pipe("abc", Str.includes("b")))
    assertFalse(pipe("abc", Str.includes("d")))
    assertTrue(pipe("abc", Str.includes("b", 1)))
    assertFalse(pipe("abc", Str.includes("a", 1)))
  })

  it("startsWith", () => {
    assertTrue(pipe("abc", Str.startsWith("a")))
    assertFalse(pipe("bc", Str.startsWith("a")))
    assertTrue(pipe("abc", Str.startsWith("b", 1)))
    assertFalse(pipe("bc", Str.startsWith("a", 1)))
  })

  it("endsWith", () => {
    assertTrue(pipe("abc", Str.endsWith("c")))
    assertFalse(pipe("ab", Str.endsWith("c")))
    assertTrue(pipe("abc", Str.endsWith("b", 2)))
    assertFalse(pipe("abc", Str.endsWith("c", 2)))
  })

  it("slice", () => {
    deepStrictEqual(pipe("abcd", Str.slice(1, 3)), "bc")
  })

  it("charCodeAt", () => {
    assertSome(pipe("abc", Str.charCodeAt(1)), 98)
    assertNone(pipe("abc", Str.charCodeAt(4)))
  })

  it("substring", () => {
    strictEqual(pipe("abcd", Str.substring(1)), "bcd")
    strictEqual(pipe("abcd", Str.substring(1, 3)), "bc")
  })

  it("at", () => {
    assertSome(pipe("abc", Str.at(1)), "b")
    assertNone(pipe("abc", Str.at(4)))
  })

  it("charAt", () => {
    assertSome(pipe("abc", Str.charAt(1)), "b")
    assertNone(pipe("abc", Str.charAt(4)))
  })

  it("codePointAt", () => {
    assertSome(pipe("abc", Str.codePointAt(1)), 98)
    assertNone(pipe("abc", Str.codePointAt(4)))
  })

  it("indexOf", () => {
    assertSome(pipe("abbbc", Str.indexOf("b")), 1)
    assertNone(pipe("abbbc", Str.indexOf("d")))
  })

  it("lastIndexOf", () => {
    assertSome(pipe("abbbc", Str.lastIndexOf("b")), 3)
    assertNone(pipe("abbbc", Str.lastIndexOf("d")))
  })

  it("localeCompare", () => {
    strictEqual(pipe("a", Str.localeCompare("b")), -1)
    strictEqual(pipe("b", Str.localeCompare("a")), 1)
    strictEqual(pipe("a", Str.localeCompare("a")), 0)
  })

  it("match", () => {
    assertSome(pipe("a", Str.match(/a/)), "a".match(/a/))
    assertNone(pipe("a", Str.match(/b/)))
  })

  it("matchAll", () => {
    strictEqual(Array.from(pipe("apple, banana", Str.matchAll(/a[pn]/g))).length, 3)
    strictEqual(Array.from(pipe("apple, banana", Str.matchAll(/c/g))).length, 0)
  })

  it("normalize", () => {
    const str = "\u1E9B\u0323"
    strictEqual(pipe(str, Str.normalize()), "\u1E9B\u0323")
    strictEqual(pipe(str, Str.normalize("NFC")), "\u1E9B\u0323")
    strictEqual(pipe(str, Str.normalize("NFD")), "\u017F\u0323\u0307")
    strictEqual(pipe(str, Str.normalize("NFKC")), "\u1E69")
    strictEqual(pipe(str, Str.normalize("NFKD")), "\u0073\u0323\u0307")
  })

  it("padEnd", () => {
    strictEqual(pipe("a", Str.padEnd(5)), "a    ")
    strictEqual(pipe("a", Str.padEnd(5, "_")), "a____")
  })

  it("padStart", () => {
    strictEqual(pipe("a", Str.padStart(5)), "    a")
    strictEqual(pipe("a", Str.padStart(5, "_")), "____a")
  })

  it("repeat", () => {
    strictEqual(pipe("a", Str.repeat(3)), "aaa")
  })

  it("replaceAll", () => {
    strictEqual(pipe("ababb", Str.replaceAll("b", "c")), "acacc")
    strictEqual(pipe("ababb", Str.replaceAll(/ba/g, "cc")), "accbb")
  })

  it("search", () => {
    assertSome(pipe("ababb", Str.search("b")), 1)
    assertSome(pipe("ababb", Str.search(/abb/)), 2)
    assertNone(pipe("ababb", Str.search(/c/)))
  })

  it("toLocaleLowerCase", () => {
    const locales = ["tr", "TR", "tr-TR", "tr-u-co-search", "tr-x-turkish"]
    strictEqual(pipe("\u0130", Str.toLocaleLowerCase(locales)), "i")
  })

  it("toLocaleUpperCase", () => {
    const locales = ["lt", "LT", "lt-LT", "lt-u-co-phonebk", "lt-x-lietuva"]
    strictEqual(pipe("i\u0307", Str.toLocaleUpperCase(locales)), "I")
  })

  describe("takeLeft", () => {
    it("should take the specified number of characters from the left side of a string", () => {
      strictEqual(Str.takeLeft("Hello, World!", 7), "Hello, ")
    })

    it("should return the string for `n` larger than the string length", () => {
      const string = "Hello, World!"
      strictEqual(Str.takeLeft(string, 100), string)
    })

    it("should return the empty string for a negative `n`", () => {
      strictEqual(Str.takeLeft("Hello, World!", -1), "")
    })

    it("should round down if `n` is a float", () => {
      strictEqual(Str.takeLeft("Hello, World!", 5.5), "Hello")
    })
  })

  describe("takeRight", () => {
    it("should take the specified number of characters from the right side of a string", () => {
      strictEqual(Str.takeRight("Hello, World!", 7), " World!")
    })

    it("should return the string for `n` larger than the string length", () => {
      const string = "Hello, World!"
      strictEqual(Str.takeRight(string, 100), string)
    })

    it("should return the empty string for a negative `n`", () => {
      strictEqual(Str.takeRight("Hello, World!", -1), "")
    })

    it("should round down if `n` is a float", () => {
      strictEqual(Str.takeRight("Hello, World!", 6.5), "World!")
    })
  })

  describe("stripMargin", () => {
    it("should strip a leading prefix from each line", () => {
      const string = `|
    |Hello,
    |World!
    |`
      const result = Str.stripMargin(string)
      strictEqual(result, "\nHello,\nWorld!\n")
    })

    it("should strip a leading prefix from each line using a margin character", () => {
      const string = "\n$\n    $Hello,\r\n    $World!\n $"
      const result = Str.stripMarginWith(string, "$")
      strictEqual(result, "\n\nHello,\r\nWorld!\n")
    })
  })

  describe("linesWithSeparators", () => {
    it("should split a string into lines with separators", () => {
      const string = "\n$\n    $Hello,\r\n    $World!\n $"
      const result = Str.linesWithSeparators(string)
      deepStrictEqual(Array.from(result), ["\n", "$\n", "    $Hello,\r\n", "    $World!\n", " $"])
    })
  })

  describe("linesIterator", () => {
    it("should split a string into lines", () => {
      const string = "\n$\n    $Hello,\r\n    $World!\n $"
      const result = Str.linesIterator(string)
      deepStrictEqual(Array.from(result), ["", "$", "    $Hello,", "    $World!", " $"])
    })
  })
})
