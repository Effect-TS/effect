import { Order, pipe, String as S } from "effect"
import { assertFalse, assertNone, assertSome, assertTrue, deepStrictEqual, strictEqual } from "effect/test/util"
import { describe, it } from "vitest"

describe("String", () => {
  it("isString", () => {
    assertTrue(S.isString("a"))
    assertFalse(S.isString(1))
    assertFalse(S.isString(true))
  })

  it("empty", () => {
    strictEqual(S.empty, "")
  })

  it("Equivalence", () => {
    assertTrue(S.Equivalence("a", "a"))
    assertFalse(S.Equivalence("a", "b"))
  })

  it("Order", () => {
    const lessThan = Order.lessThan(S.Order)
    const lessThanOrEqualTo = Order.lessThanOrEqualTo(S.Order)
    assertTrue(pipe("a", lessThan("b")))
    assertFalse(pipe("a", lessThan("a")))
    assertTrue(pipe("a", lessThanOrEqualTo("a")))
    assertFalse(pipe("b", lessThan("a")))
    assertFalse(pipe("b", lessThanOrEqualTo("a")))
  })

  it("concat", () => {
    strictEqual(pipe("a", S.concat("b")), "ab")
  })

  it("isEmpty", () => {
    assertTrue(S.isEmpty(""))
    assertFalse(S.isEmpty("a"))
  })

  it("isNonEmpty", () => {
    assertFalse(S.isNonEmpty(""))
    assertTrue(S.isNonEmpty("a"))
  })

  it("length", () => {
    strictEqual(S.length(""), 0)
    strictEqual(S.length("a"), 1)
    strictEqual(S.length("aaa"), 3)
  })

  it("toUpperCase", () => {
    strictEqual(S.toUpperCase("a"), "A")
  })

  it("toLowerCase", () => {
    strictEqual(S.toLowerCase("A"), "a")
  })

  it("capitalize", () => {
    strictEqual(S.capitalize(""), "")
    strictEqual(S.capitalize("abc"), "Abc")
  })

  it("uncapitalize", () => {
    strictEqual(S.uncapitalize(""), "")
    strictEqual(S.uncapitalize("Abc"), "abc")
  })

  it("replace", () => {
    strictEqual(pipe("abc", S.replace("b", "d")), "adc")
  })

  it("split", () => {
    deepStrictEqual(pipe("abc", S.split("")), ["a", "b", "c"])
    deepStrictEqual(pipe("", S.split("")), [""])
  })

  it("trim", () => {
    strictEqual(pipe(" a ", S.trim), "a")
  })

  it("trimStart", () => {
    strictEqual(pipe(" a ", S.trimStart), "a ")
  })

  it("trimEnd", () => {
    strictEqual(pipe(" a ", S.trimEnd), " a")
  })

  it("includes", () => {
    assertTrue(pipe("abc", S.includes("b")))
    assertFalse(pipe("abc", S.includes("d")))
    assertTrue(pipe("abc", S.includes("b", 1)))
    assertFalse(pipe("abc", S.includes("a", 1)))
  })

  it("startsWith", () => {
    assertTrue(pipe("abc", S.startsWith("a")))
    assertFalse(pipe("bc", S.startsWith("a")))
    assertTrue(pipe("abc", S.startsWith("b", 1)))
    assertFalse(pipe("bc", S.startsWith("a", 1)))
  })

  it("endsWith", () => {
    assertTrue(pipe("abc", S.endsWith("c")))
    assertFalse(pipe("ab", S.endsWith("c")))
    assertTrue(pipe("abc", S.endsWith("b", 2)))
    assertFalse(pipe("abc", S.endsWith("c", 2)))
  })

  it("slice", () => {
    deepStrictEqual(pipe("abcd", S.slice(1, 3)), "bc")
  })

  it("charCodeAt", () => {
    assertSome(pipe("abc", S.charCodeAt(1)), 98)
    assertNone(pipe("abc", S.charCodeAt(4)))
  })

  it("substring", () => {
    strictEqual(pipe("abcd", S.substring(1)), "bcd")
    strictEqual(pipe("abcd", S.substring(1, 3)), "bc")
  })

  it("at", () => {
    assertSome(pipe("abc", S.at(1)), "b")
    assertNone(pipe("abc", S.at(4)))
  })

  it("charAt", () => {
    assertSome(pipe("abc", S.charAt(1)), "b")
    assertNone(pipe("abc", S.charAt(4)))
  })

  it("codePointAt", () => {
    assertSome(pipe("abc", S.codePointAt(1)), 98)
    assertNone(pipe("abc", S.codePointAt(4)))
  })

  it("indexOf", () => {
    assertSome(pipe("abbbc", S.indexOf("b")), 1)
    assertNone(pipe("abbbc", S.indexOf("d")))
  })

  it("lastIndexOf", () => {
    assertSome(pipe("abbbc", S.lastIndexOf("b")), 3)
    assertNone(pipe("abbbc", S.lastIndexOf("d")))
  })

  it("localeCompare", () => {
    strictEqual(pipe("a", S.localeCompare("b")), -1)
    strictEqual(pipe("b", S.localeCompare("a")), 1)
    strictEqual(pipe("a", S.localeCompare("a")), 0)
  })

  it("match", () => {
    assertSome(pipe("a", S.match(/a/)), "a".match(/a/))
    assertNone(pipe("a", S.match(/b/)))
  })

  it("matchAll", () => {
    strictEqual(Array.from(pipe("apple, banana", S.matchAll(/a[pn]/g))).length, 3)
    strictEqual(Array.from(pipe("apple, banana", S.matchAll(/c/g))).length, 0)
  })

  it("normalize", () => {
    const str = "\u1E9B\u0323"
    strictEqual(pipe(str, S.normalize()), "\u1E9B\u0323")
    strictEqual(pipe(str, S.normalize("NFC")), "\u1E9B\u0323")
    strictEqual(pipe(str, S.normalize("NFD")), "\u017F\u0323\u0307")
    strictEqual(pipe(str, S.normalize("NFKC")), "\u1E69")
    strictEqual(pipe(str, S.normalize("NFKD")), "\u0073\u0323\u0307")
  })

  it("padEnd", () => {
    strictEqual(pipe("a", S.padEnd(5)), "a    ")
    strictEqual(pipe("a", S.padEnd(5, "_")), "a____")
  })

  it("padStart", () => {
    strictEqual(pipe("a", S.padStart(5)), "    a")
    strictEqual(pipe("a", S.padStart(5, "_")), "____a")
  })

  it("repeat", () => {
    strictEqual(pipe("a", S.repeat(3)), "aaa")
  })

  it("replaceAll", () => {
    strictEqual(pipe("ababb", S.replaceAll("b", "c")), "acacc")
    strictEqual(pipe("ababb", S.replaceAll(/ba/g, "cc")), "accbb")
  })

  it("search", () => {
    assertSome(pipe("ababb", S.search("b")), 1)
    assertSome(pipe("ababb", S.search(/abb/)), 2)
    assertNone(pipe("ababb", S.search(/c/)))
  })

  it("toLocaleLowerCase", () => {
    const locales = ["tr", "TR", "tr-TR", "tr-u-co-search", "tr-x-turkish"]
    strictEqual(pipe("\u0130", S.toLocaleLowerCase(locales)), "i")
  })

  it("toLocaleUpperCase", () => {
    const locales = ["lt", "LT", "lt-LT", "lt-u-co-phonebk", "lt-x-lietuva"]
    strictEqual(pipe("i\u0307", S.toLocaleUpperCase(locales)), "I")
  })

  describe("takeLeft", () => {
    it("should take the specified number of characters from the left side of a string", () => {
      strictEqual(S.takeLeft("Hello, World!", 7), "Hello, ")
    })

    it("should return the string for `n` larger than the string length", () => {
      const string = "Hello, World!"
      strictEqual(S.takeLeft(string, 100), string)
    })

    it("should return the empty string for a negative `n`", () => {
      strictEqual(S.takeLeft("Hello, World!", -1), "")
    })

    it("should round down if `n` is a float", () => {
      strictEqual(S.takeLeft("Hello, World!", 5.5), "Hello")
    })
  })

  describe("takeRight", () => {
    it("should take the specified number of characters from the right side of a string", () => {
      strictEqual(S.takeRight("Hello, World!", 7), " World!")
    })

    it("should return the string for `n` larger than the string length", () => {
      const string = "Hello, World!"
      strictEqual(S.takeRight(string, 100), string)
    })

    it("should return the empty string for a negative `n`", () => {
      strictEqual(S.takeRight("Hello, World!", -1), "")
    })

    it("should round down if `n` is a float", () => {
      strictEqual(S.takeRight("Hello, World!", 6.5), "World!")
    })
  })

  describe("stripMargin", () => {
    it("should strip a leading prefix from each line", () => {
      const string = `|
    |Hello,
    |World!
    |`
      const result = S.stripMargin(string)
      strictEqual(result, "\nHello,\nWorld!\n")
    })

    it("should strip a leading prefix from each line using a margin character", () => {
      const string = "\n$\n    $Hello,\r\n    $World!\n $"
      const result = S.stripMarginWith(string, "$")
      strictEqual(result, "\n\nHello,\r\nWorld!\n")
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
})
