import { describe, it } from "@effect/vitest"
import type { FastCheck } from "effect"
import { FastCheck as fc, Order, Predicate, Schema as S, SchemaAST } from "effect"
import * as Arbitrary from "effect/Arb"
import * as Util from "effect/test/Schema/TestUtils"
import { assertTrue, deepStrictEqual, strictEqual, throws } from "effect/test/util"

describe("Arb", () => {
  describe("getDescription", () => {
    // const expectConstraints = <A, I>(
    //   schema: S.Schema<A, I, never>,
    //   constraints: ReadonlyArray<
    //     | ReturnType<typeof Arbitrary.makeStringConstraints>
    //     | ReturnType<typeof Arbitrary.makeNumberConstraints>
    //     | ReturnType<typeof Arbitrary.makeBigIntConstraints>
    //     | ReturnType<typeof Arbitrary.makeDateConstraints>
    //     | ReturnType<typeof Arbitrary.makeArrayConstraints>
    //   >
    // ) => {
    //   const description = Arbitrary.getDescription(schema.ast, [])
    //   switch (description._tag) {
    //     case "StringKeyword": {
    //       assertTrue(constraints.every((c) => c._tag === "StringConstraints"))
    //       deepStrictEqual(description.constraints, constraints)
    //       break
    //     }
    //     case "NumberKeyword": {
    //       assertTrue(constraints.every((c) => c._tag === "NumberConstraints"))
    //       deepStrictEqual(description.constraints, constraints)
    //       break
    //     }
    //     case "BigIntKeyword": {
    //       assertTrue(constraints.every((c) => c._tag === "BigIntConstraints"))
    //       deepStrictEqual(description.constraints, constraints)
    //       break
    //     }
    //     case "DateDeclaration": {
    //       assertTrue(constraints.every((c) => c._tag === "DateConstraints"))
    //       deepStrictEqual(description.constraints, constraints)
    //       break
    //     }
    //     case "TupleType": {
    //       assertTrue(constraints.every((c) => c._tag === "ArrayConstraints"))
    //       deepStrictEqual(description.constraints, constraints)
    //       break
    //     }
    //   }
    // }

    describe("String", () => {
      it("String", () => {
        const schema = S.String
        deepStrictEqual(Arbitrary.getDescription(schema.ast, []), {
          _tag: "StringKeyword",
          refinements: [],
          constraints: [],
          annotations: []
        })
      })

      it("String & minLength(2) & maxLength(5)", () => {
        const schema = S.String.pipe(S.minLength(2), S.maxLength(5))
        const ast = schema.ast
        assertTrue(SchemaAST.isRefinement(ast))
        assertTrue(SchemaAST.isRefinement(ast.from))
        deepStrictEqual(Arbitrary.getDescription(ast, []), {
          "_tag": "StringKeyword",
          "refinements": [
            ast.from,
            ast
          ],
          "constraints": [
            {
              "_tag": "StringConstraints",
              "constraints": {
                "minLength": 2
              }
            },
            {
              "_tag": "StringConstraints",
              "constraints": {
                "maxLength": 5
              }
            }
          ],
          annotations: []
        })
      })

      it("String & annotation", () => {
        const f = () => (fc: typeof FastCheck) => fc.constant("a")
        const schema = S.String.annotations({ arbitrary: f })
        deepStrictEqual(Arbitrary.getDescription(schema.ast, []), {
          _tag: "StringKeyword",
          refinements: [],
          constraints: [],
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
          refinements: [ast],
          constraints: [
            {
              _tag: "StringConstraints",
              constraints: {
                minLength: 2
              }
            }
          ],
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
          refinements: [ast],
          constraints: [
            {
              _tag: "StringConstraints",
              constraints: {
                minLength: 2
              }
            }
          ],
          annotations: [f]
        })
      })
    })

    describe("suspend", () => {
      it("suspend", () => {
        interface A {
          readonly a: string
          readonly as: ReadonlyArray<A>
        }
        const schema = S.Struct({
          a: S.String,
          as: S.Array(
            S.suspend((): S.Schema<A> => schema)
          )
        })
        deepStrictEqual(Arbitrary.getDescription(schema.ast, []), {
          "_tag": "TypeLiteral",
          "refinements": [],
          "annotations": [],
          "propertySignatures": [
            {
              "isOptional": false,
              "name": "a",
              "value": {
                "_tag": "StringKeyword",
                "refinements": [],
                "constraints": [],
                "annotations": []
              }
            },
            {
              "isOptional": false,
              "name": "as",
              "value": {
                "_tag": "TupleType",
                "refinements": [],
                "constraints": [],
                "annotations": [],
                "elements": [],
                "rest": [
                  {
                    "_tag": "Suspend",
                    "id": "id-1",
                    "ast": schema.ast,
                    "refinements": [],
                    "annotations": [],
                    "description": {
                      "_tag": "TypeLiteral",
                      "refinements": [],
                      "annotations": [],
                      "propertySignatures": [
                        {
                          "isOptional": false,
                          "name": "a",
                          "value": {
                            "_tag": "StringKeyword",
                            "refinements": [],
                            "constraints": [],
                            "annotations": []
                          }
                        },
                        {
                          "isOptional": false,
                          "name": "as",
                          "value": {
                            "_tag": "TupleType",
                            "refinements": [],
                            "annotations": [],
                            "constraints": [],
                            "elements": [],
                            "rest": [
                              {
                                "_tag": "Ref",
                                "id": "id-1",
                                "ast": schema.ast,
                                "refinements": [],
                                "annotations": []
                              }
                            ]
                          }
                        }
                      ],
                      "indexSignatures": []
                    }
                  }
                ]
              }
            }
          ],
          "indexSignatures": []
        })
      })

      it("suspend & annotation", () => {
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
        const f = () => () => arb
        const schema = S.Struct({
          a: S.String,
          as: S.Array(
            S.suspend((): S.Schema<A> => schema).annotations({ arbitrary: f })
          )
        })
        deepStrictEqual(Arbitrary.getDescription(schema.ast, []), {
          "_tag": "TypeLiteral",
          "refinements": [],
          "propertySignatures": [
            {
              "isOptional": false,
              "name": "a",
              "value": {
                "_tag": "StringKeyword",
                "refinements": [],
                "constraints": [],
                "annotations": []
              }
            },
            {
              "isOptional": false,
              "name": "as",
              "value": {
                "_tag": "TupleType",
                "refinements": [],
                "constraints": [],
                "elements": [],
                "rest": [
                  {
                    "_tag": "Suspend",
                    "id": "id-2",
                    "ast": schema.ast,
                    "refinements": [],
                    "annotations": [f],
                    "description": {
                      "_tag": "TypeLiteral",
                      "refinements": [],
                      "annotations": [],
                      "propertySignatures": [
                        {
                          "isOptional": false,
                          "name": "a",
                          "value": {
                            "_tag": "StringKeyword",
                            "refinements": [],
                            "constraints": [],
                            "annotations": []
                          }
                        },
                        {
                          "isOptional": false,
                          "name": "as",
                          "value": {
                            "_tag": "TupleType",
                            "refinements": [],
                            "constraints": [],
                            "elements": [],
                            "rest": [
                              {
                                "_tag": "Ref",
                                "id": "id-2",
                                "ast": schema.ast,
                                "refinements": [],
                                "annotations": [f]
                              }
                            ],
                            "annotations": []
                          }
                        }
                      ],
                      "indexSignatures": []
                    }
                  }
                ],
                "annotations": []
              }
            }
          ],
          "indexSignatures": [],
          "annotations": []
        })
      })
    })
  })

  describe("makeLazy", () => {
    describe("Unsupported schemas", () => {
      it("should throw on declarations without annotations", () => {
        const schema = S.declare(Predicate.isUnknown)
        throws(
          () => Arbitrary.makeLazy(schema),
          new Error(`Missing annotation
details: Generating an Arbitrary for this schema requires an "arbitrary" annotation
schema (Declaration): <declaration schema>`)
        )
      })

      it("the errors should disply a path", () => {
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

      it("Never", () => {
        throws(
          () => Arbitrary.makeLazy(S.Never),
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
        throws(
          () => Arbitrary.makeLazy(schema)(fc),
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
        strictEqual(fc.sample(arb, 1)[0], "custom arbitrary" as any)
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
              assertTrue(Predicate.isFunction(from))
              assertTrue(Predicate.isObject(ctx))
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
})
