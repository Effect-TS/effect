import * as Arbitrary from "@effect/schema/Arbitrary"
import * as S from "@effect/schema/Schema"
import { expectValidArbitrary } from "@effect/schema/test/TestUtils"
import { isUnknown } from "effect/Predicate"
import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

describe("Arbitrary > Arbitrary", () => {
  it("exports", () => {
    expect(Arbitrary.ArbitraryHookId).exist
  })

  it("should throw on declarations without annotations", () => {
    const schema = S.declare(isUnknown)
    expect(() => Arbitrary.makeLazy(schema)).toThrow(
      new Error("cannot build an Arbitrary for a declaration without annotations (<declaration schema>)")
    )
  })

  it("make(S.typeSchema(schema))", () => {
    const schema = S.NumberFromString
    expectValidArbitrary(S.typeSchema(schema))
  })

  it("make(S.encodedSchema(schema))", () => {
    const schema = S.Struct({
      a: S.NumberFromString,
      b: S.Tuple(S.NumberFromString),
      c: S.Union(S.NumberFromString, S.Boolean),
      d: S.NumberFromString.pipe(S.positive()),
      e: S.OptionFromSelf(S.NumberFromString)
    })
    expectValidArbitrary(S.encodedSchema(schema))
  })

  describe("templateLiteral", () => {
    it("a", () => {
      const schema = S.TemplateLiteral(S.Literal("a"))
      expectValidArbitrary(schema)
    })

    it("a b", () => {
      const schema = S.TemplateLiteral(S.Literal("a"), S.Literal(" "), S.Literal("b"))
      expectValidArbitrary(schema)
    })

    it("a${string}", () => {
      const schema = S.TemplateLiteral(S.Literal("a"), S.String)
      expectValidArbitrary(schema)
    })

    it("a${number}", () => {
      const schema = S.TemplateLiteral(S.Literal("a"), S.Number)
      expectValidArbitrary(schema)
    })

    it("a", () => {
      const schema = S.TemplateLiteral(S.Literal("a"))
      expectValidArbitrary(schema)
    })

    it("${string}", () => {
      const schema = S.TemplateLiteral(S.String)
      expectValidArbitrary(schema)
    })

    it("a${string}b", () => {
      const schema = S.TemplateLiteral(S.Literal("a"), S.String, S.Literal("b"))
      expectValidArbitrary(schema)
    })
  })

  it("never", () => {
    expect(() => Arbitrary.makeLazy(S.Never)(fc)).toThrow(
      new Error("cannot build an Arbitrary for `never`")
    )
  })

  it("string", () => {
    expectValidArbitrary(S.String)
  })

  it("void", () => {
    expectValidArbitrary(S.Void)
  })

  it("number", () => {
    expectValidArbitrary(S.Number)
  })

  it("boolean", () => {
    expectValidArbitrary(S.Boolean)
  })

  it("bigint", () => {
    expectValidArbitrary(S.BigIntFromSelf)
  })

  it("symbol", () => {
    expectValidArbitrary(S.SymbolFromSelf)
  })

  it("object", () => {
    expectValidArbitrary(S.Object)
  })

  it("any", () => {
    expectValidArbitrary(S.Any)
  })

  it("unknown", () => {
    expectValidArbitrary(S.Unknown)
  })

  it("literal 1 member", () => {
    const schema = S.Literal(1)
    expectValidArbitrary(schema)
  })

  it("literal 2 members", () => {
    const schema = S.Literal(1, "a")
    expectValidArbitrary(schema)
  })

  it("uniqueSymbolFromSelf", () => {
    const a = Symbol.for("@effect/schema/test/a")
    const schema = S.UniqueSymbolFromSelf(a)
    expectValidArbitrary(schema)
  })

  it("empty enums should throw", () => {
    enum Fruits {}
    const schema = S.Enums(Fruits)
    expect(() => Arbitrary.makeLazy(schema)(fc)).toThrow(
      new Error("cannot build an Arbitrary for an empty enum")
    )
  })

  it("Numeric enums", () => {
    enum Fruits {
      Apple,
      Banana
    }
    const schema = S.Enums(Fruits)
    expectValidArbitrary(schema)
  })

  it("String enums", () => {
    enum Fruits {
      Apple = "apple",
      Banana = "banana",
      Cantaloupe = 0
    }
    const schema = S.Enums(Fruits)
    expectValidArbitrary(schema)
  })

  it("Const enums", () => {
    const Fruits = {
      Apple: "apple",
      Banana: "banana",
      Cantaloupe: 3
    } as const
    const schema = S.Enums(Fruits)
    expectValidArbitrary(schema)
  })

  it("tuple. empty", () => {
    const schema = S.Tuple()
    expectValidArbitrary(schema)
  })

  it("tuple. required element", () => {
    const schema = S.Tuple(S.Number)
    expectValidArbitrary(schema)
  })

  it("tuple. required element with undefined", () => {
    const schema = S.Tuple(S.Union(S.Number, S.Undefined))
    expectValidArbitrary(schema)
  })

  it("tuple. optional element", () => {
    const schema = S.Tuple(S.optionalElement(S.Number))
    expectValidArbitrary(schema)
  })

  it("tuple. optional element with undefined", () => {
    const schema = S.Tuple(S.optionalElement(S.Union(S.Number, S.Undefined)))
    expectValidArbitrary(schema)
  })

  it("tuple. e + e?", () => {
    const schema = S.Tuple(S.String, S.optionalElement(S.Number))
    expectValidArbitrary(schema)
  })

  it("tuple. e + r", () => {
    const schema = S.Tuple([S.String], S.Number)
    expectValidArbitrary(schema)
  })

  it("tuple. e? + r", () => {
    const schema = S.Tuple([S.optionalElement(S.String)], S.Number)
    expectValidArbitrary(schema)
  })

  it("tuple. r", () => {
    const schema = S.Array(S.Number)
    expectValidArbitrary(schema)
  })

  it("tuple. r + e", () => {
    const schema = S.Tuple([], S.String, S.Number)
    expectValidArbitrary(schema)
  })

  it("tuple. e + r + e", () => {
    const schema = S.Tuple([S.String], S.Number, S.Boolean)
    expectValidArbitrary(schema)
  })

  describe("suspend", () => {
    it("should support an arbitrary annotation", () => {
      interface A {
        readonly a: string
        readonly as: ReadonlyArray<A>
      }
      const arb: fc.Arbitrary<any> = fc.letrec((tie) => ({
        root: fc.record({
          a: fc.string(),
          as: fc.oneof(
            { depthSize: "small" },
            fc.constant([]),
            fc.array(tie("root"))
          )
        })
      })).root
      const schema: S.Schema<A> = S.Struct({
        a: S.String,
        as: S.Array(
          S.suspend(() => schema).pipe(Arbitrary.arbitrary(() => () => arb))
        )
      })
      expectValidArbitrary(schema)
    })

    it("struct", () => {
      interface A {
        readonly a: string
        readonly as: ReadonlyArray<A>
      }
      const schema: S.Schema<A> = S.Struct({
        a: S.String,
        as: S.Array(S.suspend(() => schema))
      })
      expectValidArbitrary(schema)
    })

    it("make(S.encodedSchema(schema))", () => {
      const NumberFromString = S.NumberFromString
      interface I {
        readonly a: string | I
      }
      interface A {
        readonly a: number | A
      }
      const schema: S.Schema<A, I> = S.Struct({
        a: S.Union(NumberFromString, S.suspend(() => schema))
      })

      expectValidArbitrary(S.encodedSchema(schema))
    })

    it("tuple", () => {
      type A = readonly [number, A | null]
      const schema: S.Schema<A> = S.Tuple(
        S.Number,
        S.Union(S.Literal(null), S.suspend(() => schema))
      )
      expectValidArbitrary(schema)
    })

    it("record", () => {
      type A = {
        [_: string]: A
      }
      const schema: S.Schema<A> = S.Record(S.String, S.suspend(() => schema))
      expectValidArbitrary(schema)
    })

    it("should support mutually suspended schemas", () => {
      interface Expression {
        readonly type: "expression"
        readonly value: number | Operation
      }

      interface Operation {
        readonly type: "operation"
        readonly operator: "+" | "-"
        readonly left: Expression
        readonly right: Expression
      }

      const Expression: S.Schema<Expression> = S.Struct({
        type: S.Literal("expression"),
        value: S.Union(S.JsonNumber, S.suspend(() => Operation))
      })

      const Operation: S.Schema<Operation> = S.Struct({
        type: S.Literal("operation"),
        operator: S.Union(S.Literal("+"), S.Literal("-")),
        left: Expression,
        right: Expression
      })
      expectValidArbitrary(Operation, { numRuns: 5 })
    })
  })

  describe("struct", () => {
    it("required property signature", () => {
      const schema = S.Struct({ a: S.Number })
      expectValidArbitrary(schema)
    })

    it("required property signature with undefined", () => {
      const schema = S.Struct({ a: S.Union(S.Number, S.Undefined) })
      expectValidArbitrary(schema)
    })

    it("optional property signature", () => {
      const schema = S.Struct({ a: S.optional(S.Number, { exact: true }) })
      expectValidArbitrary(schema)
    })

    it("optional property signature with undefined", () => {
      const schema = S.Struct({ a: S.optional(S.Union(S.Number, S.Undefined), { exact: true }) })
      expectValidArbitrary(schema)
    })

    it("baseline", () => {
      const schema = S.Struct({ a: S.String, b: S.Number })
      expectValidArbitrary(schema)
    })
  })

  it("union", () => {
    const schema = S.Union(S.String, S.Number)
    expectValidArbitrary(schema)
  })

  it("record(string, string)", () => {
    const schema = S.Record(S.String, S.String)
    expectValidArbitrary(schema)
  })

  it("record(symbol, string)", () => {
    const schema = S.Record(S.SymbolFromSelf, S.String)
    expectValidArbitrary(schema)
  })

  describe("array filters", () => {
    it("minItems", () => {
      const schema = S.Array(S.String).pipe(S.minItems(2))
      expectValidArbitrary(schema)
    })

    it("maxItems", () => {
      const schema = S.Array(S.String).pipe(S.maxItems(5))
      expectValidArbitrary(schema)
    })

    it("itemsCount", () => {
      const schema = S.Array(S.String).pipe(S.itemsCount(3))
      expectValidArbitrary(schema)
    })
  })

  it("extend/ struct + record", () => {
    const schema = S.Struct({ a: S.String }, S.Record(S.String, S.Union(S.String, S.Number)))
    expectValidArbitrary(schema)
  })

  describe("string filters", () => {
    it("minLength", () => {
      const schema = S.String.pipe(S.minLength(1))
      expectValidArbitrary(schema)
    })

    it("maxLength", () => {
      const schema = S.String.pipe(S.maxLength(2))
      expectValidArbitrary(schema)
    })

    it("length: number", () => {
      const schema = S.String.pipe(S.length(10))
      expectValidArbitrary(schema)
    })

    it("length: { min, max }", () => {
      const schema = S.String.pipe(S.length({ min: 2, max: 5 }))
      expectValidArbitrary(schema)
    })

    it("startsWith", () => {
      const schema = S.String.pipe(S.startsWith("a"))
      expectValidArbitrary(schema)
    })

    it("endsWith", () => {
      const schema = S.String.pipe(S.endsWith("a"))
      expectValidArbitrary(schema)
    })

    it("pattern", () => {
      const regexp = /^[A-Z]{3}[0-9]{3}$/
      const schema = S.String.pipe(S.pattern(regexp))
      expectValidArbitrary(schema)
    })

    // issue #2312
    it.skip("nonEmpty + pattern", () => {
      const schema = S.String.pipe(S.nonEmpty(), S.pattern(/^[-]*$/))
      expectValidArbitrary(schema)
    })
  })

  describe("number filters", () => {
    it("int", () => {
      const schema = S.Number.pipe(S.int())
      expectValidArbitrary(schema)
    })

    it("between + int", () => {
      const schema = S.Number.pipe(S.between(1, 10), S.int())
      expectValidArbitrary(schema)
    })

    it("int + between", () => {
      const schema = S.Number.pipe(S.int(), S.between(1, 10))
      expectValidArbitrary(schema)
    })

    it("lessThanOrEqualTo", () => {
      const schema = S.Number.pipe(S.lessThanOrEqualTo(1))
      expectValidArbitrary(schema)
    })

    it("greaterThanOrEqualTo", () => {
      const schema = S.Number.pipe(S.greaterThanOrEqualTo(1))
      expectValidArbitrary(schema)
    })

    it("lessThan", () => {
      const schema = S.Number.pipe(S.lessThan(1))
      expectValidArbitrary(schema)
    })

    it("greaterThan", () => {
      const schema = S.Number.pipe(S.greaterThan(1))
      expectValidArbitrary(schema)
    })

    it("between", () => {
      const schema = S.Number.pipe(S.between(1, 10))
      expectValidArbitrary(schema)
    })

    it("nonNaN", () => {
      const schema = S.Number.pipe(S.nonNaN())
      expectValidArbitrary(schema)
    })

    it("finite", () => {
      const schema = S.Number.pipe(S.finite())
      expectValidArbitrary(schema)
    })

    it("NumberConstraints should support doubles as constraints", () => {
      const schema = S.Number.pipe(S.clamp(1.3, 3.1))
      expectValidArbitrary(schema)
    })
  })

  describe("bigint filters", () => {
    it("lessThanOrEqualTo", () => {
      const schema = S.BigInt.pipe(S.lessThanOrEqualToBigInt(BigInt(1)))
      expectValidArbitrary(schema)
    })

    it("greaterThanOrEqualTo", () => {
      const schema = S.BigInt.pipe(S.greaterThanOrEqualToBigInt(BigInt(1)))
      expectValidArbitrary(schema)
    })

    it("lessThan", () => {
      const schema = S.BigInt.pipe(S.lessThanBigInt(BigInt(1)))
      expectValidArbitrary(schema)
    })

    it("greaterThan", () => {
      const schema = S.BigInt.pipe(S.greaterThanBigInt(BigInt(1)))
      expectValidArbitrary(schema)
    })

    it("between", () => {
      const schema = S.BigInt.pipe(S.betweenBigInt(BigInt(1), BigInt(10)))
      expectValidArbitrary(schema)
    })
  })

  describe("should handle annotations", () => {
    const expectHook = <A, I>(source: S.Schema<A, I>) => {
      const schema = source.pipe(Arbitrary.arbitrary(() => (fc) => fc.constant("custom arbitrary") as any))
      const arb = Arbitrary.makeLazy(schema)(fc)
      expect(fc.sample(arb, 1)[0]).toEqual("custom arbitrary")
    }

    it("void", () => {
      expectHook(S.Void)
    })

    it("never", () => {
      expectHook(S.Never)
    })

    it("literal", () => {
      expectHook(S.Literal("a"))
    })

    it("symbol", () => {
      expectHook(S.Symbol)
    })

    it("uniqueSymbolFromSelf", () => {
      expectHook(S.UniqueSymbolFromSelf(Symbol.for("effect/schema/test/a")))
    })

    it("templateLiteral", () => {
      expectHook(S.TemplateLiteral(S.Literal("a"), S.String, S.Literal("b")))
    })

    it("undefined", () => {
      expectHook(S.Undefined)
    })

    it("unknown", () => {
      expectHook(S.Unknown)
    })

    it("any", () => {
      expectHook(S.Any)
    })

    it("object", () => {
      expectHook(S.Object)
    })

    it("string", () => {
      expectHook(S.String)
    })

    it("number", () => {
      expectHook(S.Number)
    })

    it("bigintFromSelf", () => {
      expectHook(S.BigIntFromSelf)
    })

    it("boolean", () => {
      expectHook(S.Boolean)
    })

    it("enums", () => {
      enum Fruits {
        Apple,
        Banana
      }
      expectHook(S.Enums(Fruits))
    })

    it("tuple", () => {
      expectHook(S.Tuple(S.String, S.Number))
    })

    it("struct", () => {
      expectHook(S.Struct({ a: S.String, b: S.Number }))
    })

    it("union", () => {
      expectHook(S.Union(S.String, S.Number))
    })

    it("suspend", () => {
      interface A {
        readonly a: string
        readonly as: ReadonlyArray<A>
      }
      const schema: S.Schema<A> = S.Struct({
        a: S.String,
        as: S.Array(S.suspend(() => schema))
      })
      expectHook(schema)
    })

    it("refinement", () => {
      expectHook(S.Int)
    })

    it("transformation", () => {
      expectHook(S.NumberFromString)
    })
  })
})
