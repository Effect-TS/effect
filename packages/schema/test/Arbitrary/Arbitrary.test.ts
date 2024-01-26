import * as Arbitrary from "@effect/schema/Arbitrary"
import * as S from "@effect/schema/Schema"
import { expectValidArbitrary } from "@effect/schema/test/util"
import { isUnknown } from "effect/Predicate"
import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

describe("Arbitrary > Arbitrary", () => {
  it("exports", () => {
    expect(Arbitrary.ArbitraryHookId).exist
  })

  it("should throw on declarations without annotations", () => {
    const schema = S.declare(isUnknown)
    expect(() => Arbitrary.make(schema)).toThrow(
      new Error("cannot build an Arbitrary for a declaration without annotations (<declaration schema>)")
    )
  })

  it("make(S.to(schema))", () => {
    const schema = S.NumberFromString
    expectValidArbitrary(S.to(schema))
  })

  it("make(S.from(schema))", () => {
    const schema = S.struct({
      a: S.NumberFromString,
      b: S.tuple(S.NumberFromString),
      c: S.union(S.NumberFromString, S.boolean),
      d: S.NumberFromString.pipe(S.positive()),
      e: S.optionFromSelf(S.NumberFromString)
    })
    expectValidArbitrary(S.from(schema))
  })

  describe("templateLiteral", () => {
    it("a", () => {
      const schema = S.templateLiteral(S.literal("a"))
      expectValidArbitrary(schema)
    })

    it("a b", () => {
      const schema = S.templateLiteral(S.literal("a"), S.literal(" "), S.literal("b"))
      expectValidArbitrary(schema)
    })

    it("a${string}", () => {
      const schema = S.templateLiteral(S.literal("a"), S.string)
      expectValidArbitrary(schema)
    })

    it("a${number}", () => {
      const schema = S.templateLiteral(S.literal("a"), S.number)
      expectValidArbitrary(schema)
    })

    it("a", () => {
      const schema = S.templateLiteral(S.literal("a"))
      expectValidArbitrary(schema)
    })

    it("${string}", () => {
      const schema = S.templateLiteral(S.string)
      expectValidArbitrary(schema)
    })

    it("a${string}b", () => {
      const schema = S.templateLiteral(S.literal("a"), S.string, S.literal("b"))
      expectValidArbitrary(schema)
    })
  })

  it("never", () => {
    expect(() => Arbitrary.make(S.never)(fc)).toThrow(
      new Error("cannot build an Arbitrary for `never`")
    )
  })

  it("string", () => {
    expectValidArbitrary(S.string)
  })

  it("void", () => {
    expectValidArbitrary(S.void)
  })

  it("number", () => {
    expectValidArbitrary(S.number)
  })

  it("boolean", () => {
    expectValidArbitrary(S.boolean)
  })

  it("bigint", () => {
    expectValidArbitrary(S.bigintFromSelf)
  })

  it("symbol", () => {
    expectValidArbitrary(S.symbolFromSelf)
  })

  it("object", () => {
    expectValidArbitrary(S.object)
  })

  it("any", () => {
    expectValidArbitrary(S.any)
  })

  it("unknown", () => {
    expectValidArbitrary(S.unknown)
  })

  it("literal 1 member", () => {
    const schema = S.literal(1)
    expectValidArbitrary(schema)
  })

  it("literal 2 members", () => {
    const schema = S.literal(1, "a")
    expectValidArbitrary(schema)
  })

  it("uniqueSymbol", () => {
    const a = Symbol.for("@effect/schema/test/a")
    const schema = S.uniqueSymbol(a)
    expectValidArbitrary(schema)
  })

  it("empty enums should throw", () => {
    enum Fruits {}
    const schema = S.enums(Fruits)
    expect(() => Arbitrary.make(schema)(fc)).toThrow(
      new Error("cannot build an Arbitrary for an empty enum")
    )
  })

  it("Numeric enums", () => {
    enum Fruits {
      Apple,
      Banana
    }
    const schema = S.enums(Fruits)
    expectValidArbitrary(schema)
  })

  it("String enums", () => {
    enum Fruits {
      Apple = "apple",
      Banana = "banana",
      Cantaloupe = 0
    }
    const schema = S.enums(Fruits)
    expectValidArbitrary(schema)
  })

  it("Const enums", () => {
    const Fruits = {
      Apple: "apple",
      Banana: "banana",
      Cantaloupe: 3
    } as const
    const schema = S.enums(Fruits)
    expectValidArbitrary(schema)
  })

  it("tuple. empty", () => {
    const schema = S.tuple()
    expectValidArbitrary(schema)
  })

  it("tuple. required element", () => {
    const schema = S.tuple(S.number)
    expectValidArbitrary(schema)
  })

  it("tuple. required element with undefined", () => {
    const schema = S.tuple(S.union(S.number, S.undefined))
    expectValidArbitrary(schema)
  })

  it("tuple. optional element", () => {
    const schema = S.tuple().pipe(S.optionalElement(S.number))
    expectValidArbitrary(schema)
  })

  it("tuple. optional element with undefined", () => {
    const schema = S.tuple().pipe(S.optionalElement(S.union(S.number, S.undefined)))
    expectValidArbitrary(schema)
  })

  it("tuple. e + e?", () => {
    const schema = S.tuple(S.string).pipe(S.optionalElement(S.number))
    expectValidArbitrary(schema)
  })

  it("tuple. e + r", () => {
    const schema = S.tuple(S.string).pipe(S.rest(S.number))
    expectValidArbitrary(schema)
  })

  it("tuple. e? + r", () => {
    const schema = S.tuple().pipe(S.optionalElement(S.string), S.rest(S.number))
    expectValidArbitrary(schema)
  })

  it("tuple. r", () => {
    const schema = S.array(S.number)
    expectValidArbitrary(schema)
  })

  it("tuple. r + e", () => {
    const schema = S.array(S.string).pipe(S.element(S.number))
    expectValidArbitrary(schema)
  })

  it("tuple. e + r + e", () => {
    const schema = S.tuple(S.string).pipe(S.rest(S.number), S.element(S.boolean))
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
      const schema: S.Schema<never, A> = S.struct({
        a: S.string,
        as: S.array(
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
      const schema: S.Schema<never, A> = S.struct({
        a: S.string,
        as: S.array(S.suspend(() => schema))
      })
      expectValidArbitrary(schema)
    })

    it("make(S.from(schema))", () => {
      const NumberFromString = S.NumberFromString
      interface I {
        readonly a: string | I
      }
      interface A {
        readonly a: number | A
      }
      const schema: S.Schema<never, I, A> = S.struct({
        a: S.union(NumberFromString, S.suspend(() => schema))
      })

      expectValidArbitrary(S.from(schema))
    })

    it("tuple", () => {
      type A = readonly [number, A | null]
      const schema: S.Schema<never, A> = S.tuple(
        S.number,
        S.union(S.literal(null), S.suspend(() => schema))
      )
      expectValidArbitrary(schema)
    })

    it("record", () => {
      type A = {
        [_: string]: A
      }
      const schema: S.Schema<never, A> = S.record(S.string, S.suspend(() => schema))
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

      const Expression: S.Schema<never, Expression> = S.struct({
        type: S.literal("expression"),
        value: S.union(S.JsonNumber, S.suspend(() => Operation))
      })

      const Operation: S.Schema<never, Operation> = S.struct({
        type: S.literal("operation"),
        operator: S.union(S.literal("+"), S.literal("-")),
        left: Expression,
        right: Expression
      })
      expectValidArbitrary(Operation, { numRuns: 5 })
    })
  })

  describe("struct", () => {
    it("required property signature", () => {
      const schema = S.struct({ a: S.number })
      expectValidArbitrary(schema)
    })

    it("required property signature with undefined", () => {
      const schema = S.struct({ a: S.union(S.number, S.undefined) })
      expectValidArbitrary(schema)
    })

    it("optional property signature", () => {
      const schema = S.struct({ a: S.optional(S.number, { exact: true }) })
      expectValidArbitrary(schema)
    })

    it("optional property signature with undefined", () => {
      const schema = S.struct({ a: S.optional(S.union(S.number, S.undefined), { exact: true }) })
      expectValidArbitrary(schema)
    })

    it("baseline", () => {
      const schema = S.struct({ a: S.string, b: S.number })
      expectValidArbitrary(schema)
    })
  })

  it("union", () => {
    const schema = S.union(S.string, S.number)
    expectValidArbitrary(schema)
  })

  it("record(string, string)", () => {
    const schema = S.record(S.string, S.string)
    expectValidArbitrary(schema)
  })

  it("record(symbol, string)", () => {
    const schema = S.record(S.symbolFromSelf, S.string)
    expectValidArbitrary(schema)
  })

  describe("array filters", () => {
    it("minItems", () => {
      const schema = S.array(S.string).pipe(S.minItems(2))
      expectValidArbitrary(schema)
    })

    it("maxItems", () => {
      const schema = S.array(S.string).pipe(S.maxItems(5))
      expectValidArbitrary(schema)
    })

    it("itemsCount", () => {
      const schema = S.array(S.string).pipe(S.itemsCount(3))
      expectValidArbitrary(schema)
    })
  })

  it("extend/ struct + record", () => {
    const schema = S.struct({ a: S.string }).pipe(
      S.extend(S.record(S.string, S.union(S.string, S.number)))
    )
    expectValidArbitrary(schema)
  })

  describe("string filters", () => {
    it("minLength", () => {
      const schema = S.string.pipe(S.minLength(1))
      expectValidArbitrary(schema)
    })

    it("maxLength", () => {
      const schema = S.string.pipe(S.maxLength(2))
      expectValidArbitrary(schema)
    })

    it("length", () => {
      const schema = S.string.pipe(S.length(10))
      expectValidArbitrary(schema)
    })

    it("startsWith", () => {
      const schema = S.string.pipe(S.startsWith("a"))
      expectValidArbitrary(schema)
    })

    it("endsWith", () => {
      const schema = S.string.pipe(S.endsWith("a"))
      expectValidArbitrary(schema)
    })

    it("pattern", () => {
      const regexp = /^[A-Z]{3}[0-9]{3}$/
      const schema = S.string.pipe(S.pattern(regexp))
      expectValidArbitrary(schema)
    })
  })

  describe("number filters", () => {
    it("int", () => {
      const schema = S.number.pipe(S.int())
      expectValidArbitrary(schema)
    })

    it("between + int", () => {
      const schema = S.number.pipe(S.between(1, 10), S.int())
      expectValidArbitrary(schema)
    })

    it("int + between", () => {
      const schema = S.number.pipe(S.int(), S.between(1, 10))
      expectValidArbitrary(schema)
    })

    it("lessThanOrEqualTo", () => {
      const schema = S.number.pipe(S.lessThanOrEqualTo(1))
      expectValidArbitrary(schema)
    })

    it("greaterThanOrEqualTo", () => {
      const schema = S.number.pipe(S.greaterThanOrEqualTo(1))
      expectValidArbitrary(schema)
    })

    it("lessThan", () => {
      const schema = S.number.pipe(S.lessThan(1))
      expectValidArbitrary(schema)
    })

    it("greaterThan", () => {
      const schema = S.number.pipe(S.greaterThan(1))
      expectValidArbitrary(schema)
    })

    it("between", () => {
      const schema = S.number.pipe(S.between(1, 10))
      expectValidArbitrary(schema)
    })

    it("nonNaN", () => {
      const schema = S.number.pipe(S.nonNaN())
      expectValidArbitrary(schema)
    })

    it("finite", () => {
      const schema = S.number.pipe(S.finite())
      expectValidArbitrary(schema)
    })

    it("NumberConstraints should support doubles as constraints", () => {
      const schema = S.number.pipe(S.clamp(1.3, 3.1))
      expectValidArbitrary(schema)
    })
  })

  describe("bigint filters", () => {
    it("lessThanOrEqualTo", () => {
      const schema = S.bigint.pipe(S.lessThanOrEqualToBigint(BigInt(1)))
      expectValidArbitrary(schema)
    })

    it("greaterThanOrEqualTo", () => {
      const schema = S.bigint.pipe(S.greaterThanOrEqualToBigint(BigInt(1)))
      expectValidArbitrary(schema)
    })

    it("lessThan", () => {
      const schema = S.bigint.pipe(S.lessThanBigint(BigInt(1)))
      expectValidArbitrary(schema)
    })

    it("greaterThan", () => {
      const schema = S.bigint.pipe(S.greaterThanBigint(BigInt(1)))
      expectValidArbitrary(schema)
    })

    it("between", () => {
      const schema = S.bigint.pipe(S.betweenBigint(BigInt(1), BigInt(10)))
      expectValidArbitrary(schema)
    })
  })

  describe("should handle annotations", () => {
    const expectHook = <I, A>(source: S.Schema<never, I, A>) => {
      const schema = source.pipe(Arbitrary.arbitrary(() => (fc) => fc.constant("custom arbitrary") as any))
      const arb = Arbitrary.make(schema)(fc)
      expect(fc.sample(arb, 1)[0]).toEqual("custom arbitrary")
    }

    it("void", () => {
      expectHook(S.void)
    })

    it("never", () => {
      expectHook(S.never)
    })

    it("literal", () => {
      expectHook(S.literal("a"))
    })

    it("symbol", () => {
      expectHook(S.symbol)
    })

    it("uniqueSymbol", () => {
      expectHook(S.uniqueSymbol(Symbol.for("effect/schema/test/a")))
    })

    it("templateLiteral", () => {
      expectHook(S.templateLiteral(S.literal("a"), S.string, S.literal("b")))
    })

    it("undefined", () => {
      expectHook(S.undefined)
    })

    it("unknown", () => {
      expectHook(S.unknown)
    })

    it("any", () => {
      expectHook(S.any)
    })

    it("object", () => {
      expectHook(S.object)
    })

    it("string", () => {
      expectHook(S.string)
    })

    it("number", () => {
      expectHook(S.number)
    })

    it("bigintFromSelf", () => {
      expectHook(S.bigintFromSelf)
    })

    it("boolean", () => {
      expectHook(S.boolean)
    })

    it("enums", () => {
      enum Fruits {
        Apple,
        Banana
      }
      expectHook(S.enums(Fruits))
    })

    it("tuple", () => {
      expectHook(S.tuple(S.string, S.number))
    })

    it("struct", () => {
      expectHook(S.struct({ a: S.string, b: S.number }))
    })

    it("union", () => {
      expectHook(S.union(S.string, S.number))
    })

    it("suspend", () => {
      interface A {
        readonly a: string
        readonly as: ReadonlyArray<A>
      }
      const schema: S.Schema<never, A> = S.struct({
        a: S.string,
        as: S.array(S.suspend(() => schema))
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
