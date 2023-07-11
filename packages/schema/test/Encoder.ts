import * as O from "@effect/data/Option"
import * as P from "@effect/schema/Parser"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

// raises an error while encoding from a number if the string is not a char
const NumberFromChar = S.string.pipe(S.maxLength(1), S.numberFromString)

// raises an error while encoding if the string is not a char
const Char = S.string.pipe(S.maxLength(1))

describe.concurrent("Encoder", () => {
  it("encode", () => {
    const schema = NumberFromChar
    expect(P.encodeSync(schema)(1)).toEqual("1")
    expect(() => P.encodeSync(schema)(10)).toThrowError(
      new Error(`error(s) found
└─ Expected a string at most 1 character(s) long, actual "10"`)
    )
  })

  it("encodeOption", () => {
    const schema = S.string.pipe(S.maxLength(1), S.numberFromString)
    expect(P.encodeOption(schema)(1)).toEqual(O.some("1"))
    expect(P.encodeOption(schema)(10)).toEqual(O.none())
  })

  it("never", async () => {
    const schema = S.never
    await Util.expectEncodeFailure(schema, 1 as any as never, "Expected never, actual 1")
  })

  it("string", async () => {
    const schema = S.string
    await Util.expectEncodeSuccess(schema, "a", "a")
  })

  it("number", async () => {
    const schema = S.number
    await Util.expectEncodeSuccess(schema, 1, 1)
  })

  it("boolean", async () => {
    const schema = S.boolean
    await Util.expectEncodeSuccess(schema, true, true)
    await Util.expectEncodeSuccess(schema, false, false)
  })

  it("bigint", async () => {
    const schema = S.bigint
    await Util.expectEncodeSuccess(schema, 1n, 1n)
  })

  it("symbol", async () => {
    const a = Symbol.for("@effect/schema/test/a")
    const schema = S.symbol
    await Util.expectEncodeSuccess(schema, a, a)
  })

  it("object", async () => {
    const schema = S.object
    await Util.expectEncodeSuccess(schema, {}, {})
    await Util.expectEncodeSuccess(schema, [], [])
    await Util.expectEncodeSuccess(schema, [1, 2, 3], [1, 2, 3])
  })

  it("literal", async () => {
    const schema = S.literal(null)
    await Util.expectEncodeSuccess(schema, null, null)
  })

  describe.concurrent("enums", () => {
    it("Numeric enums", async () => {
      enum Fruits {
        Apple,
        Banana
      }
      const schema = S.enums(Fruits)
      await Util.expectEncodeSuccess(schema, Fruits.Apple, 0)
      await Util.expectEncodeSuccess(schema, Fruits.Banana, 1)
    })

    it("String enums", async () => {
      enum Fruits {
        Apple = "apple",
        Banana = "banana",
        Cantaloupe = 0
      }
      const schema = S.enums(Fruits)
      await Util.expectEncodeSuccess(schema, Fruits.Apple, "apple")
      await Util.expectEncodeSuccess(schema, Fruits.Banana, "banana")
      await Util.expectEncodeSuccess(schema, Fruits.Cantaloupe, 0)
    })

    it("Const enums", async () => {
      const Fruits = {
        Apple: "apple",
        Banana: "banana",
        Cantaloupe: 3
      } as const
      const schema = S.enums(Fruits)
      await Util.expectEncodeSuccess(schema, Fruits.Apple, "apple")
      await Util.expectEncodeSuccess(schema, Fruits.Banana, "banana")
      await Util.expectEncodeSuccess(schema, Fruits.Cantaloupe, 3)
    })
  })

  it("tuple/empty", async () => {
    const schema = S.tuple()
    await Util.expectEncodeSuccess(schema, [], [])
  })

  it("tuple/e", async () => {
    const schema = S.tuple(NumberFromChar)
    await Util.expectEncodeSuccess(schema, [1], ["1"])
    await Util.expectEncodeFailure(
      schema,
      [10],
      `/0 Expected a string at most 1 character(s) long, actual "10"`
    )
    await Util.expectEncodeFailure(schema, [1, "b"] as any, `/1 is unexpected`)
  })

  it("tuple/e with undefined", async () => {
    const schema = S.tuple(S.union(NumberFromChar, S.undefined))
    await Util.expectEncodeSuccess(schema, [1], ["1"])
    await Util.expectEncodeSuccess(schema, [undefined], [undefined])
    await Util.expectEncodeFailure(schema, [1, "b"] as any, `/1 is unexpected`)
  })

  it("tuple/e?", async () => {
    const schema = S.tuple().pipe(S.optionalElement(NumberFromChar))
    await Util.expectEncodeSuccess(schema, [], [])
    await Util.expectEncodeSuccess(schema, [1], ["1"])
    await Util.expectEncodeFailure(
      schema,
      [10],
      `/0 Expected a string at most 1 character(s) long, actual "10"`
    )
    await Util.expectEncodeFailure(schema, [1, "b"] as any, `/1 is unexpected`)
  })

  it("tuple/e? with undefined", async () => {
    const schema = S.tuple().pipe(S.optionalElement(S.union(NumberFromChar, S.undefined)))
    await Util.expectEncodeSuccess(schema, [], [])
    await Util.expectEncodeSuccess(schema, [1], ["1"])
    await Util.expectEncodeSuccess(schema, [undefined], [undefined])
    await Util.expectEncodeFailure(schema, [1, "b"] as any, `/1 is unexpected`)
  })

  it("tuple/e + e?", async () => {
    const schema = S.tuple(S.string).pipe(S.optionalElement(NumberFromChar))
    await Util.expectEncodeSuccess(schema, ["a"], ["a"])
    await Util.expectEncodeSuccess(schema, ["a", 1], ["a", "1"])
  })

  it("tuple/e + r", async () => {
    const schema = S.tuple(S.string).pipe(S.rest(NumberFromChar))
    await Util.expectEncodeSuccess(schema, ["a"], ["a"])
    await Util.expectEncodeSuccess(schema, ["a", 1], ["a", "1"])
    await Util.expectEncodeSuccess(schema, ["a", 1, 2], ["a", "1", "2"])
  })

  it("tuple/e? + r", async () => {
    const schema = S.tuple().pipe(S.optionalElement(S.string), S.rest(NumberFromChar))
    await Util.expectEncodeSuccess(schema, [], [])
    await Util.expectEncodeSuccess(schema, ["a"], ["a"])
    await Util.expectEncodeSuccess(schema, ["a", 1], ["a", "1"])
    await Util.expectEncodeSuccess(schema, ["a", 1, 2], ["a", "1", "2"])
  })

  it("tuple/r", async () => {
    const schema = S.array(NumberFromChar)
    await Util.expectEncodeSuccess(schema, [], [])
    await Util.expectEncodeSuccess(schema, [1], ["1"])
    await Util.expectEncodeSuccess(schema, [1, 2], ["1", "2"])
    await Util.expectEncodeFailure(
      schema,
      [10],
      `/0 Expected a string at most 1 character(s) long, actual "10"`
    )
  })

  it("tuple/r + e", async () => {
    const schema = S.array(S.string).pipe(S.element(NumberFromChar))
    await Util.expectEncodeSuccess(schema, [1], ["1"])
    await Util.expectEncodeSuccess(schema, ["a", 1], ["a", "1"])
    await Util.expectEncodeSuccess(schema, ["a", "b", 1], ["a", "b", "1"])
    await Util.expectEncodeFailure(schema, [] as any, `/0 is missing`)
    await Util.expectEncodeFailure(
      schema,
      [10],
      `/0 Expected a string at most 1 character(s) long, actual "10"`
    )
  })

  it("tuple/e + r + e", async () => {
    const schema = S.tuple(S.string).pipe(S.rest(NumberFromChar), S.element(S.boolean))
    await Util.expectEncodeSuccess(schema, ["a", true], ["a", true])
    await Util.expectEncodeSuccess(schema, ["a", 1, true], ["a", "1", true])
    await Util.expectEncodeSuccess(schema, ["a", 1, 2, true], ["a", "1", "2", true])
  })

  it("struct/ required property signature", async () => {
    const schema = S.struct({ a: S.number })
    await Util.expectEncodeSuccess(schema, { a: 1 }, { a: 1 })
    await Util.expectEncodeFailure(
      schema,
      { a: 1, b: "b" } as any,
      `/b is unexpected`,
      Util.onExcessPropertyError
    )
  })

  it("struct/ required property signature with undefined", async () => {
    const schema = S.struct({ a: S.union(S.number, S.undefined) })
    await Util.expectEncodeSuccess(schema, { a: 1 }, { a: 1 })
    await Util.expectEncodeSuccess(schema, { a: undefined }, { a: undefined })
    await Util.expectEncodeFailure(
      schema,
      { a: 1, b: "b" } as any,
      `/b is unexpected`,
      Util.onExcessPropertyError
    )
  })

  it("struct/ optional property signature", async () => {
    const schema = S.struct({ a: S.optional(S.number) })
    await Util.expectEncodeSuccess(schema, {}, {})
    await Util.expectEncodeSuccess(schema, { a: 1 }, { a: 1 })
    await Util.expectEncodeFailure(
      schema,
      { a: 1, b: "b" } as any,
      `/b is unexpected`,
      Util.onExcessPropertyError
    )
  })

  it("struct/ optional property signature with undefined", async () => {
    const schema = S.struct({ a: S.optional(S.union(S.number, S.undefined)) })
    await Util.expectEncodeSuccess(schema, {}, {})
    await Util.expectEncodeSuccess(schema, { a: 1 }, { a: 1 })
    await Util.expectEncodeSuccess(schema, { a: undefined }, { a: undefined })
    await Util.expectEncodeFailure(
      schema,
      { a: 1, b: "b" } as any,
      `/b is unexpected`,
      Util.onExcessPropertyError
    )
  })

  it("struct/ should handle symbols as keys", async () => {
    const a = Symbol.for("@effect/schema/test/a")
    const schema = S.struct({ [a]: S.string })
    await Util.expectEncodeSuccess(schema, { [a]: "a" }, { [a]: "a" })
  })

  it("record/ key error", async () => {
    const schema = S.record(Char, S.string)
    await Util.expectEncodeFailure(
      schema,
      { aa: "a" },
      `/aa Expected a string at most 1 character(s) long, actual "aa"`
    )
  })

  it("record/ value error", async () => {
    const schema = S.record(S.string, Char)
    await Util.expectEncodeFailure(
      schema,
      { a: "aa" },
      `/a Expected a string at most 1 character(s) long, actual "aa"`
    )
  })

  it("extend/record/ record(string, NumberFromString)", async () => {
    const schema = S.struct({ a: S.number }).pipe(
      S.extend(S.record(S.string, NumberFromChar))
    )
    await Util.expectEncodeSuccess(schema, { a: 1 }, { a: 1 })
    await Util.expectEncodeSuccess(schema, { a: 1, b: 1 }, { a: 1, b: "1" })
  })

  it("extend/record/ record(symbol, NumberFromString)", async () => {
    const b = Symbol.for("@effect/schema/test/b")
    const schema = S.struct({ a: S.number }).pipe(
      S.extend(S.record(S.symbol, NumberFromChar))
    )
    await Util.expectEncodeSuccess(schema, { a: 1 }, { a: 1 })
    await Util.expectEncodeSuccess(schema, { a: 1, [b]: 1 }, { a: 1, [b]: "1" })
  })

  it("union", async () => {
    const schema = S.union(S.string, NumberFromChar)
    await Util.expectEncodeSuccess(schema, "a", "a")
    await Util.expectEncodeSuccess(schema, 1, "1")
  })

  it("union/ more required property signatures", async () => {
    const a = S.struct({ a: S.string })
    const ab = S.struct({ a: S.string, b: S.number })
    const schema = S.union(a, ab)
    await Util.expectEncodeSuccess(schema, { a: "a", b: 1 }, { a: "a", b: 1 })
  })

  it("union/ optional property signatures", async () => {
    const ab = S.struct({ a: S.string, b: S.optional(S.number) })
    const ac = S.struct({ a: S.string, c: S.optional(S.number) })
    const schema = S.union(ab, ac)
    await Util.expectEncodeSuccess(
      schema,
      { a: "a", c: 1 },
      { a: "a" }
    )
    await Util.expectEncodeSuccess(
      schema,
      { a: "a", c: 1 },
      { a: "a", c: 1 },
      Util.onExcessPropertyError
    )
  })

  it("lazy", async () => {
    interface A {
      readonly a: number
      readonly as: ReadonlyArray<A>
    }
    interface FromA {
      readonly a: string
      readonly as: ReadonlyArray<FromA>
    }
    const schema: S.Schema<FromA, A> = S.lazy<FromA, A>(() =>
      S.struct({
        a: NumberFromChar,
        as: S.array(schema)
      })
    )
    await Util.expectEncodeSuccess(schema, { a: 1, as: [] }, { a: "1", as: [] })
    await Util.expectEncodeSuccess(schema, { a: 1, as: [{ a: 2, as: [] }] }, {
      a: "1",
      as: [{ a: "2", as: [] }]
    })
  })

  it("struct/ empty", async () => {
    const schema = S.struct({})
    await Util.expectEncodeSuccess(schema, {}, {})
    await Util.expectEncodeSuccess(schema, { a: 1 }, { a: 1 })
    await Util.expectEncodeSuccess(schema, [], [])

    await Util.expectEncodeFailure(
      schema,
      null as any,
      `Expected <anonymous type literal schema>, actual null`
    )
  })

  // ---------------------------------------------
  // allErrors option
  // ---------------------------------------------

  it("allErrors/tuple: unexpected indexes", async () => {
    const schema = S.tuple()
    await Util.expectEncodeFailure(
      schema,
      [1, 1] as any,
      `/0 is unexpected, /1 is unexpected`,
      Util.allErrors
    )
  })

  it("allErrors/tuple: wrong type for values", async () => {
    const schema = S.tuple(NumberFromChar, NumberFromChar)
    await Util.expectEncodeFailure(
      schema,
      [10, 10],
      `/0 Expected a string at most 1 character(s) long, actual "10", /1 Expected a string at most 1 character(s) long, actual "10"`,
      Util.allErrors
    )
  })

  it("allErrors/tuple/rest: wrong type for values", async () => {
    const schema = S.array(NumberFromChar)
    await Util.expectEncodeFailure(
      schema,
      [10, 10],
      `/0 Expected a string at most 1 character(s) long, actual "10", /1 Expected a string at most 1 character(s) long, actual "10"`,
      Util.allErrors
    )
  })

  it("allErrors/tuple/post rest elements: wrong type for values", async () => {
    const schema = S.array(S.string).pipe(S.element(NumberFromChar), S.element(NumberFromChar))
    await Util.expectEncodeFailure(
      schema,
      [10, 10],
      `/0 Expected a string at most 1 character(s) long, actual "10", /1 Expected a string at most 1 character(s) long, actual "10"`,
      Util.allErrors
    )
  })

  it("allErrors/struct: wrong type for values", async () => {
    const schema = S.struct({ a: NumberFromChar, b: NumberFromChar })
    await Util.expectEncodeFailure(
      schema,
      { a: 10, b: 10 },
      `/a Expected a string at most 1 character(s) long, actual "10", /b Expected a string at most 1 character(s) long, actual "10"`,
      Util.allErrors
    )
  })

  it("allErrors/record/ all key errors", async () => {
    const schema = S.record(Char, S.string)
    await Util.expectEncodeFailure(
      schema,
      { aa: "a", bb: "bb" },
      `/aa Expected a string at most 1 character(s) long, actual "aa", /bb Expected a string at most 1 character(s) long, actual "bb"`,
      Util.allErrors
    )
  })

  it("allErrors/record/ all value errors", async () => {
    const schema = S.record(S.string, Char)
    await Util.expectEncodeFailure(
      schema,
      { a: "aa", b: "bb" },
      `/a Expected a string at most 1 character(s) long, actual "aa", /b Expected a string at most 1 character(s) long, actual "bb"`,
      Util.allErrors
    )
  })
})
