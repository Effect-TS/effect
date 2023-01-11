import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import * as DataOption from "@fp-ts/schema/data/Option"
import * as P from "@fp-ts/schema/data/parser"
import * as PE from "@fp-ts/schema/ParseError"
import type { ParseOptions } from "@fp-ts/schema/Parser"
import * as E from "@fp-ts/schema/Parser"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

// raises an error while encoding from a number if the string is not a char
const NumberFromString = pipe(S.string, S.maxLength(1), P.parseNumber)

// raises a warning while encoding if the string is not a char
const PreferChar = pipe(
  S.string,
  S.filterOrFail(
    (s) =>
      s.length === 1 ? PE.success(s) : PE.warning(
        PE.refinement({
          message: "String is not a single character",
          meta: { type: "Char" }
        }, s),
        s
      ),
    {
      message: "String is not a single character",
      meta: { type: "Char" }
    }
  )
)

// raises an error while encoding if the string is not a char
const MustChar = pipe(S.string, S.maxLength(1))

describe.concurrent("Encoder", () => {
  it("exports", () => {
    expect(E.make).exist
    expect(E.encode).exist
    expect(E.encodeOrThrow).exist
  })

  it("encodeOrThrow", () => {
    const schema = NumberFromString
    expect(E.encodeOrThrow(schema)(1)).toEqual("1")
    expect(() => E.encodeOrThrow(schema)(10)).toThrowError(
      new Error(`1 error(s) found
└─ "10" did not satisfy: String cannot exceed 1 characters`)
    )
  })

  it("never", () => {
    const schema = S.never
    Util.expectEncodingFailure(schema, 1 as any as never, "1 did not satisfy: Input must be never")
  })

  it("type alias without annotations", () => {
    const schema = DataOption.option(NumberFromString)
    Util.expectEncodingSuccess(schema, O.none, O.none)
    Util.expectEncodingSuccess(schema, O.some(1), O.some("1"))

    Util.expectEncodingFailure(
      schema,
      O.some(10),
      `member: /value "10" did not satisfy: String cannot exceed 1 characters, member: /_tag "Some" did not satisfy isEqual(None)`
    )
  })

  it("templateLiteral. a${string}b", () => {
    const schema = S.templateLiteral(S.literal("a"), S.string, S.literal("b"))
    Util.expectEncodingSuccess(schema, "acb", "acb")
  })

  it("string", () => {
    const schema = S.string
    Util.expectEncodingSuccess(schema, "a", "a")
  })

  it("number", () => {
    const schema = S.number
    Util.expectEncodingSuccess(schema, 1, 1)
  })

  it("boolean", () => {
    const schema = S.boolean
    Util.expectEncodingSuccess(schema, true, true)
    Util.expectEncodingSuccess(schema, false, false)
  })

  it("bigint", () => {
    const schema = S.bigint
    Util.expectEncodingSuccess(schema, 1n, 1n)
  })

  it("symbol", () => {
    const a = Symbol.for("@fp-ts/schema/test/a")
    const schema = S.symbol
    Util.expectEncodingSuccess(schema, a, a)
  })

  it("object", () => {
    const schema = S.object
    Util.expectEncodingSuccess(schema, {}, {})
    Util.expectEncodingSuccess(schema, [], [])
    Util.expectEncodingSuccess(schema, [1, 2, 3], [1, 2, 3])
  })

  it("literal", () => {
    const schema = S.literal(null)
    Util.expectEncodingSuccess(schema, null, null)
  })

  describe.concurrent("enums", () => {
    it("Numeric enums", () => {
      enum Fruits {
        Apple,
        Banana
      }
      const schema = S.enums("Fruits", Fruits)
      Util.expectEncodingSuccess(schema, Fruits.Apple, 0)
      Util.expectEncodingSuccess(schema, Fruits.Banana, 1)
    })

    it("String enums", () => {
      enum Fruits {
        Apple = "apple",
        Banana = "banana",
        Cantaloupe = 0
      }
      const schema = S.enums("Fruits", Fruits)
      Util.expectEncodingSuccess(schema, Fruits.Apple, "apple")
      Util.expectEncodingSuccess(schema, Fruits.Banana, "banana")
      Util.expectEncodingSuccess(schema, Fruits.Cantaloupe, 0)
    })

    it("Const enums", () => {
      const Fruits = {
        Apple: "apple",
        Banana: "banana",
        Cantaloupe: 3
      } as const
      const schema = S.enums("Fruits", Fruits)
      Util.expectEncodingSuccess(schema, Fruits.Apple, "apple")
      Util.expectEncodingSuccess(schema, Fruits.Banana, "banana")
      Util.expectEncodingSuccess(schema, Fruits.Cantaloupe, 3)
    })
  })

  it("tuple/empty", () => {
    const schema = S.tuple()
    Util.expectEncodingSuccess(schema, [], [])
  })

  it("tuple/e", () => {
    const schema = S.tuple(NumberFromString)
    Util.expectEncodingSuccess(schema, [1], ["1"])
    Util.expectEncodingFailure(
      schema,
      [10],
      `/0 "10" did not satisfy: String cannot exceed 1 characters`
    )
    Util.expectEncodingFailure(schema, [1, "b"] as any, `/1 is unexpected`)
  })

  it("tuple/e: warnings", () => {
    const schema = S.tuple(PreferChar, PreferChar)
    Util.expectEncodingWarning(
      schema,
      ["aa", "bb"],
      ["aa", "bb"],
      `/0 "aa" did not satisfy: String is not a single character, /1 "bb" did not satisfy: String is not a single character`
    )
  })

  it("tuple/e with undefined", () => {
    const schema = S.tuple(S.union(NumberFromString, S.undefined))
    Util.expectEncodingSuccess(schema, [1], ["1"])
    Util.expectEncodingSuccess(schema, [undefined], [undefined])
    Util.expectEncodingFailure(schema, [1, "b"] as any, `/1 is unexpected`)
  })

  it("tuple/e?", () => {
    const schema = pipe(S.tuple(), S.optionalElement(NumberFromString))
    Util.expectEncodingSuccess(schema, [], [])
    Util.expectEncodingSuccess(schema, [1], ["1"])
    Util.expectEncodingFailure(
      schema,
      [10],
      `/0 "10" did not satisfy: String cannot exceed 1 characters`
    )
    Util.expectEncodingFailure(schema, [1, "b"] as any, `/1 is unexpected`)
  })

  it("tuple/e? with undefined", () => {
    const schema = pipe(S.tuple(), S.optionalElement(S.union(NumberFromString, S.undefined)))
    Util.expectEncodingSuccess(schema, [], [])
    Util.expectEncodingSuccess(schema, [1], ["1"])
    Util.expectEncodingSuccess(schema, [undefined], [undefined])
    Util.expectEncodingFailure(schema, [1, "b"] as any, `/1 is unexpected`)
  })

  it("tuple/e + e?", () => {
    const schema = pipe(S.tuple(S.string), S.optionalElement(NumberFromString))
    Util.expectEncodingSuccess(schema, ["a"], ["a"])
    Util.expectEncodingSuccess(schema, ["a", 1], ["a", "1"])
  })

  it("tuple/e + r", () => {
    const schema = pipe(S.tuple(S.string), S.rest(NumberFromString))
    Util.expectEncodingSuccess(schema, ["a"], ["a"])
    Util.expectEncodingSuccess(schema, ["a", 1], ["a", "1"])
    Util.expectEncodingSuccess(schema, ["a", 1, 2], ["a", "1", "2"])
  })

  it("tuple/e? + r", () => {
    const schema = pipe(S.tuple(), S.optionalElement(S.string), S.rest(NumberFromString))
    Util.expectEncodingSuccess(schema, [], [])
    Util.expectEncodingSuccess(schema, ["a"], ["a"])
    Util.expectEncodingSuccess(schema, ["a", 1], ["a", "1"])
    Util.expectEncodingSuccess(schema, ["a", 1, 2], ["a", "1", "2"])
  })

  it("tuple/r", () => {
    const schema = S.array(NumberFromString)
    Util.expectEncodingSuccess(schema, [], [])
    Util.expectEncodingSuccess(schema, [1], ["1"])
    Util.expectEncodingSuccess(schema, [1, 2], ["1", "2"])
    Util.expectEncodingFailure(
      schema,
      [10],
      `/0 "10" did not satisfy: String cannot exceed 1 characters`
    )
  })

  it("tuple/r warnings", () => {
    const schema = S.array(PreferChar)
    Util.expectEncodingWarning(
      schema,
      ["aa", "bb"],
      ["aa", "bb"],
      `/0 "aa" did not satisfy: String is not a single character, /1 "bb" did not satisfy: String is not a single character`
    )
  })

  it("tuple/r + e", () => {
    const schema = pipe(S.array(S.string), S.element(NumberFromString))
    Util.expectEncodingSuccess(schema, [1], ["1"])
    Util.expectEncodingSuccess(schema, ["a", 1], ["a", "1"])
    Util.expectEncodingSuccess(schema, ["a", "b", 1], ["a", "b", "1"])
    Util.expectEncodingFailure(schema, [] as any, `/0 is missing`)
    Util.expectEncodingFailure(
      schema,
      [10],
      `/0 "10" did not satisfy: String cannot exceed 1 characters`
    )
  })

  it("tuple/r + e warnings", () => {
    const schema = pipe(S.array(S.number), S.element(PreferChar), S.element(PreferChar))
    Util.expectEncodingWarning(
      schema,
      [1, 2, "aa", "bb"],
      [1, 2, "aa", "bb"],
      `/2 "aa" did not satisfy: String is not a single character, /3 "bb" did not satisfy: String is not a single character`
    )
  })

  it("tuple/e + r + e", () => {
    const schema = pipe(S.tuple(S.string), S.rest(NumberFromString), S.element(S.boolean))
    Util.expectEncodingSuccess(schema, ["a", true], ["a", true])
    Util.expectEncodingSuccess(schema, ["a", 1, true], ["a", "1", true])
    Util.expectEncodingSuccess(schema, ["a", 1, 2, true], ["a", "1", "2", true])
  })

  it("struct/ required property signature", () => {
    const schema = S.struct({ a: S.number })
    Util.expectEncodingSuccess(schema, { a: 1 }, { a: 1 })
    Util.expectEncodingFailure(schema, { a: 1, b: "b" } as any, `/b is unexpected`)
  })

  it("struct/ required property signature with undefined", () => {
    const schema = S.struct({ a: S.union(S.number, S.undefined) })
    Util.expectEncodingSuccess(schema, { a: 1 }, { a: 1 })
    Util.expectEncodingSuccess(schema, { a: undefined }, { a: undefined })
    Util.expectEncodingFailure(schema, { a: 1, b: "b" } as any, `/b is unexpected`)
  })

  it("struct/ optional property signature", () => {
    const schema = S.struct({ a: S.optional(S.number) })
    Util.expectEncodingSuccess(schema, {}, {})
    Util.expectEncodingSuccess(schema, { a: 1 }, { a: 1 })
    Util.expectEncodingFailure(schema, { a: 1, b: "b" } as any, `/b is unexpected`)
  })

  it("struct/ optional property signature with undefined", () => {
    const schema = S.struct({ a: S.optional(S.union(S.number, S.undefined)) })
    Util.expectEncodingSuccess(schema, {}, {})
    Util.expectEncodingSuccess(schema, { a: 1 }, { a: 1 })
    Util.expectEncodingSuccess(schema, { a: undefined }, { a: undefined })
    Util.expectEncodingFailure(schema, { a: 1, b: "b" } as any, `/b is unexpected`)
  })

  it("struct/ should handle symbols as keys", () => {
    const a = Symbol.for("@fp-ts/schema/test/a")
    const schema = S.struct({ [a]: S.string })
    Util.expectEncodingSuccess(schema, { [a]: "a" }, { [a]: "a" })
  })

  it("struct/ property signature warnings", () => {
    const schema = S.struct({ a: PreferChar, b: PreferChar })
    Util.expectEncodingWarning(
      schema,
      { a: "aa", b: "bb" },
      { a: "aa", b: "bb" },
      `/a "aa" did not satisfy: String is not a single character, /b "bb" did not satisfy: String is not a single character`
    )
  })

  it("record/ key error", () => {
    const schema = S.record(MustChar, S.string)
    Util.expectEncodingFailure(
      schema,
      { aa: "a" },
      `/aa "aa" did not satisfy: String cannot exceed 1 characters`
    )
  })

  it("record/ value error", () => {
    const schema = S.record(S.string, MustChar)
    Util.expectEncodingFailure(
      schema,
      { a: "aa" },
      `/a "aa" did not satisfy: String cannot exceed 1 characters`
    )
  })

  it("record/ key warnings", () => {
    const schema = S.record(PreferChar, S.string)
    Util.expectEncodingWarning(
      schema,
      { aa: "a", bb: "b" },
      { aa: "a", bb: "b" },
      `/aa "aa" did not satisfy: String is not a single character, /bb "bb" did not satisfy: String is not a single character`
    )
  })

  it("record/ value warnings", () => {
    const schema = S.record(S.string, PreferChar)
    Util.expectEncodingWarning(
      schema,
      { a: "aa", b: "bb" },
      { a: "aa", b: "bb" },
      `/a "aa" did not satisfy: String is not a single character, /b "bb" did not satisfy: String is not a single character`
    )
  })

  it("extend/record/ record(string, NumberFromString)", () => {
    const schema = pipe(
      S.struct({ a: S.number }),
      S.extend(S.record(S.string, NumberFromString))
    )
    Util.expectEncodingSuccess(schema, { a: 1 }, { a: "1" })
    Util.expectEncodingSuccess(schema, { a: 1, b: 1 }, { a: "1", b: "1" })
  })

  it("extend/record/ record(symbol, NumberFromString)", () => {
    const b = Symbol.for("@fp-ts/schema/test/b")
    const schema = pipe(
      S.struct({ a: S.number }),
      S.extend(S.record(S.symbol, NumberFromString))
    )
    Util.expectEncodingSuccess(schema, { a: 1 }, { a: 1 })
    Util.expectEncodingSuccess(schema, { a: 1, [b]: 1 }, { a: 1, [b]: "1" })
  })

  it("union", () => {
    const schema = S.union(S.string, NumberFromString)
    Util.expectEncodingSuccess(schema, "a", "a")
    Util.expectEncodingSuccess(schema, 1, "1")
  })

  it("union/ more required property signatures", () => {
    const a = S.struct({ a: S.string })
    const ab = S.struct({ a: S.string, b: S.number })
    const schema = S.union(a, ab)
    Util.expectEncodingSuccess(schema, { a: "a", b: 1 }, { a: "a", b: 1 })
  })

  it("union/ optional property signatures", () => {
    const ab = S.struct({ a: S.string, b: S.optional(S.number) })
    const ac = S.struct({ a: S.string, c: S.optional(S.number) })
    const schema = S.union(ab, ac)
    Util.expectEncodingSuccess(schema, { a: "a", c: 1 }, { a: "a", c: 1 })
  })

  it("union/ forced empty union", () => {
    const schema = S.make({
      _tag: "Union",
      types: [] as any
    })
    Util.expectEncodingFailure(schema, "a", `"a" did not satisfy: Input must be never`)
  })

  describe.concurrent("partial", () => {
    it("struct", () => {
      const schema = pipe(S.struct({ a: S.number }), S.partial)
      Util.expectEncodingSuccess(schema, {}, {})
      Util.expectEncodingSuccess(schema, { a: 1 }, { a: 1 })
    })

    it("tuple", () => {
      const schema = pipe(S.tuple(S.string, S.number), S.partial)
      Util.expectEncodingSuccess(schema, [], [])
      Util.expectEncodingSuccess(schema, ["a"], ["a"])
      Util.expectEncodingSuccess(schema, ["a", 1], ["a", 1])
    })

    it("array", () => {
      const schema = pipe(S.array(S.number), S.partial)
      Util.expectEncodingSuccess(schema, [], [])
      Util.expectEncodingSuccess(schema, [1], [1])
      Util.expectEncodingSuccess(schema, [undefined], [undefined])
    })

    it("union", () => {
      const schema = pipe(S.union(S.string, S.array(S.number)), S.partial)
      Util.expectEncodingSuccess(schema, "a", "a")
      Util.expectEncodingSuccess(schema, [], [])
      Util.expectEncodingSuccess(schema, [1], [1])
      Util.expectEncodingSuccess(schema, [undefined], [undefined])
    })
  })

  it("lazy", () => {
    interface A {
      readonly a: number
      readonly as: ReadonlyArray<A>
    }
    const schema: S.Schema<A> = S.lazy<A>(() =>
      S.struct({
        a: NumberFromString,
        as: S.array(schema)
      })
    )
    Util.expectEncodingSuccess(schema, { a: 1, as: [] }, { a: "1", as: [] })
    Util.expectEncodingSuccess(schema, { a: 1, as: [{ a: 2, as: [] }] }, {
      a: "1",
      as: [{ a: "2", as: [] }]
    })
  })

  // ---------------------------------------------
  // isUnexpectedAllowed option
  // ---------------------------------------------

  const isUnexpectedAllowed: ParseOptions = {
    isUnexpectedAllowed: true
  }

  it("isUnexpectedAllowed/union/struct choose the output with less warnings related to unexpected keys / indexes", () => {
    const a = S.struct({ a: S.optional(S.number) })
    const b = S.struct({ a: S.optional(S.number), b: S.optional(S.string) })
    const schema = S.union(a, b)
    Util.expectEncodingWarning(
      schema,
      { a: 1, b: "b", c: true } as any,
      {
        a: 1,
        b: "b"
      },
      `/c is unexpected`,
      isUnexpectedAllowed
    )
  })

  it("isUnexpectedAllowed/union/tuple choose the output with less warnings related to unexpected keys / indexes", () => {
    const a = S.tuple(S.number)
    const b = pipe(S.tuple(S.number), S.optionalElement(S.string))
    const schema = S.union(a, b)
    Util.expectEncodingWarning(
      schema,
      [1, "b", true] as any,
      [1, "b"],
      `/2 is unexpected`,
      isUnexpectedAllowed
    )
  })

  it("isUnexpectedAllowed/tuple unexpected indexes", () => {
    const schema = S.tuple(S.string)
    Util.expectEncodingWarning(
      schema,
      ["a", 1, 2] as any,
      ["a"],
      `/1 is unexpected, /2 is unexpected`,
      isUnexpectedAllowed
    )
  })

  it("struct/empty", () => {
    const schema = S.struct({})
    Util.expectEncodingSuccess(schema, {}, {})
    Util.expectEncodingSuccess(schema, { a: 1 }, { a: 1 })
    Util.expectEncodingSuccess(schema, [], [])

    Util.expectEncodingFailure(
      schema,
      null as any,
      `null did not satisfy: Input must be a struct or a record`
    )
  })

  // ---------------------------------------------
  // allErrors option
  // ---------------------------------------------

  const allErrors: ParseOptions = {
    allErrors: true
  }

  it("allErrors/tuple: unexpected indexes", () => {
    const schema = S.tuple()
    Util.expectEncodingFailure(
      schema,
      [1, 1] as any,
      `/0 is unexpected, /1 is unexpected`,
      allErrors
    )
  })

  it("allErrors/tuple: wrong type for values", () => {
    const schema = S.tuple(NumberFromString, NumberFromString)
    Util.expectEncodingFailure(
      schema,
      [10, 10],
      `/0 "10" did not satisfy: String cannot exceed 1 characters, /1 "10" did not satisfy: String cannot exceed 1 characters`,
      allErrors
    )
  })

  it("allErrors/tuple/rest: wrong type for values", () => {
    const schema = S.array(NumberFromString)
    Util.expectEncodingFailure(
      schema,
      [10, 10],
      `/0 "10" did not satisfy: String cannot exceed 1 characters, /1 "10" did not satisfy: String cannot exceed 1 characters`,
      allErrors
    )
  })

  it("allErrors/tuple/post rest elements: wrong type for values", () => {
    const schema = pipe(S.array(S.string), S.element(NumberFromString), S.element(NumberFromString))
    Util.expectEncodingFailure(
      schema,
      [10, 10],
      `/0 "10" did not satisfy: String cannot exceed 1 characters, /1 "10" did not satisfy: String cannot exceed 1 characters`,
      allErrors
    )
  })

  it("allErrors/struct: wrong type for values", () => {
    const schema = S.struct({ a: NumberFromString, b: NumberFromString })
    Util.expectEncodingFailure(
      schema,
      { a: 10, b: 10 },
      `/a "10" did not satisfy: String cannot exceed 1 characters, /b "10" did not satisfy: String cannot exceed 1 characters`,
      allErrors
    )
  })

  it("allErrors/record/ all key errors", () => {
    const schema = S.record(MustChar, S.string)
    Util.expectEncodingFailure(
      schema,
      { aa: "a", bb: "bb" },
      `/aa "aa" did not satisfy: String cannot exceed 1 characters, /bb "bb" did not satisfy: String cannot exceed 1 characters`,
      allErrors
    )
  })

  it("allErrors/record/ all value errors", () => {
    const schema = S.record(S.string, MustChar)
    Util.expectEncodingFailure(
      schema,
      { a: "aa", b: "bb" },
      `/a "aa" did not satisfy: String cannot exceed 1 characters, /b "bb" did not satisfy: String cannot exceed 1 characters`,
      allErrors
    )
  })
})
