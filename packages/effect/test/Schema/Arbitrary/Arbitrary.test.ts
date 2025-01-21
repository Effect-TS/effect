import { Schema as S, SchemaAST as AST } from "effect"
import * as Arbitrary from "effect/Arbitrary"
import * as fc from "effect/FastCheck"
import * as Order from "effect/Order"
import { isUnknown } from "effect/Predicate"
import * as Util from "effect/test/Schema/TestUtils"
import { assert, describe, expect, it } from "vitest"

const expectConstraints = <A, I>(
  schema: S.Schema<A, I, never>,
  constraints:
    | ReturnType<typeof Arbitrary.makeStringConstraints>
    | ReturnType<typeof Arbitrary.makeNumberConstraints>
    | ReturnType<typeof Arbitrary.makeBigIntConstraints>
    | ReturnType<typeof Arbitrary.makeDateConstraints>
    | ReturnType<typeof Arbitrary.makeArrayConstraints>
) => {
  const ast = schema.ast
  if (AST.isRefinement(ast)) {
    const op = Arbitrary.toOp(ast, { maxDepth: 2 }, [])
    switch (op._tag) {
      case "Deferred": {
        switch (op.config._tag) {
          case "StringConstraints":
          case "NumberConstraints":
          case "BigIntConstraints":
          case "DateConstraints":
            return expect(op.config).toEqual(constraints)
          case "ArrayConstraints": {
            const { ast: _ast, ...rest } = op.config
            return expect(rest).toEqual(constraints)
          }
        }
      }
      case "Succeed":
        // eslint-disable-next-line no-console
        console.log(op)
        assert.fail(`expected a Deferred, got a Succeed`)
    }
  } else {
    assert.fail(`expected a Refinement, got ${ast._tag}`)
  }
}

