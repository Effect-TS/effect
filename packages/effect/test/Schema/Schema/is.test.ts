import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue } from "@effect/vitest/utils"
import * as P from "effect/ParseResult"
import * as S from "effect/Schema"
import * as Util from "../TestUtils.js"

describe("is", () => {
  it("never", () => {
    const is = P.is(S.Never)
    assertFalse(is(1))
  })

  it("string", () => {
    const is = P.is(S.String)
    assertTrue(is("a"))
    assertFalse(is(1))
  })

  it("number", () => {
    const is = P.is(S.Number)
    assertTrue(is(1))
    assertTrue(is(NaN))
    assertTrue(is(Infinity))
    assertTrue(is(-Infinity))
    assertFalse(is("a"))
  })

  it("boolean", () => {
    const is = P.is(S.Boolean)
    assertTrue(is(true))
    assertTrue(is(false))
    assertFalse(is(1))
  })

  it("bigint", () => {
    const is = P.is(S.BigIntFromSelf)
    assertTrue(is(0n))
    assertTrue(is(1n))
    assertTrue(is(BigInt("1")))
    assertFalse(is(null))
    assertFalse(is(1.2))
  })

  it("symbol", () => {
    const a = Symbol.for("effect/Schema/test/a")
    const is = P.is(S.SymbolFromSelf)
    assertTrue(is(a))
    assertFalse(is("effect/Schema/test/a"))
  })

  it("object", () => {
    const is = P.is(S.Object)
    assertTrue(is({}))
    assertTrue(is([]))
    assertFalse(is(null))
    assertFalse(is("a"))
    assertFalse(is(1))
    assertFalse(is(true))
  })

  it("literal 1 member", () => {
    const schema = S.Literal(1)
    const is = P.is(schema)
    assertTrue(is(1))
    assertFalse(is("a"))
    assertFalse(is(null))
  })

  it("literal 2 members", () => {
    const schema = S.Literal(1, "a")
    const is = P.is(schema)
    assertTrue(is(1))
    assertTrue(is("a"))
    assertFalse(is(null))
  })

  it("uniqueSymbolFromSelf", () => {
    const a = Symbol.for("effect/Schema/test/a")
    const schema = S.UniqueSymbolFromSelf(a)
    const is = P.is(schema)
    assertTrue(is(a))
    assertTrue(is(Symbol.for("effect/Schema/test/a")))
    assertFalse(is("Symbol(effect/Schema/test/a)"))
  })

  it("Numeric enums", () => {
    enum Fruits {
      Apple,
      Banana
    }
    const schema = S.Enums(Fruits)
    const is = P.is(schema)
    assertTrue(is(Fruits.Apple))
    assertTrue(is(Fruits.Banana))
    assertTrue(is(0))
    assertTrue(is(1))
    assertFalse(is(3))
  })

  it("String enums", () => {
    enum Fruits {
      Apple = "apple",
      Banana = "banana",
      Cantaloupe = 0
    }
    const schema = S.Enums(Fruits)
    const is = P.is(schema)
    assertTrue(is(Fruits.Apple))
    assertTrue(is(Fruits.Cantaloupe))
    assertTrue(is("apple"))
    assertTrue(is("banana"))
    assertTrue(is(0))
    assertFalse(is("Cantaloupe"))
  })

  it("Const enums", () => {
    const Fruits = {
      Apple: "apple",
      Banana: "banana",
      Cantaloupe: 3
    } as const
    const schema = S.Enums(Fruits)
    const is = P.is(schema)
    assertTrue(is("apple"))
    assertTrue(is("banana"))
    assertTrue(is(3))
    assertFalse(is("Cantaloupe"))
  })

  it("tuple. empty", () => {
    const schema = S.Tuple()
    const is = P.is(schema)
    assertTrue(is([]))

    assertFalse(is(null))
    assertFalse(is([undefined]))
    assertFalse(is([1]))
    assertFalse(is({}))
  })

  it("tuple. required element", () => {
    const schema = S.Tuple(S.Number)
    const is = P.is(schema)
    assertTrue(is([1]))

    assertFalse(is(null))
    assertFalse(is([]))
    assertFalse(is([undefined]))
    assertFalse(is(["a"]))
    assertFalse(is([1, "b"]))
  })

  it("tuple. required element with undefined", () => {
    const schema = S.Tuple(S.Union(S.Number, S.Undefined))
    const is = P.is(schema)
    assertTrue(is([1]))
    assertTrue(is([undefined]))

    assertFalse(is(null))
    assertFalse(is([]))
    assertFalse(is(["a"]))
    assertFalse(is([1, "b"]))
  })

  it("tuple. optional element", () => {
    const schema = S.Tuple(S.optionalElement(S.Number))
    const is = P.is(schema)
    assertTrue(is([]))
    assertTrue(is([1]))

    assertFalse(is(null))
    assertFalse(is(["a"]))
    assertFalse(is([undefined]))
    assertFalse(is([1, "b"]))
  })

  it("tuple. optional element with undefined", () => {
    const schema = S.Tuple(S.optionalElement(S.Union(S.Number, S.Undefined)))
    const is = P.is(schema)
    assertTrue(is([]))
    assertTrue(is([1]))
    assertTrue(is([undefined]))

    assertFalse(is(null))
    assertFalse(is(["a"]))
    assertFalse(is([1, "b"]))
  })

  it("tuple. e + e?", () => {
    const schema = S.Tuple(S.String, S.optionalElement(S.Number))
    const is = P.is(schema)
    assertTrue(is(["a"]))
    assertTrue(is(["a", 1]))

    assertFalse(is([1]))
    assertFalse(is(["a", "b"]))
  })

  it("tuple. e + r", () => {
    const schema = S.Tuple([S.String], S.Number)
    const is = P.is(schema)
    assertTrue(is(["a"]))
    assertTrue(is(["a", 1]))
    assertTrue(is(["a", 1, 2]))

    assertFalse(is([]))
  })

  it("tuple. e? + r", () => {
    const schema = S.Tuple([S.optionalElement(S.String)], S.Number)
    const is = P.is(schema)
    assertTrue(is([]))
    assertTrue(is(["a"]))
    assertTrue(is(["a", 1]))
    assertTrue(is(["a", 1, 2]))

    assertFalse(is([1]))
  })

  it("tuple. r", () => {
    const schema = S.Array(S.Number)
    const is = P.is(schema)
    assertTrue(is([]))
    assertTrue(is([1]))
    assertTrue(is([1, 2]))

    assertFalse(is(["a"]))
    assertFalse(is([1, "a"]))
  })

  it("tuple. r + e", () => {
    const schema = S.Tuple([], S.String, S.Number)
    const is = P.is(schema)
    assertTrue(is([1]))
    assertTrue(is(["a", 1]))
    assertTrue(is(["a", "b", 1]))

    assertFalse(is([]))
    assertFalse(is(["a"]))
    assertFalse(is([1, 2]))
  })

  it("tuple. e + r + e", () => {
    const schema = S.Tuple([S.String], S.Number, S.Boolean)
    const is = P.is(schema)
    assertTrue(is(["a", true]))
    assertTrue(is(["a", 1, true]))
    assertTrue(is(["a", 1, 2, true]))

    assertFalse(is([]))
    assertFalse(is(["a"]))
    assertFalse(is([true]))
    assertFalse(is(["a", 1]))
    assertFalse(is([1, true]))
  })

  it("struct. empty", () => {
    const schema = S.Struct({})
    const is = P.is(schema)
    assertTrue(is({}))
    assertTrue(is({ a: 1 }))
    assertTrue(is([]))

    assertFalse(is(null))
    assertFalse(is(undefined))
  })

  describe("struct", () => {
    it("required property signature", () => {
      const schema = S.Struct({ a: S.Number })
      const is = P.is(schema)
      assertTrue(is({ a: 1 }))
      assertTrue(is({ a: 1, b: "b" }))

      assertFalse(is(null))
      assertFalse(is({}))
      assertFalse(is({ a: undefined }))
      assertFalse(is({ a: "a" }))
    })

    it("required property signature with undefined", () => {
      const schema = S.Struct({ a: S.Union(S.Number, S.Undefined) })
      const is = P.is(schema)
      assertTrue(is({ a: 1 }))
      assertTrue(is({ a: undefined }))
      assertTrue(is({ a: 1, b: "b" }))

      assertFalse(is({}))
      assertFalse(is(null))
      assertFalse(is({ a: "a" }))
    })

    it("exact optional property signature", () => {
      const schema = S.Struct({ a: S.optionalWith(S.Number, { exact: true }) })
      const is = P.is(schema)
      assertTrue(is({}))
      assertTrue(is({ a: 1 }))
      assertTrue(is({ a: 1, b: "b" }))

      assertFalse(is(null))
      assertFalse(is({ a: "a" }))
      assertFalse(is({ a: undefined }))
    })

    it("exact optional property signature with undefined", () => {
      const schema = S.Struct({ a: S.optionalWith(S.Union(S.Number, S.Undefined), { exact: true }) })
      const is = P.is(schema)
      assertTrue(is({}))
      assertTrue(is({ a: 1 }))
      assertTrue(is({ a: undefined }))
      assertTrue(is({ a: 1, b: "b" }))

      assertFalse(is(null))
      assertFalse(is({ a: "a" }))
    })
  })

  it("record(string, string)", () => {
    const a = Symbol.for("effect/Schema/test/a")
    const schema = S.Record({ key: S.String, value: S.String })
    const is = P.is(schema)
    assertFalse(is(null))
    assertTrue(is({}))
    assertTrue(is({ a: "a" }))
    assertFalse(is({ a: 1 }))
    assertTrue(is({ [a]: 1 }))
    assertTrue(is({ a: "a", b: "b" }))
    assertFalse(is({ a: "a", b: 1 }))
    assertTrue(is({ [a]: 1, b: "b" }))
  })

  it("record(symbol, string)", () => {
    const a = Symbol.for("effect/Schema/test/a")
    const b = Symbol.for("effect/Schema/test/b")
    const schema = S.Record({ key: S.SymbolFromSelf, value: S.String })
    const is = P.is(schema)
    assertFalse(is(null))
    assertTrue(is({}))
    assertTrue(is({ [a]: "a" }))
    assertFalse(is({ [a]: 1 }))
    assertTrue(is({ a: 1 }))
    assertTrue(is({ [a]: "a", [b]: "b" }))
    assertFalse(is({ [a]: "a", [b]: 1 }))
    assertTrue(is({ a: 1, [b]: "b" }))
  })

  it("record(never, number)", () => {
    const schema = S.Record({ key: S.Never, value: S.Number })
    const is = P.is(schema)
    assertTrue(is({}))
    assertTrue(is({ a: 1 }))
  })

  it("record('a' | 'b', number)", () => {
    const schema = S.Record({ key: S.Union(S.Literal("a"), S.Literal("b")), value: S.Number })
    const is = P.is(schema)
    assertTrue(is({ a: 1, b: 2 }))

    assertFalse(is({}))
    assertFalse(is({ a: 1 }))
    assertFalse(is({ b: 2 }))
  })

  it("record(keyof struct({ a, b }), number)", () => {
    const schema = S.Record({ key: S.keyof(S.Struct({ a: S.String, b: S.String })), value: S.Number })
    const is = P.is(schema)
    assertTrue(is({ a: 1, b: 2 }))

    assertFalse(is({}))
    assertFalse(is({ a: 1 }))
    assertFalse(is({ b: 2 }))
    assertFalse(is({ a: "a" }))
  })

  it("record(Symbol('a') | Symbol('b'), number)", () => {
    const a = Symbol.for("effect/Schema/test/a")
    const b = Symbol.for("effect/Schema/test/b")
    const schema = S.Record({ key: S.Union(S.UniqueSymbolFromSelf(a), S.UniqueSymbolFromSelf(b)), value: S.Number })
    const is = P.is(schema)
    assertTrue(is({ [a]: 1, [b]: 2 }))

    assertFalse(is({}))
    assertFalse(is({ a: 1 }))
    assertFalse(is({ b: 2 }))
  })

  it("record(${string}-${string}, number)", () => {
    const schema = S.Record({ key: S.TemplateLiteral(S.String, S.Literal("-"), S.String), value: S.Number })
    const is = P.is(schema)
    assertTrue(is({}))
    assertTrue(is({ "-": 1 }))
    assertTrue(is({ "a-": 1 }))
    assertTrue(is({ "-b": 1 }))
    assertTrue(is({ "a-b": 1 }))
    assertTrue(is({ "": 1 }))
    assertTrue(is({ "a": 1 }))
    assertTrue(is({ "a": "a" }))

    assertFalse(is({ "-": "a" }))
    assertFalse(is({ "a-": "a" }))
    assertFalse(is({ "-b": "b" }))
    assertFalse(is({ "a-b": "ab" }))
  })

  it("record(minLength(2), number)", () => {
    const schema = S.Record({ key: S.String.pipe(S.minLength(2)), value: S.Number })
    const is = P.is(schema)
    assertTrue(is({}))
    assertTrue(is({ "a": 1 }))
    assertTrue(is({ "a": "a" }))
    assertTrue(is({ "aa": 1 }))
    assertTrue(is({ "aaa": 1 }))

    assertFalse(is({ "aa": "aa" }))
  })

  it("record(${string}-${string}, number) & record(string, string | number)", () => {
    const schema = S.Struct(
      {},
      S.Record({ key: S.TemplateLiteral(S.String, S.Literal("-"), S.String), value: S.Number }),
      S.Record({ key: S.String, value: S.Union(S.String, S.Number) })
    )
    const is = P.is(schema)
    assertTrue(is({}))
    assertTrue(is({ "a": "a" }))
    assertTrue(is({ "a-": 1 }))

    assertFalse(is({ "a-": "a" }))
    assertFalse(is({ "a": true }))
  })

  it("union", () => {
    const schema = S.Union(S.String, S.Number)
    const is = P.is(schema)
    assertFalse(is(null))
    assertTrue(is(1))
    assertTrue(is("a"))
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
      assertTrue(is({ name: "a", categories: [] }))
      assertTrue(
        is({
          name: "a",
          categories: [{
            name: "b",
            categories: [{ name: "c", categories: [] }]
          }]
        })
      )
      assertFalse(is({ name: "a", categories: [1] }))
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
      assertTrue(isA({ a: "a1", bs: [] }))
      assertTrue(isA({ a: "a1", bs: [{ b: 1, as: [] }] }))
      assertTrue(
        isA({ a: "a1", bs: [{ b: 1, as: [{ a: "a2", bs: [] }] }] })
      )
      assertFalse(
        isA({ a: "a1", bs: [{ b: 1, as: [{ a: "a2", bs: [null] }] }] })
      )
    })
  })

  it("union", () => {
    const schema = S.Union(S.String, S.Number)
    const is = P.is(schema)
    assertFalse(is(null))
    assertTrue(is(1))
    assertTrue(is("a"))
  })

  describe("rest", () => {
    it("baseline", () => {
      const schema = S.Tuple([S.String, S.Number], S.Boolean)
      const is = P.is(schema)
      assertTrue(is(["a", 1]))
      assertTrue(is(["a", 1, true]))
      assertTrue(is(["a", 1, true, false]))
      assertFalse(is(["a", 1, true, "a"]))
      assertFalse(is(["a", 1, true, "a", true]))
    })
  })

  describe("extend", () => {
    it("struct", () => {
      const schema = S.Struct({ a: S.String }).pipe(
        S.extend(S.Struct({ b: S.Number }))
      )
      const is = P.is(schema)
      assertTrue(is({ a: "a", b: 1 }))

      assertFalse(is({}))
      assertFalse(is({ a: "a" }))
    })

    it("record(string, string)", () => {
      const schema = S.Struct({ a: S.String }, S.Record({ key: S.String, value: S.String }))
      const is = P.is(schema)
      assertTrue(is({ a: "a" }))
      assertTrue(is({ a: "a", b: "b" }))

      assertFalse(is({}))
      assertFalse(is({ b: "b" }))
      assertFalse(is({ a: 1 }))
      assertFalse(is({ a: "a", b: 2 }))
    })
  })

  it("nonEmptyString", () => {
    const schema = S.String.pipe(S.nonEmptyString())
    const is = P.is(schema)
    assertTrue(is("a"))
    assertTrue(is("aa"))

    assertFalse(is(""))
  })

  it("should respect outer/inner options", () => {
    const schema = S.Struct({ a: Util.NumberFromChar })
    const input = { a: 1, b: "b" }
    assertFalse(S.is(schema)(input, { onExcessProperty: "error" }))
    assertFalse(S.is(schema, { onExcessProperty: "error" })(input))
    assertTrue(S.is(schema, { onExcessProperty: "error" })(input, { onExcessProperty: "ignore" }))
  })
})
