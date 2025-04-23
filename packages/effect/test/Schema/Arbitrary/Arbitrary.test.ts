import { describe, it } from "@effect/vitest"
import { assertTrue, deepStrictEqual, strictEqual, throws } from "@effect/vitest/utils"
import type { FastCheck } from "effect"
import { Arbitrary, FastCheck as fc, Order, Predicate, Schema as S, SchemaAST } from "effect"
import * as Util from "../TestUtils.js"

describe("Arb", () => {
  describe("getDescription", () => {
    describe("String", () => {
      it("String", () => {
        const schema = S.String
        deepStrictEqual(Arbitrary.getDescription(schema.ast, []), {
          _tag: "StringKeyword",
          constraints: [],
          path: [],
          refinements: [],
          annotations: []
        })
      })

      it("String & minLength(2) & maxLength(5)", () => {
        const schema = S.String.pipe(S.minLength(2), S.maxLength(5))
        const ast = schema.ast
        assertTrue(SchemaAST.isRefinement(ast))
        assertTrue(SchemaAST.isRefinement(ast.from))
        deepStrictEqual(Arbitrary.getDescription(ast, []), {
          _tag: "StringKeyword",
          constraints: [
            {
              _tag: "StringConstraints",
              constraints: {
                "minLength": 2
              }
            },
            {
              _tag: "StringConstraints",
              constraints: {
                maxLength: 5
              }
            }
          ],
          path: [],
          refinements: [
            ast.from,
            ast
          ],
          annotations: []
        })
      })

      it("String & annotation", () => {
        const f = () => (fc: typeof FastCheck) => fc.constant("a")
        const schema = S.String.annotations({ arbitrary: f })
        deepStrictEqual(Arbitrary.getDescription(schema.ast, []), {
          _tag: "StringKeyword",
          constraints: [],
          path: [],
          refinements: [],
          annotations: [f]
        })
      })

      it("String & annotation & minLength(2)", () => {
        const f = () => (fc: typeof FastCheck) => fc.constant("a")
        const schema = S.String.annotations({ arbitrary: f }).pipe(S.minLength(2))
        const ast = schema.ast
        assertTrue(SchemaAST.isRefinement(ast))
        deepStrictEqual(Arbitrary.getDescription(ast, []), {
          _tag: "StringKeyword",
          constraints: [
            {
              _tag: "StringConstraints",
              constraints: {
                minLength: 2
              }
            }
          ],
          path: [],
          refinements: [ast],
          annotations: [f]
        })
      })

      it("String & minLength(2) & annotation", () => {
        const f = () => (fc: typeof FastCheck) => fc.constant("a")
        const schema = S.String.pipe(S.minLength(2, { arbitrary: f }))
        const ast = schema.ast
        assertTrue(SchemaAST.isRefinement(ast))
        deepStrictEqual(Arbitrary.getDescription(ast, []), {
          _tag: "StringKeyword",
          constraints: [
            {
              _tag: "StringConstraints",
              constraints: {
                minLength: 2
              }
            }
          ],
          path: [],
          refinements: [ast],
          annotations: [f]
        })
      })
    })
  })

  describe("makeLazy", () => {
    describe("Errors", () => {
      it("should throw on `Declaration`s without annotations", () => {
        const schema = S.declare(Predicate.isUnknown)
        throws(
          () => Arbitrary.makeLazy(schema),
          new Error(`Missing annotation
details: Generating an Arbitrary for this schema requires an "arbitrary" annotation
schema (Declaration): <declaration schema>`)
        )
        throws(
          () => Arbitrary.makeLazy(S.Tuple(S.declare(Predicate.isUnknown))),
          new Error(`Missing annotation
at path: [0]
details: Generating an Arbitrary for this schema requires an "arbitrary" annotation
schema (Declaration): <declaration schema>`)
        )
        throws(
          () => Arbitrary.makeLazy(S.Struct({ a: S.declare(Predicate.isUnknown) })),
          new Error(`Missing annotation
at path: ["a"]
details: Generating an Arbitrary for this schema requires an "arbitrary" annotation
schema (Declaration): <declaration schema>`)
        )
        throws(
          () =>
            Arbitrary.makeLazy(
              S.Record({ key: S.String, value: S.declare(Predicate.isUnknown) })
            ),
          new Error(`Missing annotation
details: Generating an Arbitrary for this schema requires an "arbitrary" annotation
schema (Declaration): <declaration schema>`)
        )
      })

      it("should throw on `NeverKeyword`s without annotations", () => {
        throws(
          () => Arbitrary.makeLazy(S.Never),
          new Error(`Missing annotation
details: Generating an Arbitrary for this schema requires an "arbitrary" annotation
schema (NeverKeyword): never`)
        )
      })

      it("should throw on `Enums`s with no enums", () => {
        enum Fruits {}
        const schema = S.Enums(Fruits)
        throws(
          () => Arbitrary.makeLazy(schema)(fc),
          new Error(`Empty Enums schema
details: Generating an Arbitrary for this schema requires at least one enum`)
        )
      })
    })

    describe("Unrefined Primitives", () => {
      it("Void", () => {
        Util.assertions.arbitrary.validateGeneratedValues(S.Void)
      })

      it("String", () => {
        const schema = S.String
        Util.assertions.arbitrary.validateGeneratedValues(schema)
      })

      it("Number", () => {
        Util.assertions.arbitrary.validateGeneratedValues(S.Number)
      })

      it("Boolean", () => {
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

      it("UniqueSymbolFromSelf", () => {
        const a = Symbol.for("effect/Schema/test/a")
        const schema = S.UniqueSymbolFromSelf(a)
        Util.assertions.arbitrary.validateGeneratedValues(schema)
      })

      describe("Literal", () => {
        it("single literal", () => {
          const schema = S.Literal(1)
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })

        it("multiple literals", () => {
          const schema = S.Literal(1, "a")
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })
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

      it("Union", () => {
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

        it.skip("mutually suspended schemas", { retry: 5 }, () => {
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
      })

      describe("Transformation", () => {
        it("clamp", () => {
          const schema = S.Number.pipe(S.clamp(1.3, 3.1))
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })
      })
    })

    describe("Data Types", () => {
      describe("Unrefined", () => {
        it("DateFromSelf", () => {
          const schema = S.DateFromSelf
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })

        it("DurationFromSelf", () => {
          const schema = S.DurationFromSelf
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })
      })

      describe("Suspend", () => {
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
    })

    describe("Refinement", () => {
      const assertConstraints = <A, I>(
        schema: S.Schema<A, I, never>,
        constraints: ReadonlyArray<
          | ReturnType<typeof Arbitrary.makeStringConstraints>
          | ReturnType<typeof Arbitrary.makeNumberConstraints>
          | ReturnType<typeof Arbitrary.makeBigIntConstraints>
          | ReturnType<typeof Arbitrary.makeDateConstraints>
          | ReturnType<typeof Arbitrary.makeArrayConstraints>
        >
      ) => {
        const description = Arbitrary.getDescription(schema.ast, [])
        switch (description._tag) {
          case "StringKeyword": {
            assertTrue(constraints.every((c) => c._tag === "StringConstraints"))
            deepStrictEqual(description.constraints, constraints)
            break
          }
          case "NumberKeyword": {
            assertTrue(constraints.every((c) => c._tag === "NumberConstraints"))
            deepStrictEqual(description.constraints, constraints)
            break
          }
          case "BigIntKeyword": {
            assertTrue(constraints.every((c) => c._tag === "BigIntConstraints"))
            deepStrictEqual(description.constraints, constraints)
            break
          }
          case "DateFromSelf": {
            assertTrue(constraints.every((c) => c._tag === "DateConstraints"))
            deepStrictEqual(description.constraints, constraints)
            break
          }
          case "TupleType": {
            assertTrue(constraints.every((c) => c._tag === "ArrayConstraints"))
            deepStrictEqual(description.constraints, constraints)
            break
          }
        }
      }

      describe("array filters", () => {
        it("Array", () => {
          const schema = S.Array(S.String).pipe(S.filter(() => true))
          assertConstraints(schema, [Arbitrary.makeArrayConstraints({})])
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })

        it("minItems (Array)", () => {
          const schema = S.Array(S.String).pipe(S.minItems(2))
          assertConstraints(schema, [Arbitrary.makeArrayConstraints({ minLength: 2 })])
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })

        it("minItems (NonEmptyArray)", () => {
          const schema = S.NonEmptyArray(S.String).pipe(S.minItems(2))
          assertConstraints(schema, [Arbitrary.makeArrayConstraints({ minLength: 2 })])
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })

        it("maxItems (Array)", () => {
          const schema = S.Array(S.String).pipe(S.maxItems(5))
          assertConstraints(schema, [Arbitrary.makeArrayConstraints({ maxLength: 5 })])
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })

        it("maxItems (NonEmptyArray)", () => {
          const schema = S.NonEmptyArray(S.String).pipe(S.maxItems(5))
          assertConstraints(schema, [Arbitrary.makeArrayConstraints({ maxLength: 5 })])
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })

        it("itemsCount (Array)", () => {
          const schema = S.Array(S.String).pipe(S.itemsCount(3))
          assertConstraints(schema, [Arbitrary.makeArrayConstraints({ minLength: 3, maxLength: 3 })])
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })

        it("itemsCount (NonEmptyArray)", () => {
          const schema = S.NonEmptyArray(S.String).pipe(S.itemsCount(3))
          assertConstraints(schema, [Arbitrary.makeArrayConstraints({ minLength: 3, maxLength: 3 })])
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })
      })

      describe("string filters", () => {
        it("String", () => {
          const schema = S.String.pipe(S.filter(() => true))
          assertConstraints(schema, [Arbitrary.makeStringConstraints({})])
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })

        it("minLength", () => {
          const schema = S.String.pipe(S.minLength(2))
          assertConstraints(schema, [Arbitrary.makeStringConstraints({ minLength: 2 })])
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })

        it("maxLength", () => {
          const schema = S.String.pipe(S.maxLength(5))
          assertConstraints(schema, [Arbitrary.makeStringConstraints({ maxLength: 5 })])
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })

        it("length: number", () => {
          const schema = S.String.pipe(S.length(10))
          assertConstraints(schema, [Arbitrary.makeStringConstraints({ minLength: 10, maxLength: 10 })])
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })

        it("length: { min, max }", () => {
          const schema = S.String.pipe(S.length({ min: 2, max: 5 }))
          assertConstraints(schema, [Arbitrary.makeStringConstraints({ minLength: 2, maxLength: 5 })])
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })

        it("minLength + maxLength", () => {
          const schema = S.String.pipe(S.minLength(2), S.maxLength(5))
          assertConstraints(schema, [
            Arbitrary.makeStringConstraints({ minLength: 2 }),
            Arbitrary.makeStringConstraints({ maxLength: 5 })
          ])
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })

        it("annotation + minLength + maxLength", () => {
          const schema = S.String.annotations({ arbitrary: () => (fc) => fc.string() }).pipe(
            S.minLength(2),
            S.maxLength(5)
          )
          assertConstraints(schema, [
            Arbitrary.makeStringConstraints({ minLength: 2 }),
            Arbitrary.makeStringConstraints({ maxLength: 5 })
          ])
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })

        it("minLength + maxLength + annotation", () => {
          const schema = S.String.pipe(
            S.minLength(2),
            S.maxLength(5)
          ).annotations({ arbitrary: () => (fc) => fc.string() })
          assertConstraints(schema, [
            Arbitrary.makeStringConstraints({ minLength: 2 }),
            Arbitrary.makeStringConstraints({ maxLength: 5 })
          ])
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })

        it("startsWith", () => {
          const schema = S.String.pipe(S.startsWith("a"))
          assertConstraints(schema, [Arbitrary.makeStringConstraints({ pattern: "^a" })])
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })

        it("endsWith", () => {
          const schema = S.String.pipe(S.endsWith("a"))
          assertConstraints(schema, [Arbitrary.makeStringConstraints({ pattern: "^.*a$" })])
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })

        it("pattern", () => {
          const regex = /^[A-Z]{3}[0-9]{3}$/
          const schema = S.String.pipe(S.pattern(regex))
          assertConstraints(schema, [Arbitrary.makeStringConstraints({ pattern: regex.source })])
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })

        it("nonEmptyString + pattern", () => {
          const regex = /^[-]*$/
          const schema = S.String.pipe(S.nonEmptyString(), S.pattern(regex))
          assertConstraints(schema, [
            Arbitrary.makeStringConstraints({ minLength: 1 }),
            Arbitrary.makeStringConstraints({ pattern: regex.source })
          ])
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })

        it("pattern + pattern", () => {
          const regexp1 = /^[^A-Z]*$/
          const regexp2 = /^0x[0-9a-f]{40}$/
          const schema = S.String.pipe(S.pattern(regexp1), S.pattern(regexp2))
          assertConstraints(
            schema,
            [
              Arbitrary.makeStringConstraints({ pattern: regexp1.source }),
              Arbitrary.makeStringConstraints({ pattern: regexp2.source })
            ]
          )
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })
      })

      describe("number filters", () => {
        it("Number", () => {
          const schema = S.Number.pipe(S.filter(() => true))
          assertConstraints(schema, [Arbitrary.makeNumberConstraints({})])
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })

        it("nonNaN", () => {
          const schema = S.Number.pipe(S.nonNaN())
          assertConstraints(schema, [Arbitrary.makeNumberConstraints({ noNaN: true })])
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })

        it("finite", () => {
          const schema = S.Number.pipe(S.finite())
          assertConstraints(schema, [Arbitrary.makeNumberConstraints({ noNaN: true, noDefaultInfinity: true })])
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })

        it("JsonNumber", () => {
          const schema = S.JsonNumber
          assertConstraints(schema, [Arbitrary.makeNumberConstraints({ noDefaultInfinity: true, noNaN: true })])
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })

        it("int", () => {
          const schema = S.Number.pipe(S.int())
          assertConstraints(schema, [Arbitrary.makeNumberConstraints({ isInteger: true })])
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })

        it("between int", () => {
          const schema = S.Number.pipe(S.between(2, 5), S.int())
          assertConstraints(schema, [
            Arbitrary.makeNumberConstraints({ min: 2, max: 5 }),
            Arbitrary.makeNumberConstraints({ isInteger: true })
          ])
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })

        it("int between", () => {
          const schema = S.Number.pipe(S.int(), S.between(2, 5))
          assertConstraints(schema, [
            Arbitrary.makeNumberConstraints({ isInteger: true }),
            Arbitrary.makeNumberConstraints({ min: 2, max: 5 })
          ])
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })

        it("lessThanOrEqualTo", () => {
          const schema = S.Number.pipe(S.lessThanOrEqualTo(5))
          assertConstraints(schema, [Arbitrary.makeNumberConstraints({ max: 5 })])
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })

        it("greaterThanOrEqualTo", () => {
          const schema = S.Number.pipe(S.greaterThanOrEqualTo(2))
          assertConstraints(schema, [Arbitrary.makeNumberConstraints({ min: 2 })])
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })

        it("lessThan", () => {
          const schema = S.Number.pipe(S.lessThan(5))
          assertConstraints(schema, [Arbitrary.makeNumberConstraints({ max: 5, maxExcluded: true })])
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })

        it("greaterThan", () => {
          const schema = S.Number.pipe(S.greaterThan(2))
          assertConstraints(schema, [Arbitrary.makeNumberConstraints({ min: 2, minExcluded: true })])
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })

        it("between", () => {
          const schema = S.Number.pipe(S.between(2, 5))
          assertConstraints(schema, [Arbitrary.makeNumberConstraints({ min: 2, max: 5 })])
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })
      })

      describe("bigint filters", () => {
        it("BigIntFromSelf", () => {
          const schema = S.BigIntFromSelf.pipe(S.filter(() => true))
          assertConstraints(schema, [])
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })

        it("lessThanOrEqualTo", () => {
          const schema = S.BigIntFromSelf.pipe(S.lessThanOrEqualToBigInt(BigInt(5)))
          assertConstraints(schema, [Arbitrary.makeBigIntConstraints({ max: BigInt(5) })])
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })

        it("greaterThanOrEqualTo", () => {
          const schema = S.BigIntFromSelf.pipe(S.greaterThanOrEqualToBigInt(BigInt(2)))
          assertConstraints(schema, [Arbitrary.makeBigIntConstraints({ min: BigInt(2) })])
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })

        it("lessThan", () => {
          const schema = S.BigIntFromSelf.pipe(S.lessThanBigInt(BigInt(5)))
          assertConstraints(schema, [Arbitrary.makeBigIntConstraints({ max: BigInt(5) })])
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })

        it("greaterThan", () => {
          const schema = S.BigIntFromSelf.pipe(S.greaterThanBigInt(BigInt(2)))
          assertConstraints(schema, [Arbitrary.makeBigIntConstraints({ min: BigInt(2) })])
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })

        it("between", () => {
          const schema = S.BigIntFromSelf.pipe(S.betweenBigInt(BigInt(2), BigInt(5)))
          assertConstraints(schema, [Arbitrary.makeBigIntConstraints({ min: BigInt(2), max: BigInt(5) })])
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })
      })

      describe("date filters", () => {
        it("DateFromSelf", () => {
          const schema = S.DateFromSelf
          assertConstraints(schema, [
            Arbitrary.makeDateConstraints({ noInvalidDate: false })
          ])
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })

        it("ValidDateFromSelf", () => {
          const schema = S.ValidDateFromSelf
          assertConstraints(schema, [
            Arbitrary.makeDateConstraints({ noInvalidDate: false }),
            Arbitrary.makeDateConstraints({ noInvalidDate: true })
          ])
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })

        it("lessThanOrEqualTo", () => {
          const schema = S.DateFromSelf.pipe(S.lessThanOrEqualToDate(new Date(5)))
          assertConstraints(schema, [
            Arbitrary.makeDateConstraints({ noInvalidDate: false }),
            Arbitrary.makeDateConstraints({ max: new Date(5) })
          ])
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })

        it("greaterThanOrEqualTo", () => {
          const schema = S.DateFromSelf.pipe(S.greaterThanOrEqualToDate(new Date(2)))
          assertConstraints(schema, [
            Arbitrary.makeDateConstraints({ noInvalidDate: false }),
            Arbitrary.makeDateConstraints({ min: new Date(2) })
          ])
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })

        it("lessThan", () => {
          const schema = S.DateFromSelf.pipe(S.lessThanDate(new Date(5)))
          assertConstraints(schema, [
            Arbitrary.makeDateConstraints({ noInvalidDate: false }),
            Arbitrary.makeDateConstraints({ max: new Date(5) })
          ])
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })

        it("greaterThan", () => {
          const schema = S.DateFromSelf.pipe(S.greaterThanDate(new Date(2)))
          assertConstraints(schema, [
            Arbitrary.makeDateConstraints({ noInvalidDate: false }),
            Arbitrary.makeDateConstraints({ min: new Date(2) })
          ])
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })

        it("between", () => {
          const schema = S.DateFromSelf.pipe(S.betweenDate(new Date(2), new Date(5)))
          assertConstraints(
            schema,
            [
              Arbitrary.makeDateConstraints({ noInvalidDate: false }),
              Arbitrary.makeDateConstraints({ min: new Date(2), max: new Date(5) })
            ]
          )
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })
      })
    })

    describe("Annotations", () => {
      const assertAnnotation = <A, I>(source: S.Schema<A, I>) => {
        const schema = source.annotations({ arbitrary: () => (fc) => fc.constant("custom arbitrary") as any })
        const arb = Arbitrary.make(schema)
        strictEqual(fc.sample(arb, 1)[0], "custom arbitrary" as any)
      }

      it("Never", () => {
        assertAnnotation(S.Never)
      })

      it("Void", () => {
        assertAnnotation(S.Void)
      })

      it("Literal", () => {
        assertAnnotation(S.Literal("a"))
      })

      it("Symbol", () => {
        assertAnnotation(S.Symbol)
      })

      it("UniqueSymbolFromSelf", () => {
        assertAnnotation(S.UniqueSymbolFromSelf(Symbol.for("effect/schema/test/a")))
      })

      it("TemplateLiteral", () => {
        assertAnnotation(S.TemplateLiteral(S.Literal("a"), S.String, S.Literal("b")))
      })

      it("Undefined", () => {
        assertAnnotation(S.Undefined)
      })

      it("Unknown", () => {
        assertAnnotation(S.Unknown)
      })

      it("Any", () => {
        assertAnnotation(S.Any)
      })

      it("Object", () => {
        assertAnnotation(S.Object)
      })

      it("String", () => {
        assertAnnotation(S.String)
      })

      it("Number", () => {
        assertAnnotation(S.Number)
      })

      it("Boolean", () => {
        assertAnnotation(S.Boolean)
      })

      it("BigIntFromSelf", () => {
        assertAnnotation(S.BigIntFromSelf)
      })

      it("Enums", () => {
        enum Fruits {
          Apple,
          Banana
        }
        assertAnnotation(S.Enums(Fruits))
      })

      it("Tuple", () => {
        assertAnnotation(S.Tuple(S.String, S.Number))
      })

      it("Struct", () => {
        assertAnnotation(S.Struct({ a: S.String, b: S.Number }))
      })

      it("Union", () => {
        assertAnnotation(S.Union(S.String, S.Number))
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
        assertAnnotation(schema)
      })

      describe("Refinement", () => {
        it("should provide the `from` Arbitrary", () => {
          const schema = S.String.pipe(S.filter((s) => s.length > 2, {
            arbitrary: (from, ctx) => (fc) => {
              assertTrue(Predicate.isFunction(from))
              assertTrue(Predicate.isObject(ctx))
              return from(fc)
            }
          }))
          Util.assertions.arbitrary.validateGeneratedValues(schema)
        })

        it("NonEmptyString", () => {
          assertAnnotation(S.NonEmptyString)
        })
      })

      it("Transformation", () => {
        assertAnnotation(S.NumberFromString)
      })
    })
  })
})