describe("Arbitrary", () => {
  describe("Unsupported schemas", () => {
    it("should throw on declarations without annotations", () => {
      const schema = S.declare(isUnknown)
      expect(() => Arbitrary.makeLazy(schema)).toThrow(
        new Error(`Missing annotation
details: Generating an Arbitrary for this schema requires an "arbitrary" annotation
schema (Declaration): <declaration schema>`)
      )
    })

    it("the errors should disply a path", () => {
      expect(() => Arbitrary.makeLazy(S.Tuple(S.declare(isUnknown)))).toThrow(
        new Error(`Missing annotation
at path: [0]
details: Generating an Arbitrary for this schema requires an "arbitrary" annotation
schema (Declaration): <declaration schema>`)
      )
      expect(() => Arbitrary.makeLazy(S.Struct({ a: S.declare(isUnknown) }))).toThrow(
        new Error(`Missing annotation
at path: ["a"]
details: Generating an Arbitrary for this schema requires an "arbitrary" annotation
schema (Declaration): <declaration schema>`)
      )
    })

    it("Never", () => {
      expect(() => Arbitrary.makeLazy(S.Never)).toThrow(
        new Error(`Missing annotation
details: Generating an Arbitrary for this schema requires an "arbitrary" annotation
schema (NeverKeyword): never`)
      )
    })
  })

  it("make(S.typeSchema(schema))", () => {
    const schema = S.NumberFromString
    Util.assertions.arbitrary.validateGeneratedValues(S.typeSchema(schema))
  })

  it("make(S.encodedSchema(schema))", () => {
    const schema = S.Struct({
      a: S.NumberFromString,
      b: S.Tuple(S.NumberFromString),
      c: S.Union(S.NumberFromString, S.Boolean),
      d: S.NumberFromString.pipe(S.positive()),
      e: S.OptionFromSelf(S.NumberFromString)
    })
    Util.assertions.arbitrary.validateGeneratedValues(S.encodedSchema(schema))
  })

  it("String", () => {
    const schema = S.String
    Util.assertions.arbitrary.validateGeneratedValues(schema)
  })

  it("Void", () => {
    Util.assertions.arbitrary.validateGeneratedValues(S.Void)
  })

  it("Boolean", () => {
    Util.assertions.arbitrary.validateGeneratedValues(S.Number)
  })

  it("boolean", () => {
    Util.assertions.arbitrary.validateGeneratedValues(S.Boolean)
  })

  it("BigIntFromSelf", () => {
    Util.assertions.arbitrary.validateGeneratedValues(S.BigIntFromSelf)
  })

  it("SymbolFromSelf", () => {
    Util.assertions.arbitrary.validateGeneratedValues(S.SymbolFromSelf)
  })

  it("Object", () => {
    Util.assertions.arbitrary.validateGeneratedValues(S.Object)
  })

  it("Any", () => {
    Util.assertions.arbitrary.validateGeneratedValues(S.Any)
  })

  it("Unknown", () => {
    Util.assertions.arbitrary.validateGeneratedValues(S.Unknown)
  })

  describe("Literal", () => {
    it("1", () => {
      const schema = S.Literal(1)
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })

    it(`1 + "a"`, () => {
      const schema = S.Literal(1, "a")
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })
  })

  it("UniqueSymbolFromSelf", () => {
    const a = Symbol.for("effect/Schema/test/a")
    const schema = S.UniqueSymbolFromSelf(a)
    Util.assertions.arbitrary.validateGeneratedValues(schema)
  })

  it("DateFromSelf", () => {
    const schema = S.DateFromSelf
    Util.assertions.arbitrary.validateGeneratedValues(schema)
  })

  it("DurationFromSelf", () => {
    const schema = S.DurationFromSelf
    Util.assertions.arbitrary.validateGeneratedValues(schema)
  })

  describe("TemplateLiteral", () => {
    it("a", () => {
      const schema = S.TemplateLiteral(S.Literal("a"))
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })

    it("a b", () => {
      const schema = S.TemplateLiteral(S.Literal("a"), S.Literal(" "), S.Literal("b"))
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })

    it("a${string}", () => {
      const schema = S.TemplateLiteral(S.Literal("a"), S.String)
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })

    it("a${number}", () => {
      const schema = S.TemplateLiteral(S.Literal("a"), S.Number)
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })

    it("a", () => {
      const schema = S.TemplateLiteral(S.Literal("a"))
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })

    it("${string}", () => {
      const schema = S.TemplateLiteral(S.String)
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })

    it("a${string}b", () => {
      const schema = S.TemplateLiteral(S.Literal("a"), S.String, S.Literal("b"))
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })

    it("https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html", async () => {
      const EmailLocaleIDs = S.Literal("welcome_email", "email_heading")
      const FooterLocaleIDs = S.Literal("footer_title", "footer_sendoff")
      const schema = S.TemplateLiteral(S.Union(EmailLocaleIDs, FooterLocaleIDs), "_id")
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })

    it("< + h + (1|2) + >", async () => {
      const schema = S.TemplateLiteral("<", S.TemplateLiteral("h", S.Literal(1, 2)), ">")
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })
  })

  describe("Enums", () => {
    it("empty enums should throw", () => {
      enum Fruits {}
      const schema = S.Enums(Fruits)
      expect(() => Arbitrary.makeLazy(schema)(fc)).toThrow(
        new Error(`Empty Enums schema
details: Generating an Arbitrary for this schema requires at least one enum`)
      )
    })

    it("Numeric enums", () => {
      enum Fruits {
        Apple,
        Banana
      }
      const schema = S.Enums(Fruits)
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })

    it("String enums", () => {
      enum Fruits {
        Apple = "apple",
        Banana = "banana",
        Cantaloupe = 0
      }
      const schema = S.Enums(Fruits)
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })

    it("Const enums", () => {
      const Fruits = {
        Apple: "apple",
        Banana: "banana",
        Cantaloupe: 3
      } as const
      const schema = S.Enums(Fruits)
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })
  })

  describe("Struct", () => {
    it("fields", () => {
      const schema = S.Struct({ a: S.String, b: S.Number })
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })

    it("fields + record", () => {
      const schema = S.Struct({ a: S.String }, S.Record({ key: S.String, value: S.Union(S.String, S.Number) }))
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })

    it("required property signature", () => {
      const schema = S.Struct({ a: S.Number })
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })

    it("required property signature with undefined", () => {
      const schema = S.Struct({ a: S.Union(S.Number, S.Undefined) })
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })

    it("optional property signature", () => {
      const schema = S.Struct({ a: S.optionalWith(S.Number, { exact: true }) })
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })

    it("optional property signature with undefined", () => {
      const schema = S.Struct({
        a: S.optionalWith(S.Union(S.Number, S.Undefined), { exact: true })
      })
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })
  })

  describe("Record", () => {
    it("Record(string, string)", () => {
      const schema = S.Record({ key: S.String, value: S.String })
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })

    it("Record(symbol, string)", () => {
      const schema = S.Record({ key: S.SymbolFromSelf, value: S.String })
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })
  })

  it("union", () => {
    const schema = S.Union(S.String, S.Number)
    Util.assertions.arbitrary.validateGeneratedValues(schema)
  })

  describe("Tuple", () => {
    it("empty", () => {
      const schema = S.Tuple()
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })

    it("required element", () => {
      const schema = S.Tuple(S.Number)
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })

    it("required element with undefined", () => {
      const schema = S.Tuple(S.Union(S.Number, S.Undefined))
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })

    it("optional element", () => {
      const schema = S.Tuple(S.optionalElement(S.Number))
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })

    it("optional element with undefined", () => {
      const schema = S.Tuple(S.optionalElement(S.Union(S.Number, S.Undefined)))
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })

    it("e e?", () => {
      const schema = S.Tuple(S.String, S.optionalElement(S.Number))
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })

    it("e r", () => {
      const schema = S.Tuple([S.String], S.Number)
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })

    it("e? r", () => {
      const schema = S.Tuple([S.optionalElement(S.String)], S.Number)
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })

    it("r", () => {
      const schema = S.Array(S.Number)
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })

    it("r e", () => {
      const schema = S.Tuple([], S.String, S.Number)
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })

    it("e r e", () => {
      const schema = S.Tuple([S.String], S.Number, S.Boolean)
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })
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
      const schema = S.Struct({
        a: S.String,
        as: S.Array(
          S.suspend((): S.Schema<A> => schema).annotations({ arbitrary: () => () => arb })
        )
      })
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })

    it("make(S.encodedSchema(schema))", () => {
      const NumberFromString = S.NumberFromString
      interface I {
        readonly a: string | I
      }
      interface A {
        readonly a: number | A
      }
      const schema = S.Struct({
        a: S.Union(NumberFromString, S.suspend((): S.Schema<A, I> => schema))
      })

      Util.assertions.arbitrary.validateGeneratedValues(S.encodedSchema(schema))
    })

    it("Tuple", () => {
      type A = readonly [number, A | null]
      const schema = S.Tuple(
        S.Number,
        S.NullOr(S.suspend((): S.Schema<A> => schema))
      )
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })

    it("Array", () => {
      const Rec = S.suspend((): any => schema)
      const schema: any = S.Array(S.Union(S.String, Rec))
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })

    it("Struct", () => {
      interface A {
        readonly a: string
        readonly as: ReadonlyArray<A>
      }
      const schema = S.Struct({
        a: S.String,
        as: S.Array(S.suspend((): S.Schema<A> => schema))
      })
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })

    it("Record", () => {
      type A = {
        [_: string]: A
      }
      const schema = S.Record({ key: S.String, value: S.suspend((): S.Schema<A> => schema) })
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })

    it("optional", () => {
      const Rec = S.suspend((): any => schema)
      const schema: any = S.Struct({
        a: S.optional(Rec)
      })
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })

    it("Array + Array", () => {
      const Rec = S.suspend((): any => schema)
      const schema: any = S.Struct({
        a: S.Array(Rec),
        b: S.Array(Rec)
      })
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })

    it("optional + Array", () => {
      const Rec = S.suspend((): any => schema)
      const schema: any = S.Struct({
        a: S.optional(Rec),
        b: S.Array(Rec)
      })
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })

    it("mutually suspended schemas", () => {
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

      const Expression = S.Struct({
        type: S.Literal("expression"),
        value: S.Union(S.JsonNumber, S.suspend((): S.Schema<Operation> => Operation))
      })

      const Operation = S.Struct({
        type: S.Literal("operation"),
        operator: S.Union(S.Literal("+"), S.Literal("-")),
        left: Expression,
        right: Expression
      })
      Util.assertions.arbitrary.validateGeneratedValues(Operation)
    })

    it("RedactedFromSelf", () => {
      const Rec = S.suspend((): any => schema)
      const schema: any = S.RedactedFromSelf(S.NullOr(Rec))
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })

    it("OptionFromSelf", () => {
      const Rec = S.suspend((): any => schema)
      const schema: any = S.OptionFromSelf(Rec)
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })

    it("EitherFromSelf", () => {
      const Rec = S.suspend((): any => schema)
      const schema: any = S.EitherFromSelf({ left: S.String, right: Rec })
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })

    it("MapFromSelf", () => {
      const Rec = S.suspend((): any => schema)
      const schema: any = S.MapFromSelf({ key: S.String, value: Rec })
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })

    it("SetFromSelf", () => {
      const Rec = S.suspend((): any => schema)
      const schema: any = S.SetFromSelf(Rec)
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })

    it("ChunkFromSelf", () => {
      const Rec = S.suspend((): any => schema)
      const schema: any = S.ChunkFromSelf(Rec)
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })

    it("HashSetFromSelf", () => {
      const Rec = S.suspend((): any => schema)
      const schema: any = S.HashSetFromSelf(Rec)
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })

    it("HashMapFromSelf", () => {
      const Rec = S.suspend((): any => schema)
      const schema: any = S.HashMapFromSelf({ key: S.String, value: Rec })
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })

    it("ListFromSelf", () => {
      const Rec = S.suspend((): any => schema)
      const schema: any = S.ListFromSelf(Rec)
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })

    it("SortedSetFromSelf", () => {
      const Rec = S.suspend((): any => schema)
      const schema: any = S.SortedSetFromSelf(Rec, Order.empty(), Order.empty())
      Util.assertions.arbitrary.validateGeneratedValues(schema)
    })
  })

  describe("Refinement", () => {
    describe("declaration filters", () => {
      it("ValidDateFromSelf", () => {
        const schema = S.ValidDateFromSelf
        Util.assertions.arbitrary.validateGeneratedValues(schema)
      })
    })

    describe("array filters", () => {
      it("minItems (Array)", () => {
        const schema = S.Array(S.String).pipe(S.minItems(2))
        expectConstraints(schema, Arbitrary.makeArrayConstraints({ minLength: 2 }))
        Util.assertions.arbitrary.validateGeneratedValues(schema)
      })

      it("minItems (NonEmptyArray)", () => {
        const schema = S.NonEmptyArray(S.String).pipe(S.minItems(2))
        expectConstraints(schema, Arbitrary.makeArrayConstraints({ minLength: 2 }))
        Util.assertions.arbitrary.validateGeneratedValues(schema)
      })

      it("maxItems (Array)", () => {
        const schema = S.Array(S.String).pipe(S.maxItems(5))
        expectConstraints(schema, Arbitrary.makeArrayConstraints({ maxLength: 5 }))
        Util.assertions.arbitrary.validateGeneratedValues(schema)
      })

      it("maxItems (NonEmptyArray)", () => {
        const schema = S.NonEmptyArray(S.String).pipe(S.maxItems(5))
        expectConstraints(schema, Arbitrary.makeArrayConstraints({ maxLength: 5 }))
        Util.assertions.arbitrary.validateGeneratedValues(schema)
      })

      it("itemsCount (Array)", () => {
        const schema = S.Array(S.String).pipe(S.itemsCount(3))
        expectConstraints(schema, Arbitrary.makeArrayConstraints({ minLength: 3, maxLength: 3 }))
        Util.assertions.arbitrary.validateGeneratedValues(schema)
      })

      it("itemsCount (NonEmptyArray)", () => {
        const schema = S.NonEmptyArray(S.String).pipe(S.itemsCount(3))
        expectConstraints(schema, Arbitrary.makeArrayConstraints({ minLength: 3, maxLength: 3 }))
        Util.assertions.arbitrary.validateGeneratedValues(schema)
      })
    })

    describe("string filters", () => {
      it("minLength", () => {
        const schema = S.String.pipe(S.minLength(2))
        expectConstraints(schema, Arbitrary.makeStringConstraints({ minLength: 2 }))
        Util.assertions.arbitrary.validateGeneratedValues(schema)
      })

      it("maxLength", () => {
        const schema = S.String.pipe(S.maxLength(5))
        expectConstraints(schema, Arbitrary.makeStringConstraints({ maxLength: 5 }))
        Util.assertions.arbitrary.validateGeneratedValues(schema)
      })

      it("length: number", () => {
        const schema = S.String.pipe(S.length(10))
        expectConstraints(schema, Arbitrary.makeStringConstraints({ minLength: 10, maxLength: 10 }))
        Util.assertions.arbitrary.validateGeneratedValues(schema)
      })

      it("length: { min, max }", () => {
        const schema = S.String.pipe(S.length({ min: 2, max: 5 }))
        expectConstraints(schema, Arbitrary.makeStringConstraints({ minLength: 2, maxLength: 5 }))
        Util.assertions.arbitrary.validateGeneratedValues(schema)
      })

      it("minLength + maxLength", () => {
        const schema = S.String.pipe(S.minLength(2), S.maxLength(5))
        expectConstraints(schema, Arbitrary.makeStringConstraints({ minLength: 2, maxLength: 5 }))
        Util.assertions.arbitrary.validateGeneratedValues(schema)
      })

      it("arb + minLength + maxLength", () => {
        const schema = S.String.annotations({ arbitrary: () => (fc) => fc.string() }).pipe(
          S.minLength(2),
          S.maxLength(5)
        )
        expectConstraints(schema, Arbitrary.makeStringConstraints({ minLength: 2, maxLength: 5 }))
        Util.assertions.arbitrary.validateGeneratedValues(schema)
      })

      it("minLength + maxLength + arb", () => {
        const schema = S.String.pipe(
          S.minLength(2),
          S.maxLength(5)
        ).annotations({ arbitrary: () => (fc) => fc.string() })
        expectConstraints(schema, Arbitrary.makeStringConstraints({ minLength: 2, maxLength: 5 }))
        Util.assertions.arbitrary.validateGeneratedValues(schema)
      })

      it("startsWith", () => {
        const schema = S.String.pipe(S.startsWith("a"))
        expectConstraints(schema, Arbitrary.makeStringConstraints({ pattern: "^a" }))
        Util.assertions.arbitrary.validateGeneratedValues(schema)
      })

      it("endsWith", () => {
        const schema = S.String.pipe(S.endsWith("a"))
        expectConstraints(schema, Arbitrary.makeStringConstraints({ pattern: "^.*a$" }))
        Util.assertions.arbitrary.validateGeneratedValues(schema)
      })

      it("pattern", () => {
        const regex = /^[A-Z]{3}[0-9]{3}$/
        const schema = S.String.pipe(S.pattern(regex))
        expectConstraints(schema, Arbitrary.makeStringConstraints({ pattern: regex.source }))
        Util.assertions.arbitrary.validateGeneratedValues(schema)
      })

      it("nonEmptyString + pattern", () => {
        const regex = /^[-]*$/
        const schema = S.String.pipe(S.nonEmptyString(), S.pattern(regex))
        expectConstraints(schema, Arbitrary.makeStringConstraints({ minLength: 1, pattern: regex.source }))
        Util.assertions.arbitrary.validateGeneratedValues(schema)
      })

      it("pattern + pattern", () => {
        const regexp1 = /^[^A-Z]*$/
        const regexp2 = /^0x[0-9a-f]{40}$/
        const schema = S.String.pipe(S.pattern(regexp1), S.pattern(regexp2))
        expectConstraints(
          schema,
          Arbitrary.makeStringConstraints({ pattern: `(?:${regexp1.source})|(?:${regexp2.source})` })
        )
        Util.assertions.arbitrary.validateGeneratedValues(schema)
      })
    })

    describe("number filters", () => {
      it("nonNaN", () => {
        const schema = S.Number.pipe(S.nonNaN())
        expectConstraints(schema, Arbitrary.makeNumberConstraints({ noNaN: true }))
        Util.assertions.arbitrary.validateGeneratedValues(schema)
      })

      it("finite", () => {
        const schema = S.Number.pipe(S.finite())
        expectConstraints(schema, Arbitrary.makeNumberConstraints({ noNaN: true, noDefaultInfinity: true }))
        Util.assertions.arbitrary.validateGeneratedValues(schema)
      })

      it("JsonNumber", () => {
        const schema = S.JsonNumber
        expectConstraints(schema, Arbitrary.makeNumberConstraints({ noDefaultInfinity: true, noNaN: true }))
        Util.assertions.arbitrary.validateGeneratedValues(schema)
      })

      it("int", () => {
        const schema = S.Number.pipe(S.int())
        expectConstraints(schema, Arbitrary.makeNumberConstraints({ isInteger: true }))
        Util.assertions.arbitrary.validateGeneratedValues(schema)
      })

      it("between int", () => {
        const schema = S.Number.pipe(S.between(2, 5), S.int())
        expectConstraints(schema, Arbitrary.makeNumberConstraints({ isInteger: true, min: 2, max: 5 }))
        Util.assertions.arbitrary.validateGeneratedValues(schema)
      })

      it("int between", () => {
        const schema = S.Number.pipe(S.int(), S.between(2, 5))
        expectConstraints(schema, Arbitrary.makeNumberConstraints({ isInteger: true, min: 2, max: 5 }))
        Util.assertions.arbitrary.validateGeneratedValues(schema)
      })

      it("lessThanOrEqualTo", () => {
        const schema = S.Number.pipe(S.lessThanOrEqualTo(5))
        expectConstraints(schema, Arbitrary.makeNumberConstraints({ max: 5 }))
        Util.assertions.arbitrary.validateGeneratedValues(schema)
      })

      it("greaterThanOrEqualTo", () => {
        const schema = S.Number.pipe(S.greaterThanOrEqualTo(2))
        expectConstraints(schema, Arbitrary.makeNumberConstraints({ min: 2 }))
        Util.assertions.arbitrary.validateGeneratedValues(schema)
      })

      it("lessThan", () => {
        const schema = S.Number.pipe(S.lessThan(5))
        expectConstraints(schema, Arbitrary.makeNumberConstraints({ max: 5, maxExcluded: true }))
        Util.assertions.arbitrary.validateGeneratedValues(schema)
      })

      it("greaterThan", () => {
        const schema = S.Number.pipe(S.greaterThan(2))
        expectConstraints(schema, Arbitrary.makeNumberConstraints({ min: 2, minExcluded: true }))
        Util.assertions.arbitrary.validateGeneratedValues(schema)
      })

      it("between", () => {
        const schema = S.Number.pipe(S.between(2, 5))
        expectConstraints(schema, Arbitrary.makeNumberConstraints({ min: 2, max: 5 }))
        Util.assertions.arbitrary.validateGeneratedValues(schema)
      })
    })

    describe("bigint filters", () => {
      it("lessThanOrEqualTo", () => {
        const schema = S.BigIntFromSelf.pipe(S.lessThanOrEqualToBigInt(BigInt(5)))
        expectConstraints(schema, Arbitrary.makeBigIntConstraints({ max: BigInt(5) }))
        Util.assertions.arbitrary.validateGeneratedValues(schema)
      })

      it("greaterThanOrEqualTo", () => {
        const schema = S.BigIntFromSelf.pipe(S.greaterThanOrEqualToBigInt(BigInt(2)))
        expectConstraints(schema, Arbitrary.makeBigIntConstraints({ min: BigInt(2) }))
        Util.assertions.arbitrary.validateGeneratedValues(schema)
      })

      it("lessThan", () => {
        const schema = S.BigIntFromSelf.pipe(S.lessThanBigInt(BigInt(5)))
        expectConstraints(schema, Arbitrary.makeBigIntConstraints({ max: BigInt(5) }))
        Util.assertions.arbitrary.validateGeneratedValues(schema)
      })

      it("greaterThan", () => {
        const schema = S.BigIntFromSelf.pipe(S.greaterThanBigInt(BigInt(2)))
        expectConstraints(schema, Arbitrary.makeBigIntConstraints({ min: BigInt(2) }))
        Util.assertions.arbitrary.validateGeneratedValues(schema)
      })

      it("between", () => {
        const schema = S.BigIntFromSelf.pipe(S.betweenBigInt(BigInt(2), BigInt(5)))
        expectConstraints(schema, Arbitrary.makeBigIntConstraints({ min: BigInt(2), max: BigInt(5) }))
        Util.assertions.arbitrary.validateGeneratedValues(schema)
      })
    })

    describe("date filters", () => {
      it("ValidDateFromSelf", () => {
        const schema = S.ValidDateFromSelf
        expectConstraints(schema, Arbitrary.makeDateConstraints({ noInvalidDate: true }))
        Util.assertions.arbitrary.validateGeneratedValues(schema)
      })

      it("lessThanOrEqualTo", () => {
        const schema = S.DateFromSelf.pipe(S.lessThanOrEqualToDate(new Date(5)))
        expectConstraints(schema, Arbitrary.makeDateConstraints({ noInvalidDate: false, max: new Date(5) }))
        Util.assertions.arbitrary.validateGeneratedValues(schema)
      })

      it("greaterThanOrEqualTo", () => {
        const schema = S.DateFromSelf.pipe(S.greaterThanOrEqualToDate(new Date(2)))
        expectConstraints(schema, Arbitrary.makeDateConstraints({ noInvalidDate: false, min: new Date(2) }))
        Util.assertions.arbitrary.validateGeneratedValues(schema)
      })

      it("lessThan", () => {
        const schema = S.DateFromSelf.pipe(S.lessThanDate(new Date(5)))
        expectConstraints(schema, Arbitrary.makeDateConstraints({ noInvalidDate: false, max: new Date(5) }))
        Util.assertions.arbitrary.validateGeneratedValues(schema)
      })

      it("greaterThan", () => {
        const schema = S.DateFromSelf.pipe(S.greaterThanDate(new Date(2)))
        expectConstraints(schema, Arbitrary.makeDateConstraints({ noInvalidDate: false, min: new Date(2) }))
        Util.assertions.arbitrary.validateGeneratedValues(schema)
      })

      it("between", () => {
        const schema = S.DateFromSelf.pipe(S.betweenDate(new Date(2), new Date(5)))
        expectConstraints(
          schema,
          Arbitrary.makeDateConstraints({ noInvalidDate: false, min: new Date(2), max: new Date(5) })
        )
        Util.assertions.arbitrary.validateGeneratedValues(schema)
      })
    })
  })

  describe("Transformation", () => {
    describe("number transformations", () => {
      it("clamp with numbers with decimals", () => {
        const schema = S.Number.pipe(S.clamp(1.3, 3.1))
        Util.assertions.arbitrary.validateGeneratedValues(schema)
      })
    })
  })

  describe("arbitrary annotation", () => {
    const expectHook = <A, I>(source: S.Schema<A, I>) => {
      const schema = source.annotations({ arbitrary: () => (fc) => fc.constant("custom arbitrary") as any })
      const arb = Arbitrary.make(schema)
      expect(fc.sample(arb, 1)[0]).toEqual("custom arbitrary")
    }

    it("Void", () => {
      expectHook(S.Void)
    })

    it("Never", () => {
      expectHook(S.Never)
    })

    it("Literal", () => {
      expectHook(S.Literal("a"))
    })

    it("Symbol", () => {
      expectHook(S.Symbol)
    })

    it("UniqueSymbolFromSelf", () => {
      expectHook(S.UniqueSymbolFromSelf(Symbol.for("effect/schema/test/a")))
    })

    it("TemplateLiteral", () => {
      expectHook(S.TemplateLiteral(S.Literal("a"), S.String, S.Literal("b")))
    })

    it("Undefined", () => {
      expectHook(S.Undefined)
    })

    it("Unknown", () => {
      expectHook(S.Unknown)
    })

    it("Any", () => {
      expectHook(S.Any)
    })

    it("Object", () => {
      expectHook(S.Object)
    })

    it("String", () => {
      expectHook(S.String)
    })

    it("Number", () => {
      expectHook(S.Number)
    })

    it("BigIntFromSelf", () => {
      expectHook(S.BigIntFromSelf)
    })

    it("Boolean", () => {
      expectHook(S.Boolean)
    })

    it("Enums", () => {
      enum Fruits {
        Apple,
        Banana
      }
      expectHook(S.Enums(Fruits))
    })

    it("Tuple", () => {
      expectHook(S.Tuple(S.String, S.Number))
    })

    it("Struct", () => {
      expectHook(S.Struct({ a: S.String, b: S.Number }))
    })

    it("Union", () => {
      expectHook(S.Union(S.String, S.Number))
    })

    it("suspend", () => {
      interface A {
        readonly a: string
        readonly as: ReadonlyArray<A>
      }
      const schema = S.Struct({
        a: S.String,
        as: S.Array(S.suspend((): S.Schema<A> => schema))
      })
      expectHook(schema)
    })

    describe("Refinement", () => {
      it("NonEmptyString", () => {
        expectHook(S.NonEmptyString)
      })

      it("should provide the `from` Arbitrary", () => {
        const schema = S.String.pipe(S.filter((s) => s.length > 2, {
          arbitrary: (from, ctx) => (fc) => {
            assert.isFunction(from)
            assert.isObject(ctx)
            return from(fc).filter((s) => s.length > 2)
          }
        }))
        Util.assertions.arbitrary.validateGeneratedValues(schema)
      })
    })

    it("Transformation", () => {
      expectHook(S.NumberFromString)
    })
  })

  describe("DateTime", () => {
    it("DateTimeUtcFromSelf", () => {
      Util.assertions.arbitrary.validateGeneratedValues(S.DateTimeUtcFromSelf)
    })

    it("TimeZoneOffsetFromSelf", () => {
      Util.assertions.arbitrary.validateGeneratedValues(S.TimeZoneOffsetFromSelf)
    })

    it("TimeZoneNamedFromSelf", () => {
      Util.assertions.arbitrary.validateGeneratedValues(S.TimeZoneNamedFromSelf)
    })

    it("DateTimeZonedFromSelf", () => {
      Util.assertions.arbitrary.validateGeneratedValues(S.DateTimeZonedFromSelf)
    })
  })
})
