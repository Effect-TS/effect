import * as P from "effect/ParseResult"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("is", () => {
  it("never", () => {
    const is = P.is(S.Never)
    expect(is(1)).toEqual(false)
  })

  it("string", () => {
    const is = P.is(S.String)
    expect(is("a")).toEqual(true)
    expect(is(1)).toEqual(false)
  })

  it("number", () => {
    const is = P.is(S.Number)
    expect(is(1)).toEqual(true)
    expect(is(NaN)).toEqual(true)
    expect(is(Infinity)).toEqual(true)
    expect(is(-Infinity)).toEqual(true)
    expect(is("a")).toEqual(false)
  })

  it("boolean", () => {
    const is = P.is(S.Boolean)
    expect(is(true)).toEqual(true)
    expect(is(false)).toEqual(true)
    expect(is(1)).toEqual(false)
  })

  it("bigint", () => {
    const is = P.is(S.BigIntFromSelf)
    expect(is(0n)).toEqual(true)
    expect(is(1n)).toEqual(true)
    expect(is(BigInt("1"))).toEqual(true)
    expect(is(null)).toEqual(false)
    expect(is(1.2)).toEqual(false)
  })

  it("symbol", () => {
    const a = Symbol.for("effect/Schema/test/a")
    const is = P.is(S.SymbolFromSelf)
    expect(is(a)).toEqual(true)
    expect(is("effect/Schema/test/a")).toEqual(false)
  })

  it("object", () => {
    const is = P.is(S.Object)
    expect(is({})).toEqual(true)
    expect(is([])).toEqual(true)
    expect(is(null)).toEqual(false)
    expect(is("a")).toEqual(false)
    expect(is(1)).toEqual(false)
    expect(is(true)).toEqual(false)
  })

  it("literal 1 member", () => {
    const schema = S.Literal(1)
    const is = P.is(schema)
    expect(is(1)).toEqual(true)
    expect(is("a")).toEqual(false)
    expect(is(null)).toEqual(false)
  })

  it("literal 2 members", () => {
    const schema = S.Literal(1, "a")
    const is = P.is(schema)
    expect(is(1)).toEqual(true)
    expect(is("a")).toEqual(true)
    expect(is(null)).toEqual(false)
  })

  it("uniqueSymbolFromSelf", () => {
    const a = Symbol.for("effect/Schema/test/a")
    const schema = S.UniqueSymbolFromSelf(a)
    const is = P.is(schema)
    expect(is(a)).toEqual(true)
    expect(is(Symbol.for("effect/Schema/test/a"))).toEqual(true)
    expect(is("Symbol(effect/Schema/test/a)")).toEqual(false)
  })

  it("Numeric enums", () => {
    enum Fruits {
      Apple,
      Banana
    }
    const schema = S.Enums(Fruits)
    const is = P.is(schema)
    expect(is(Fruits.Apple)).toEqual(true)
    expect(is(Fruits.Banana)).toEqual(true)
    expect(is(0)).toEqual(true)
    expect(is(1)).toEqual(true)
    expect(is(3)).toEqual(false)
  })

  it("String enums", () => {
    enum Fruits {
      Apple = "apple",
      Banana = "banana",
      Cantaloupe = 0
    }
    const schema = S.Enums(Fruits)
    const is = P.is(schema)
    expect(is(Fruits.Apple)).toEqual(true)
    expect(is(Fruits.Cantaloupe)).toEqual(true)
    expect(is("apple")).toEqual(true)
    expect(is("banana")).toEqual(true)
    expect(is(0)).toEqual(true)
    expect(is("Cantaloupe")).toEqual(false)
  })

  it("Const enums", () => {
    const Fruits = {
      Apple: "apple",
      Banana: "banana",
      Cantaloupe: 3
    } as const
    const schema = S.Enums(Fruits)
    const is = P.is(schema)
    expect(is("apple")).toEqual(true)
    expect(is("banana")).toEqual(true)
    expect(is(3)).toEqual(true)
    expect(is("Cantaloupe")).toEqual(false)
  })

  it("tuple. empty", () => {
    const schema = S.Tuple()
    const is = P.is(schema)
    expect(is([])).toEqual(true)

    expect(is(null)).toEqual(false)
    expect(is([undefined])).toEqual(false)
    expect(is([1])).toEqual(false)
    expect(is({})).toEqual(false)
  })

  it("tuple. required element", () => {
    const schema = S.Tuple(S.Number)
    const is = P.is(schema)
    expect(is([1])).toEqual(true)

    expect(is(null)).toEqual(false)
    expect(is([])).toEqual(false)
    expect(is([undefined])).toEqual(false)
    expect(is(["a"])).toEqual(false)
    expect(is([1, "b"])).toEqual(false)
  })

  it("tuple. required element with undefined", () => {
    const schema = S.Tuple(S.Union(S.Number, S.Undefined))
    const is = P.is(schema)
    expect(is([1])).toEqual(true)
    expect(is([undefined])).toEqual(true)

    expect(is(null)).toEqual(false)
    expect(is([])).toEqual(false)
    expect(is(["a"])).toEqual(false)
    expect(is([1, "b"])).toEqual(false)
  })

  it("tuple. optional element", () => {
    const schema = S.Tuple(S.optionalElement(S.Number))
    const is = P.is(schema)
    expect(is([])).toEqual(true)
    expect(is([1])).toEqual(true)

    expect(is(null)).toEqual(false)
    expect(is(["a"])).toEqual(false)
    expect(is([undefined])).toEqual(false)
    expect(is([1, "b"])).toEqual(false)
  })

  it("tuple. optional element with undefined", () => {
    const schema = S.Tuple(S.optionalElement(S.Union(S.Number, S.Undefined)))
    const is = P.is(schema)
    expect(is([])).toEqual(true)
    expect(is([1])).toEqual(true)
    expect(is([undefined])).toEqual(true)

    expect(is(null)).toEqual(false)
    expect(is(["a"])).toEqual(false)
    expect(is([1, "b"])).toEqual(false)
  })

  it("tuple. e + e?", () => {
    const schema = S.Tuple(S.String, S.optionalElement(S.Number))
    const is = P.is(schema)
    expect(is(["a"])).toEqual(true)
    expect(is(["a", 1])).toEqual(true)

    expect(is([1])).toEqual(false)
    expect(is(["a", "b"])).toEqual(false)
  })

  it("tuple. e + r", () => {
    const schema = S.Tuple([S.String], S.Number)
    const is = P.is(schema)
    expect(is(["a"])).toEqual(true)
    expect(is(["a", 1])).toEqual(true)
    expect(is(["a", 1, 2])).toEqual(true)

    expect(is([])).toEqual(false)
  })

  it("tuple. e? + r", () => {
    const schema = S.Tuple([S.optionalElement(S.String)], S.Number)
    const is = P.is(schema)
    expect(is([])).toEqual(true)
    expect(is(["a"])).toEqual(true)
    expect(is(["a", 1])).toEqual(true)
    expect(is(["a", 1, 2])).toEqual(true)

    expect(is([1])).toEqual(false)
  })

  it("tuple. r", () => {
    const schema = S.Array(S.Number)
    const is = P.is(schema)
    expect(is([])).toEqual(true)
    expect(is([1])).toEqual(true)
    expect(is([1, 2])).toEqual(true)

    expect(is(["a"])).toEqual(false)
    expect(is([1, "a"])).toEqual(false)
  })

  it("tuple. r + e", () => {
    const schema = S.Tuple([], S.String, S.Number)
    const is = P.is(schema)
    expect(is([1])).toEqual(true)
    expect(is(["a", 1])).toEqual(true)
    expect(is(["a", "b", 1])).toEqual(true)

    expect(is([])).toEqual(false)
    expect(is(["a"])).toEqual(false)
    expect(is([1, 2])).toEqual(false)
  })

  it("tuple. e + r + e", () => {
    const schema = S.Tuple([S.String], S.Number, S.Boolean)
    const is = P.is(schema)
    expect(is(["a", true])).toEqual(true)
    expect(is(["a", 1, true])).toEqual(true)
    expect(is(["a", 1, 2, true])).toEqual(true)

    expect(is([])).toEqual(false)
    expect(is(["a"])).toEqual(false)
    expect(is([true])).toEqual(false)
    expect(is(["a", 1])).toEqual(false)
    expect(is([1, true])).toEqual(false)
  })

  it("struct. empty", () => {
    const schema = S.Struct({})
    const is = P.is(schema)
    expect(is({})).toEqual(true)
    expect(is({ a: 1 })).toEqual(true)
    expect(is([])).toEqual(true)

    expect(is(null)).toEqual(false)
    expect(is(undefined)).toEqual(false)
  })

  describe("struct", () => {
    it("required property signature", () => {
      const schema = S.Struct({ a: S.Number })
      const is = P.is(schema)
      expect(is({ a: 1 })).toEqual(true)
      expect(is({ a: 1, b: "b" })).toEqual(true)

      expect(is(null)).toEqual(false)
      expect(is({})).toEqual(false)
      expect(is({ a: undefined })).toEqual(false)
      expect(is({ a: "a" })).toEqual(false)
    })

    it("required property signature with undefined", () => {
      const schema = S.Struct({ a: S.Union(S.Number, S.Undefined) })
      const is = P.is(schema)
      expect(is({ a: 1 })).toEqual(true)
      expect(is({ a: undefined })).toEqual(true)
      expect(is({ a: 1, b: "b" })).toEqual(true)

      expect(is({})).toEqual(false)
      expect(is(null)).toEqual(false)
      expect(is({ a: "a" })).toEqual(false)
    })

    it("exact optional property signature", () => {
      const schema = S.Struct({ a: S.optionalWith(S.Number, { exact: true }) })
      const is = P.is(schema)
      expect(is({})).toEqual(true)
      expect(is({ a: 1 })).toEqual(true)
      expect(is({ a: 1, b: "b" })).toEqual(true)

      expect(is(null)).toEqual(false)
      expect(is({ a: "a" })).toEqual(false)
      expect(is({ a: undefined })).toEqual(false)
    })

    it("exact optional property signature with undefined", () => {
      const schema = S.Struct({ a: S.optionalWith(S.Union(S.Number, S.Undefined), { exact: true }) })
      const is = P.is(schema)
      expect(is({})).toEqual(true)
      expect(is({ a: 1 })).toEqual(true)
      expect(is({ a: undefined })).toEqual(true)
      expect(is({ a: 1, b: "b" })).toEqual(true)

      expect(is(null)).toEqual(false)
      expect(is({ a: "a" })).toEqual(false)
    })
  })

  it("record(string, string)", () => {
    const a = Symbol.for("effect/Schema/test/a")
    const schema = S.Record({ key: S.String, value: S.String })
    const is = P.is(schema)
    expect(is(null)).toEqual(false)
    expect(is({})).toEqual(true)
    expect(is({ a: "a" })).toEqual(true)
    expect(is({ a: 1 })).toEqual(false)
    expect(is({ [a]: 1 })).toEqual(true)
    expect(is({ a: "a", b: "b" })).toEqual(true)
    expect(is({ a: "a", b: 1 })).toEqual(false)
    expect(is({ [a]: 1, b: "b" })).toEqual(true)
  })

  it("record(symbol, string)", () => {
    const a = Symbol.for("effect/Schema/test/a")
    const b = Symbol.for("effect/Schema/test/b")
    const schema = S.Record({ key: S.SymbolFromSelf, value: S.String })
    const is = P.is(schema)
    expect(is(null)).toEqual(false)
    expect(is({})).toEqual(true)
    expect(is({ [a]: "a" })).toEqual(true)
    expect(is({ [a]: 1 })).toEqual(false)
    expect(is({ a: 1 })).toEqual(true)
    expect(is({ [a]: "a", [b]: "b" })).toEqual(true)
    expect(is({ [a]: "a", [b]: 1 })).toEqual(false)
    expect(is({ a: 1, [b]: "b" })).toEqual(true)
  })

  it("record(never, number)", () => {
    const schema = S.Record({ key: S.Never, value: S.Number })
    const is = P.is(schema)
    expect(is({})).toEqual(true)
    expect(is({ a: 1 })).toEqual(true)
  })

  it("record('a' | 'b', number)", () => {
    const schema = S.Record({ key: S.Union(S.Literal("a"), S.Literal("b")), value: S.Number })
    const is = P.is(schema)
    expect(is({ a: 1, b: 2 })).toEqual(true)

    expect(is({})).toEqual(false)
    expect(is({ a: 1 })).toEqual(false)
    expect(is({ b: 2 })).toEqual(false)
  })

  it("record(keyof struct({ a, b }), number)", () => {
    const schema = S.Record({ key: S.keyof(S.Struct({ a: S.String, b: S.String })), value: S.Number })
    const is = P.is(schema)
    expect(is({ a: 1, b: 2 })).toEqual(true)

    expect(is({})).toEqual(false)
    expect(is({ a: 1 })).toEqual(false)
    expect(is({ b: 2 })).toEqual(false)
    expect(is({ a: "a" })).toEqual(false)
  })

  it("record(Symbol('a') | Symbol('b'), number)", () => {
    const a = Symbol.for("effect/Schema/test/a")
    const b = Symbol.for("effect/Schema/test/b")
    const schema = S.Record({ key: S.Union(S.UniqueSymbolFromSelf(a), S.UniqueSymbolFromSelf(b)), value: S.Number })
    const is = P.is(schema)
    expect(is({ [a]: 1, [b]: 2 })).toEqual(true)

    expect(is({})).toEqual(false)
    expect(is({ a: 1 })).toEqual(false)
    expect(is({ b: 2 })).toEqual(false)
  })

  it("record(${string}-${string}, number)", () => {
    const schema = S.Record({ key: S.TemplateLiteral(S.String, S.Literal("-"), S.String), value: S.Number })
    const is = P.is(schema)
    expect(is({})).toEqual(true)
    expect(is({ "-": 1 })).toEqual(true)
    expect(is({ "a-": 1 })).toEqual(true)
    expect(is({ "-b": 1 })).toEqual(true)
    expect(is({ "a-b": 1 })).toEqual(true)
    expect(is({ "": 1 })).toEqual(true)
    expect(is({ "a": 1 })).toEqual(true)
    expect(is({ "a": "a" })).toEqual(true)

    expect(is({ "-": "a" })).toEqual(false)
    expect(is({ "a-": "a" })).toEqual(false)
    expect(is({ "-b": "b" })).toEqual(false)
    expect(is({ "a-b": "ab" })).toEqual(false)
  })

  it("record(minLength(2), number)", () => {
    const schema = S.Record({ key: S.String.pipe(S.minLength(2)), value: S.Number })
    const is = P.is(schema)
    expect(is({})).toEqual(true)
    expect(is({ "a": 1 })).toEqual(true)
    expect(is({ "a": "a" })).toEqual(true)
    expect(is({ "aa": 1 })).toEqual(true)
    expect(is({ "aaa": 1 })).toEqual(true)

    expect(is({ "aa": "aa" })).toEqual(false)
  })

  it("record(${string}-${string}, number) & record(string, string | number)", () => {
    const schema = S.Struct(
      {},
      S.Record({ key: S.TemplateLiteral(S.String, S.Literal("-"), S.String), value: S.Number }),
      S.Record({ key: S.String, value: S.Union(S.String, S.Number) })
    )
    const is = P.is(schema)
    expect(is({})).toEqual(true)
    expect(is({ "a": "a" })).toEqual(true)
    expect(is({ "a-": 1 })).toEqual(true)

    expect(is({ "a-": "a" })).toEqual(false)
    expect(is({ "a": true })).toEqual(false)
  })

  it("union", () => {
    const schema = S.Union(S.String, S.Number)
    const is = P.is(schema)
    expect(is(null)).toEqual(false)
    expect(is(1)).toEqual(true)
    expect(is("a")).toEqual(true)
  })

  describe("suspend", () => {
    it("baseline", () => {
      interface Category {
        readonly name: string
        readonly categories: ReadonlyArray<Category>
      }
      const schema = S.Struct({
        name: S.String,
        categories: S.Array(S.suspend((): S.Schema<Category> => schema))
      })
      const is = P.is(schema)
      expect(is({ name: "a", categories: [] })).toEqual(true)
      expect(
        is({
          name: "a",
          categories: [{
            name: "b",
            categories: [{ name: "c", categories: [] }]
          }]
        })
      ).toEqual(true)
      expect(is({ name: "a", categories: [1] })).toEqual(false)
    })

    it("mutually suspended", () => {
      interface A {
        readonly a: string
        readonly bs: ReadonlyArray<B>
      }
      interface B {
        readonly b: number
        readonly as: ReadonlyArray<A>
      }
      const schemaA = S.Struct({
        a: S.String,
        bs: S.Array(S.suspend((): S.Schema<B> => schemaB))
      })
      const schemaB = S.Struct({
        b: S.Number,
        as: S.Array(S.suspend(() => schemaA))
      })
      const isA = P.is(schemaA)
      expect(isA({ a: "a1", bs: [] })).toEqual(true)
      expect(isA({ a: "a1", bs: [{ b: 1, as: [] }] })).toEqual(true)
      expect(
        isA({ a: "a1", bs: [{ b: 1, as: [{ a: "a2", bs: [] }] }] })
      ).toEqual(true)
      expect(
        isA({ a: "a1", bs: [{ b: 1, as: [{ a: "a2", bs: [null] }] }] })
      ).toEqual(false)
    })
  })

  it("union", () => {
    const schema = S.Union(S.String, S.Number)
    const is = P.is(schema)
    expect(is(null)).toEqual(false)
    expect(is(1)).toEqual(true)
    expect(is("a")).toEqual(true)
  })

  describe("rest", () => {
    it("baseline", () => {
      const schema = S.Tuple([S.String, S.Number], S.Boolean)
      const is = P.is(schema)
      expect(is(["a", 1])).toEqual(true)
      expect(is(["a", 1, true])).toEqual(true)
      expect(is(["a", 1, true, false])).toEqual(true)
      expect(is(["a", 1, true, "a"])).toEqual(false)
      expect(is(["a", 1, true, "a", true])).toEqual(false)
    })
  })

  describe("extend", () => {
    it("struct", () => {
      const schema = S.Struct({ a: S.String }).pipe(
        S.extend(S.Struct({ b: S.Number }))
      )
      const is = P.is(schema)
      expect(is({ a: "a", b: 1 })).toEqual(true)

      expect(is({})).toEqual(false)
      expect(is({ a: "a" })).toEqual(false)
    })

    it("record(string, string)", () => {
      const schema = S.Struct({ a: S.String }, S.Record({ key: S.String, value: S.String }))
      const is = P.is(schema)
      expect(is({ a: "a" })).toEqual(true)
      expect(is({ a: "a", b: "b" })).toEqual(true)

      expect(is({})).toEqual(false)
      expect(is({ b: "b" })).toEqual(false)
      expect(is({ a: 1 })).toEqual(false)
      expect(is({ a: "a", b: 2 })).toEqual(false)
    })
  })

  it("nonEmptyString", () => {
    const schema = S.String.pipe(S.nonEmptyString())
    const is = P.is(schema)
    expect(is("a")).toEqual(true)
    expect(is("aa")).toEqual(true)

    expect(is("")).toEqual(false)
  })

  it("should respect outer/inner options", () => {
    const schema = S.Struct({ a: Util.NumberFromChar })
    const input = { a: 1, b: "b" }
    expect(S.is(schema)(input, { onExcessProperty: "error" })).toEqual(false)
    expect(S.is(schema, { onExcessProperty: "error" })(input)).toEqual(false)
    expect(S.is(schema, { onExcessProperty: "error" })(input, { onExcessProperty: "ignore" }))
      .toEqual(true)
  })
})
