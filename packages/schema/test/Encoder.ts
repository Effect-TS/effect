import { pipe } from "@fp-ts/data/Function"
import * as P from "@fp-ts/schema/data/parser"
import type { DecodeOptions } from "@fp-ts/schema/Decoder"
import * as E from "@fp-ts/schema/Encoder"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

const NumberFromString = pipe(S.string, S.maxLength(1), P.parseNumber)

describe.concurrent("Encoder", () => {
  it("exports", () => {
    expect(E.make).exist
    expect(E.encode).exist
    expect(E.encodeOrThrow).exist
    expect(E.encoderFor).exist
  })

  it("sensitive", () => {
    const schema = S.struct({ password: S.sensitive(pipe(S.string, S.minLength(8))) })
    Util.expectEncodingFailure(
      schema,
      { password: "pwd123" },
      `/password "**********" did not satisfy refinement({"minLength":8})`
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
      const schema = S.enums(Fruits)
      Util.expectEncodingSuccess(schema, Fruits.Apple, 0)
      Util.expectEncodingSuccess(schema, Fruits.Banana, 1)
    })

    it("String enums", () => {
      enum Fruits {
        Apple = "apple",
        Banana = "banana",
        Cantaloupe = 0
      }
      const schema = S.enums(Fruits)
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
      const schema = S.enums(Fruits)
      Util.expectEncodingSuccess(schema, Fruits.Apple, "apple")
      Util.expectEncodingSuccess(schema, Fruits.Banana, "banana")
      Util.expectEncodingSuccess(schema, Fruits.Cantaloupe, 3)
    })
  })

  it("tuple. empty", () => {
    const schema = S.tuple()
    Util.expectEncodingSuccess(schema, [], [])
  })

  it("tuple. required element", () => {
    const schema = S.tuple(NumberFromString)
    Util.expectEncodingSuccess(schema, [1], ["1"])
    Util.expectEncodingFailure(schema, [10], `/0 "10" did not satisfy refinement({"maxLength":1})`)
    Util.expectEncodingFailure(schema, [1, "b"] as any, `/1 is unexpected`)
  })

  it("tuple. required element with undefined", () => {
    const schema = S.tuple(S.union(NumberFromString, S.undefined))
    Util.expectEncodingSuccess(schema, [1], ["1"])
    Util.expectEncodingSuccess(schema, [undefined], [undefined])
    Util.expectEncodingFailure(schema, [1, "b"] as any, `/1 is unexpected`)
  })

  it("tuple. optional element", () => {
    const schema = pipe(S.tuple(), S.optionalElement(NumberFromString))
    Util.expectEncodingSuccess(schema, [], [])
    Util.expectEncodingSuccess(schema, [1], ["1"])
    Util.expectEncodingFailure(schema, [10], `/0 "10" did not satisfy refinement({"maxLength":1})`)
    Util.expectEncodingFailure(schema, [1, "b"] as any, `/1 is unexpected`)
  })

  it("tuple. optional element with undefined", () => {
    const schema = pipe(S.tuple(), S.optionalElement(S.union(NumberFromString, S.undefined)))
    Util.expectEncodingSuccess(schema, [], [])
    Util.expectEncodingSuccess(schema, [1], ["1"])
    Util.expectEncodingSuccess(schema, [undefined], [undefined])
    Util.expectEncodingFailure(schema, [1, "b"] as any, `/1 is unexpected`)
  })

  it("tuple. e + e?", () => {
    const schema = pipe(S.tuple(S.string), S.optionalElement(NumberFromString))
    Util.expectEncodingSuccess(schema, ["a"], ["a"])
    Util.expectEncodingSuccess(schema, ["a", 1], ["a", "1"])
  })

  it("tuple. e + r", () => {
    const schema = pipe(S.tuple(S.string), S.rest(NumberFromString))
    Util.expectEncodingSuccess(schema, ["a"], ["a"])
    Util.expectEncodingSuccess(schema, ["a", 1], ["a", "1"])
    Util.expectEncodingSuccess(schema, ["a", 1, 2], ["a", "1", "2"])
  })

  it("tuple. e? + r", () => {
    const schema = pipe(S.tuple(), S.optionalElement(S.string), S.rest(NumberFromString))
    Util.expectEncodingSuccess(schema, [], [])
    Util.expectEncodingSuccess(schema, ["a"], ["a"])
    Util.expectEncodingSuccess(schema, ["a", 1], ["a", "1"])
    Util.expectEncodingSuccess(schema, ["a", 1, 2], ["a", "1", "2"])
  })

  it("tuple. r", () => {
    const schema = S.array(NumberFromString)
    Util.expectEncodingSuccess(schema, [], [])
    Util.expectEncodingSuccess(schema, [1], ["1"])
    Util.expectEncodingSuccess(schema, [1, 2], ["1", "2"])
    Util.expectEncodingFailure(schema, [10], `/0 "10" did not satisfy refinement({"maxLength":1})`)
  })

  it("tuple. r + e", () => {
    const schema = pipe(S.array(S.string), S.element(NumberFromString))
    Util.expectEncodingSuccess(schema, [1], ["1"])
    Util.expectEncodingSuccess(schema, ["a", 1], ["a", "1"])
    Util.expectEncodingSuccess(schema, ["a", "b", 1], ["a", "b", "1"])
    Util.expectEncodingFailure(schema, [] as any, `/0 is missing`)
    Util.expectEncodingFailure(schema, [10], `/0 "10" did not satisfy refinement({"maxLength":1})`)
  })

  it("tuple. e + r + e", () => {
    const schema = pipe(S.tuple(S.string), S.rest(NumberFromString), S.element(S.boolean))
    Util.expectEncodingSuccess(schema, ["a", true], ["a", true])
    Util.expectEncodingSuccess(schema, ["a", 1, true], ["a", "1", true])
    Util.expectEncodingSuccess(schema, ["a", 1, 2, true], ["a", "1", "2", true])
  })

  describe.concurrent("struct", () => {
    it("required property signature", () => {
      const schema = S.struct({ a: S.number })
      Util.expectEncodingSuccess(schema, { a: 1 }, { a: 1 })
      Util.expectEncodingFailure(schema, { a: 1, b: "b" } as any, `/b is unexpected`)
    })

    it("required property signature with undefined", () => {
      const schema = S.struct({ a: S.union(S.number, S.undefined) })
      Util.expectEncodingSuccess(schema, { a: 1 }, { a: 1 })
      Util.expectEncodingSuccess(schema, { a: undefined }, { a: undefined })
      Util.expectEncodingFailure(schema, { a: 1, b: "b" } as any, `/b is unexpected`)
    })

    it("optional property signature", () => {
      const schema = S.struct({ a: S.optional(S.number) })
      Util.expectEncodingSuccess(schema, {}, {})
      Util.expectEncodingSuccess(schema, { a: 1 }, { a: 1 })
      Util.expectEncodingFailure(schema, { a: 1, b: "b" } as any, `/b is unexpected`)
    })

    it("optional property signature with undefined", () => {
      const schema = S.struct({ a: S.optional(S.union(S.number, S.undefined)) })
      Util.expectEncodingSuccess(schema, {}, {})
      Util.expectEncodingSuccess(schema, { a: 1 }, { a: 1 })
      Util.expectEncodingSuccess(schema, { a: undefined }, { a: undefined })
      Util.expectEncodingFailure(schema, { a: 1, b: "b" } as any, `/b is unexpected`)
    })

    it("extend record(string, NumberFromString)", () => {
      const schema = pipe(
        S.struct({ a: S.number }),
        S.extend(S.record(S.string, NumberFromString))
      )
      Util.expectEncodingSuccess(schema, { a: 1 }, { a: "1" })
      Util.expectEncodingSuccess(schema, { a: 1, b: 1 }, { a: "1", b: "1" })
    })

    it("extend record(symbol, NumberFromString)", () => {
      const b = Symbol.for("@fp-ts/schema/test/b")
      const schema = pipe(
        S.struct({ a: S.number }),
        S.extend(S.record(S.symbol, NumberFromString))
      )
      Util.expectEncodingSuccess(schema, { a: 1 }, { a: 1 })
      Util.expectEncodingSuccess(schema, { a: 1, [b]: 1 }, { a: 1, [b]: "1" })
    })

    it("should handle symbols as keys", () => {
      const a = Symbol.for("@fp-ts/schema/test/a")
      const schema = S.struct({ [a]: S.string })
      Util.expectEncodingSuccess(schema, { [a]: "a" }, { [a]: "a" })
    })
  })

  describe.concurrent("union", () => {
    it("union", () => {
      const schema = S.union(S.string, NumberFromString)
      Util.expectEncodingSuccess(schema, "a", "a")
      Util.expectEncodingSuccess(schema, 1, "1")
    })

    describe.concurrent("should give precedence to schemas containing more infos", () => {
      it("more required property signatures", () => {
        const a = S.struct({ a: S.string })
        const ab = S.struct({ a: S.string, b: S.number })
        const schema = S.union(a, ab)
        Util.expectEncodingSuccess(schema, { a: "a", b: 1 }, { a: "a", b: 1 })
      })

      it("optional property signatures", () => {
        const ab = S.struct({ a: S.string, b: S.optional(S.number) })
        const ac = S.struct({ a: S.string, c: S.optional(S.number) })
        const schema = S.union(ab, ac)
        Util.expectEncodingSuccess(schema, { a: "a", c: 1 }, { a: "a", c: 1 })
      })
    })
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

  const isUnexpectedAllowed: DecodeOptions = {
    isUnexpectedAllowed: true
  }

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

  it("isUnexpectedAllowed/struct unexpected keys", () => {
    const schema = S.struct({})
    Util.expectEncodingWarning(
      schema,
      { a: 1, b: 2 } as any,
      {},
      `/a is unexpected, /b is unexpected`,
      isUnexpectedAllowed
    )
  })

  // ---------------------------------------------
  // allErrors option
  // ---------------------------------------------

  const allErrors: DecodeOptions = {
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
      `/0 "10" did not satisfy refinement({"maxLength":1}), /1 "10" did not satisfy refinement({"maxLength":1})`,
      allErrors
    )
  })

  it("allErrors/tuple/rest: wrong type for values", () => {
    const schema = S.array(NumberFromString)
    Util.expectEncodingFailure(
      schema,
      [10, 10],
      `/0 "10" did not satisfy refinement({"maxLength":1}), /1 "10" did not satisfy refinement({"maxLength":1})`,
      allErrors
    )
  })

  it("allErrors/tuple/post rest elements: wrong type for values", () => {
    const schema = pipe(S.array(S.string), S.element(NumberFromString), S.element(NumberFromString))
    Util.expectEncodingFailure(
      schema,
      [10, 10],
      `/0 "10" did not satisfy refinement({"maxLength":1}), /1 "10" did not satisfy refinement({"maxLength":1})`,
      allErrors
    )
  })
})
