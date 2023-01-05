import { pipe } from "@fp-ts/data/Function"
import * as P from "@fp-ts/schema/data/parser"
import * as E from "@fp-ts/schema/Encoder"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

const NumberFromString = pipe(S.string, P.parseNumber)

describe.concurrent("Encoder", () => {
  it("exports", () => {
    expect(E.make).exist
    expect(E.encode).exist
    expect(E.encodeOrThrow).exist
    expect(E.encoderFor).exist
  })

  it("sensitive", () => {
    const schema = S.struct({ password: S.sensitive(pipe(S.string, S.minLength(8))) })
    const encoder = E.encoderFor(schema)
    Util.expectEncodingFailure(
      encoder,
      { password: "pwd123" },
      `/password "**********" did not satisfy refinement({"minLength":8})`
    )
  })

  it("templateLiteral. a${string}b", () => {
    const schema = S.templateLiteral(S.literal("a"), S.string, S.literal("b"))
    const encoder = E.encoderFor(schema)
    Util.expectEncodingSuccess(encoder, "acb", "acb")
  })

  it("string", () => {
    const encoder = E.encoderFor(S.string)
    Util.expectEncodingSuccess(encoder, "a", "a")
  })

  it("number", () => {
    const encoder = E.encoderFor(S.number)
    Util.expectEncodingSuccess(encoder, 1, 1)
  })

  it("boolean", () => {
    const encoder = E.encoderFor(S.boolean)
    Util.expectEncodingSuccess(encoder, true, true)
    Util.expectEncodingSuccess(encoder, false, false)
  })

  it("bigint", () => {
    const encoder = E.encoderFor(S.bigint)
    Util.expectEncodingSuccess(encoder, 1n, 1n)
  })

  it("symbol", () => {
    const a = Symbol.for("@fp-ts/schema/test/a")
    const encoder = E.encoderFor(S.symbol)
    Util.expectEncodingSuccess(encoder, a, a)
  })

  it("object", () => {
    const encoder = E.encoderFor(S.object)
    Util.expectEncodingSuccess(encoder, {}, {})
    Util.expectEncodingSuccess(encoder, [], [])
    Util.expectEncodingSuccess(encoder, [1, 2, 3], [1, 2, 3])
  })

  it("literal", () => {
    const encoder = E.encoderFor(S.literal(null))
    Util.expectEncodingSuccess(encoder, null, null)
  })

  describe.concurrent("enums", () => {
    it("Numeric enums", () => {
      enum Fruits {
        Apple,
        Banana
      }
      const schema = S.enums(Fruits)
      const encoder = E.encoderFor(schema)
      Util.expectEncodingSuccess(encoder, Fruits.Apple, 0)
      Util.expectEncodingSuccess(encoder, Fruits.Banana, 1)
    })

    it("String enums", () => {
      enum Fruits {
        Apple = "apple",
        Banana = "banana",
        Cantaloupe = 0
      }
      const schema = S.enums(Fruits)
      const encoder = E.encoderFor(schema)
      Util.expectEncodingSuccess(encoder, Fruits.Apple, "apple")
      Util.expectEncodingSuccess(encoder, Fruits.Banana, "banana")
      Util.expectEncodingSuccess(encoder, Fruits.Cantaloupe, 0)
    })

    it("Const enums", () => {
      const Fruits = {
        Apple: "apple",
        Banana: "banana",
        Cantaloupe: 3
      } as const
      const schema = S.enums(Fruits)
      const encoder = E.encoderFor(schema)
      Util.expectEncodingSuccess(encoder, Fruits.Apple, "apple")
      Util.expectEncodingSuccess(encoder, Fruits.Banana, "banana")
      Util.expectEncodingSuccess(encoder, Fruits.Cantaloupe, 3)
    })
  })

  it("tuple. empty", () => {
    const schema = S.tuple()
    const encoder = E.encoderFor(schema)
    Util.expectEncodingSuccess(encoder, [], [])
  })

  it("tuple. required element", () => {
    const schema = S.tuple(NumberFromString)
    const encoder = E.encoderFor(schema)
    Util.expectEncodingSuccess(encoder, [1], ["1"])
    const x = [1, "b"] as any
    Util.expectEncodingWarning(encoder, x, ["1"], `/1 is unexpected`)
  })

  it("tuple. required element with undefined", () => {
    const schema = S.tuple(S.union(NumberFromString, S.undefined))
    const encoder = E.encoderFor(schema)
    Util.expectEncodingSuccess(encoder, [1], ["1"])
    Util.expectEncodingSuccess(encoder, [undefined], [undefined])
    const x = [1, "b"] as any
    Util.expectEncodingWarning(encoder, x, ["1"], `/1 is unexpected`)
  })

  it("tuple. optional element", () => {
    const schema = pipe(S.tuple(), S.optionalElement(NumberFromString))
    const encoder = E.encoderFor(schema)
    Util.expectEncodingSuccess(encoder, [], [])
    Util.expectEncodingSuccess(encoder, [1], ["1"])
    const x = [1, "b"] as any
    Util.expectEncodingWarning(encoder, x, ["1"], `/1 is unexpected`)
  })

  it("tuple. optional element with undefined", () => {
    const schema = pipe(S.tuple(), S.optionalElement(S.union(NumberFromString, S.undefined)))
    const encoder = E.encoderFor(schema)
    Util.expectEncodingSuccess(encoder, [], [])
    Util.expectEncodingSuccess(encoder, [1], ["1"])
    const x = [1, "b"] as any
    Util.expectEncodingWarning(encoder, x, ["1"], `/1 is unexpected`)
    Util.expectEncodingSuccess(encoder, [undefined], [undefined])
  })

  it("tuple. e + e?", () => {
    const schema = pipe(S.tuple(S.string), S.optionalElement(NumberFromString))
    const encoder = E.encoderFor(schema)
    Util.expectEncodingSuccess(encoder, ["a"], ["a"])
    Util.expectEncodingSuccess(encoder, ["a", 1], ["a", "1"])
  })

  it("tuple. e + r", () => {
    const schema = pipe(S.tuple(S.string), S.rest(NumberFromString))
    const encoder = E.encoderFor(schema)
    Util.expectEncodingSuccess(encoder, ["a"], ["a"])
    Util.expectEncodingSuccess(encoder, ["a", 1], ["a", "1"])
    Util.expectEncodingSuccess(encoder, ["a", 1, 2], ["a", "1", "2"])
  })

  it("tuple. e? + r", () => {
    const schema = pipe(S.tuple(), S.optionalElement(S.string), S.rest(NumberFromString))
    const encoder = E.encoderFor(schema)
    Util.expectEncodingSuccess(encoder, [], [])
    Util.expectEncodingSuccess(encoder, ["a"], ["a"])
    Util.expectEncodingSuccess(encoder, ["a", 1], ["a", "1"])
    Util.expectEncodingSuccess(encoder, ["a", 1, 2], ["a", "1", "2"])
  })

  it("tuple. r", () => {
    const schema = S.array(NumberFromString)
    const encoder = E.encoderFor(schema)
    Util.expectEncodingSuccess(encoder, [], [])
    Util.expectEncodingSuccess(encoder, [1], ["1"])
    Util.expectEncodingSuccess(encoder, [1, 2], ["1", "2"])
  })

  it("tuple. r + e", () => {
    const schema = pipe(S.array(S.string), S.element(NumberFromString))
    const encoder = E.encoderFor(schema)
    Util.expectEncodingSuccess(encoder, [1], ["1"])
    Util.expectEncodingSuccess(encoder, ["a", 1], ["a", "1"])
    Util.expectEncodingSuccess(encoder, ["a", "b", 1], ["a", "b", "1"])
  })

  it("tuple. e + r + e", () => {
    const schema = pipe(S.tuple(S.string), S.rest(NumberFromString), S.element(S.boolean))
    const encoder = E.encoderFor(schema)
    Util.expectEncodingSuccess(encoder, ["a", true], ["a", true])
    Util.expectEncodingSuccess(encoder, ["a", 1, true], ["a", "1", true])
    Util.expectEncodingSuccess(encoder, ["a", 1, 2, true], ["a", "1", "2", true])
  })

  describe.concurrent("struct", () => {
    it("required property signature", () => {
      const schema = S.struct({ a: S.number })
      const encoder = E.encoderFor(schema)
      Util.expectEncodingSuccess(encoder, { a: 1 }, { a: 1 })
      const x = { a: 1, b: "b" }
      Util.expectEncodingWarning(encoder, x, { a: 1 }, `/b is unexpected`)
    })

    it("required property signature with undefined", () => {
      const schema = S.struct({ a: S.union(S.number, S.undefined) })
      const encoder = E.encoderFor(schema)
      Util.expectEncodingSuccess(encoder, { a: 1 }, { a: 1 })
      Util.expectEncodingSuccess(encoder, { a: undefined }, { a: undefined })
      const x = { a: 1, b: "b" }
      Util.expectEncodingWarning(encoder, x, { a: 1 }, `/b is unexpected`)
    })

    it("optional property signature", () => {
      const schema = S.struct({ a: S.optional(S.number) })
      const encoder = E.encoderFor(schema)
      Util.expectEncodingSuccess(encoder, {}, {})
      Util.expectEncodingSuccess(encoder, { a: 1 }, { a: 1 })
      const x = { a: 1, b: "b" }
      Util.expectEncodingWarning(encoder, x, { a: 1 }, `/b is unexpected`)
    })

    it("optional property signature with undefined", () => {
      const schema = S.struct({ a: S.optional(S.union(S.number, S.undefined)) })
      const encoder = E.encoderFor(schema)
      Util.expectEncodingSuccess(encoder, {}, {})
      Util.expectEncodingSuccess(encoder, { a: 1 }, { a: 1 })
      const x = { a: 1, b: "b" }
      Util.expectEncodingWarning(encoder, x, { a: 1 }, `/b is unexpected`)
      Util.expectEncodingSuccess(encoder, { a: undefined }, { a: undefined })
    })

    it("extend record(string, NumberFromString)", () => {
      const schema = pipe(
        S.struct({ a: S.number }),
        S.extend(S.record(S.string, NumberFromString))
      )
      const encoder = E.encoderFor(schema)
      Util.expectEncodingSuccess(encoder, { a: 1 }, { a: "1" })
      Util.expectEncodingSuccess(encoder, { a: 1, b: 1 }, { a: "1", b: "1" })
    })

    it("extend record(symbol, NumberFromString)", () => {
      const b = Symbol.for("@fp-ts/schema/test/b")
      const schema = pipe(
        S.struct({ a: S.number }),
        S.extend(S.record(S.symbol, NumberFromString))
      )
      const encoder = E.encoderFor(schema)
      Util.expectEncodingSuccess(encoder, { a: 1 }, { a: 1 })
      Util.expectEncodingSuccess(encoder, { a: 1, [b]: 1 }, { a: 1, [b]: "1" })
    })

    it("should handle symbols as keys", () => {
      const a = Symbol.for("@fp-ts/schema/test/a")
      const schema = S.struct({ [a]: S.string })
      const encoder = E.encoderFor(schema)
      Util.expectEncodingSuccess(encoder, { [a]: "a" }, { [a]: "a" })
    })
  })

  describe.concurrent("union", () => {
    it("union", () => {
      const schema = S.union(S.string, NumberFromString)
      const encoder = E.encoderFor(schema)
      Util.expectEncodingSuccess(encoder, "a", "a")
      Util.expectEncodingSuccess(encoder, 1, "1")
    })

    describe.concurrent("should give precedence to schemas containing more infos", () => {
      it("more required property signatures", () => {
        const a = S.struct({ a: S.string })
        const ab = S.struct({ a: S.string, b: S.number })
        const schema = S.union(a, ab)
        const encoder = E.encoderFor(schema)
        Util.expectEncodingSuccess(encoder, { a: "a", b: 1 }, { a: "a", b: 1 })
      })

      it("optional property signatures", () => {
        const ab = S.struct({ a: S.string, b: S.optional(S.number) })
        const ac = S.struct({ a: S.string, c: S.optional(S.number) })
        const schema = S.union(ab, ac)
        const encoder = E.encoderFor(schema)
        Util.expectEncodingSuccess(encoder, { a: "a", c: 1 }, { a: "a", c: 1 })
      })
    })
  })

  describe.concurrent("partial", () => {
    it("struct", () => {
      const schema = pipe(S.struct({ a: S.number }), S.partial)
      const encoder = E.encoderFor(schema)
      Util.expectEncodingSuccess(encoder, {}, {})
      Util.expectEncodingSuccess(encoder, { a: 1 }, { a: 1 })
    })

    it("tuple", () => {
      const schema = pipe(S.tuple(S.string, S.number), S.partial)
      const encoder = E.encoderFor(schema)
      Util.expectEncodingSuccess(encoder, [], [])
      Util.expectEncodingSuccess(encoder, ["a"], ["a"])
      Util.expectEncodingSuccess(encoder, ["a", 1], ["a", 1])
    })

    it("array", () => {
      const schema = pipe(S.array(S.number), S.partial)
      const encoder = E.encoderFor(schema)
      Util.expectEncodingSuccess(encoder, [], [])
      Util.expectEncodingSuccess(encoder, [1], [1])
      Util.expectEncodingSuccess(encoder, [undefined], [undefined])
    })

    it("union", () => {
      const schema = pipe(S.union(S.string, S.array(S.number)), S.partial)
      const encoder = E.encoderFor(schema)
      Util.expectEncodingSuccess(encoder, "a", "a")
      Util.expectEncodingSuccess(encoder, [], [])
      Util.expectEncodingSuccess(encoder, [1], [1])
      Util.expectEncodingSuccess(encoder, [undefined], [undefined])
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
    const encoder = E.encoderFor(schema)
    Util.expectEncodingSuccess(encoder, { a: 1, as: [] }, { a: "1", as: [] })
    Util.expectEncodingSuccess(encoder, { a: 1, as: [{ a: 2, as: [] }] }, {
      a: "1",
      as: [{ a: "2", as: [] }]
    })
  })
})
