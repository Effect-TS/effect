import * as E from "@effect/data/Either"
import { pipe } from "@effect/data/Function"
import * as O from "@effect/data/Option"
import * as AST from "@effect/schema/AST"
import * as P from "@effect/schema/Parser"
import * as S from "@effect/schema/Schema"

describe.concurrent("Schema", () => {
  it("exports", () => {
    expect(S.parse).exist
    expect(S.parseOption).exist
    expect(S.parseEither).exist

    expect(S.GreaterThanBigintTypeId).exist
    expect(S.GreaterThanOrEqualToBigintTypeId).exist
    expect(S.LessThanBigintTypeId).exist
    expect(S.LessThanOrEqualToBigintTypeId).exist
    expect(S.BetweenBigintTypeId).exist
    expect(S.PositiveBigintTypeId).exist
    expect(S.NegativeBigintTypeId).exist
    expect(S.NonNegativeBigintTypeId).exist
    expect(S.NonPositiveBigintTypeId).exist
    expect(S.BrandTypeId).exist
    expect(S.FiniteTypeId).exist
    expect(S.GreaterThanTypeId).exist
    expect(S.GreaterThanOrEqualToTypeId).exist
    expect(S.MultipleOfTypeId).exist
    expect(S.IntTypeId).exist
    expect(S.LessThanTypeId).exist
    expect(S.LessThanOrEqualToTypeId).exist
    expect(S.BetweenTypeId).exist
    expect(S.NonNaNTypeId).exist
    expect(S.PositiveTypeId).exist
    expect(S.NegativeTypeId).exist
    expect(S.NonNegativeTypeId).exist
    expect(S.NonPositiveTypeId).exist
    expect(S.InstanceOfTypeId).exist
    expect(S.MinItemsTypeId).exist
    expect(S.MaxItemsTypeId).exist
    expect(S.ItemsCountTypeId).exist
    expect(S.TrimmedTypeId).exist
    expect(S.PatternTypeId).exist
    expect(S.StartsWithTypeId).exist
    expect(S.EndsWithTypeId).exist
    expect(S.IncludesTypeId).exist
    expect(S.UUIDTypeId).exist

    expect(S.PropertySignatureId).exist
    expect(S.nullable).exist

    expect(S.parseResult).exist
    expect(S.decodeResult).exist
    expect(S.validateResult).exist
    expect(S.encodeResult).exist
    expect(S.parsePromise).exist
    expect(S.decodePromise).exist
    expect(S.validatePromise).exist
    expect(S.encodePromise).exist

    expect(S.partial).exist
    expect(S.required).exist

    expect(S.numberFromString).exist
    expect(S.dateFromString).exist
    expect(S.trim).exist
    expect(S.clamp).exist
    expect(S.clampBigint).exist
  })

  it("brand/ annotations", () => {
    // const Branded: S.Schema<number & Brand<"A"> & Brand<"B">>
    const Branded = pipe(
      S.string,
      S.numberFromString,
      S.int(),
      S.brand("A"),
      S.brand("B", {
        description: "a B brand"
      })
    )
    expect(Branded.ast.annotations).toEqual({
      [AST.TypeAnnotationId]: "@effect/schema/IntTypeId",
      [AST.BrandAnnotationId]: ["A", "B"],
      [AST.DescriptionAnnotationId]: "a B brand",
      [AST.JSONSchemaAnnotationId]: { type: "integer" }
    })
  })

  it("brand/symbol annotations", () => {
    const A = Symbol.for("A")
    const B = Symbol.for("B")
    const Branded = pipe(
      S.string,
      S.numberFromString,
      S.int(),
      S.brand(A),
      S.brand(B, {
        description: "a B brand"
      })
    )
    expect(Branded.ast.annotations).toEqual({
      [AST.TypeAnnotationId]: "@effect/schema/IntTypeId",
      [AST.BrandAnnotationId]: [A, B],
      [AST.DescriptionAnnotationId]: "a B brand",
      [AST.JSONSchemaAnnotationId]: { type: "integer" }
    })
  })

  it("brand/ ()", () => {
    const Int = pipe(S.string, S.numberFromString, S.int(), S.brand("Int"))
    expect(Int(1)).toEqual(1)
    expect(() => Int(1.2)).toThrowError(
      new Error(`error(s) found
└─ Expected integer, actual 1.2`)
    )
  })

  it("brand/ option", () => {
    const Int = pipe(S.string, S.numberFromString, S.int(), S.brand("Int"))
    expect(Int.option(1)).toEqual(O.some(1))
    expect(Int.option(1.2)).toEqual(O.none())
  })

  it("brand/ either", () => {
    const Int = pipe(S.string, S.numberFromString, S.int(), S.brand("Int"))
    expect(Int.either(1)).toEqual(E.right(1))
    expect(Int.either(1.2)).toEqual(E.left([{
      meta: 1.2,
      message: `error(s) found
└─ Expected integer, actual 1.2`
    }]))
  })

  it("brand/ refine", () => {
    const Int = pipe(S.string, S.numberFromString, S.int(), S.brand("Int"))
    expect(Int.refine(1)).toEqual(true)
    expect(Int.refine(1.2)).toEqual(false)
  })

  it("brand/ composition", () => {
    const int = <I, A extends number>(self: S.Schema<I, A>) => pipe(self, S.int(), S.brand("Int"))

    const positive = <I, A extends number>(self: S.Schema<I, A>) =>
      pipe(self, S.positive(), S.brand("Positive"))

    const PositiveInt = pipe(S.string, S.numberFromString, int, positive)

    expect(PositiveInt.refine(1)).toEqual(true)
    expect(PositiveInt.refine(-1)).toEqual(false)
    expect(PositiveInt.refine(1.2)).toEqual(false)
  })

  it("title", () => {
    expect(pipe(S.string, S.title("MyString")).ast.annotations).toEqual({
      [AST.TitleAnnotationId]: "MyString"
    })
  })

  it("description", () => {
    expect(pipe(S.string, S.description("description")).ast.annotations).toEqual({
      [AST.DescriptionAnnotationId]: "description",
      [AST.TitleAnnotationId]: "string"
    })
  })

  it("examples", () => {
    expect(pipe(S.string, S.examples(["example"])).ast.annotations).toEqual({
      [AST.ExamplesAnnotationId]: ["example"],
      [AST.TitleAnnotationId]: "string"
    })
  })

  it("documentation", () => {
    expect(pipe(S.string, S.documentation("documentation")).ast.annotations).toEqual({
      [AST.DocumentationAnnotationId]: "documentation",
      [AST.TitleAnnotationId]: "string"
    })
  })

  it("templateLiteral/ should throw on Unsupported template literal spans", () => {
    expect(() => S.templateLiteral(S.boolean)).toThrowError(
      new Error("Unsupported template literal span BooleanKeyword")
    )
  })

  it("templateLiteral/ a", () => {
    const schema = S.templateLiteral(S.literal("a"))
    expect(schema.ast).toEqual(AST.createLiteral("a"))
  })

  it("templateLiteral/ a b", () => {
    const schema = S.templateLiteral(S.literal("a"), S.literal(" "), S.literal("b"))
    expect(schema.ast).toEqual(
      AST.createLiteral("a b")
    )
  })

  it("templateLiteral/ (a | b) c", () => {
    const schema = S.templateLiteral(S.literal("a", "b"), S.literal("c"))
    expect(schema.ast).toEqual(
      AST.createUnion([AST.createLiteral("ac"), AST.createLiteral("bc")])
    )
  })

  it("templateLiteral/ (a | b) c (d | e)", () => {
    const schema = S.templateLiteral(S.literal("a", "b"), S.literal("c"), S.literal("d", "e"))
    expect(schema.ast).toEqual(
      AST.createUnion([
        AST.createLiteral("acd"),
        AST.createLiteral("ace"),
        AST.createLiteral("bcd"),
        AST.createLiteral("bce")
      ])
    )
  })

  it("templateLiteral/ (a | b) string (d | e)", () => {
    const schema = S.templateLiteral(S.literal("a", "b"), S.string, S.literal("d", "e"))
    expect(schema.ast).toEqual(
      AST.createUnion([
        AST.createTemplateLiteral("a", [{ type: AST.stringKeyword, literal: "d" }]),
        AST.createTemplateLiteral("a", [{ type: AST.stringKeyword, literal: "e" }]),
        AST.createTemplateLiteral("b", [{ type: AST.stringKeyword, literal: "d" }]),
        AST.createTemplateLiteral("b", [{ type: AST.stringKeyword, literal: "e" }])
      ])
    )
  })

  it("templateLiteral/ a${string}", () => {
    const schema = S.templateLiteral(S.literal("a"), S.string)
    expect(schema.ast).toEqual(
      AST.createTemplateLiteral("a", [{ type: AST.stringKeyword, literal: "" }])
    )
  })

  it("templateLiteral/ a${string}b", () => {
    const schema = S.templateLiteral(S.literal("a"), S.string, S.literal("b"))
    expect(schema.ast).toEqual(
      AST.createTemplateLiteral("a", [{ type: AST.stringKeyword, literal: "b" }])
    )
  })

  describe.concurrent("literal", () => {
    it("should return never with no literals", () => {
      expect(S.literal().ast).toEqual(AST.neverKeyword)
    })

    it("should return an unwrapped AST with exactly one literal", () => {
      expect(S.literal(1).ast).toEqual(AST.createLiteral(1))
    })

    it("should return a union with more than one literal", () => {
      expect(S.literal(1, 2).ast).toEqual(
        AST.createUnion([AST.createLiteral(1), AST.createLiteral(2)])
      )
    })
  })

  it("enums", () => {
    enum Fruits {
      Apple,
      Banana
    }
    const schema = S.enums(Fruits)
    const is = P.is(schema)
    expect(is(Fruits.Apple)).toEqual(true)
    expect(is(Fruits.Banana)).toEqual(true)
    expect(is(0)).toEqual(true)
    expect(is(1)).toEqual(true)
    expect(is(3)).toEqual(false)
  })

  describe.concurrent("experimental", () => {
    it("rename", () => {
      const rename = <A, From extends keyof A, To extends PropertyKey>(
        from: From,
        to: To
      ) =>
        (schema: S.Schema<A>): S.Schema<Omit<A, From> & { [K in To]: A[From] }> => {
          if (AST.isTypeLiteral(schema.ast)) {
            const propertySignatures = schema.ast.propertySignatures.slice()
            const i = propertySignatures.findIndex((ps) => ps.name === from)
            propertySignatures[i] = AST.createPropertySignature(
              to,
              propertySignatures[i].type,
              propertySignatures[i].isOptional,
              propertySignatures[i].isReadonly
            )
            return S.make(
              AST.createTypeLiteral(propertySignatures, schema.ast.indexSignatures)
            )
          }
          throw new Error("cannot rename")
        }

      const schema = pipe(
        S.struct({
          a: S.string,
          b: S.number
        }),
        rename("a", "aa")
      )
      const is = P.is(schema)
      expect(is({ a: "foo", b: 1 })).toEqual(false)
      expect(is({ aa: "foo", b: 1 })).toEqual(true)
    })

    it("crazy struct", () => {
      type OptionalKeys<A> = {
        [K in keyof A]: K extends `${string}?` ? K : never
      }[keyof A]

      type RequiredKeys<A> = {
        [K in keyof A]: K extends `${string}?` ? never : K
      }[keyof A]

      const struct = <Fields extends Record<PropertyKey, S.Schema<any>>>(
        fields: Fields
      ): S.Schema<
        S.Spread<
          & { readonly [K in RequiredKeys<Fields>]: S.To<Fields[K]> }
          & {
            readonly [K in OptionalKeys<Fields> as K extends `${infer S}?` ? S : K]+?: S.To<
              Fields[K]
            >
          }
        >
      > =>
        S.make(
          AST.createTypeLiteral(
            Object.keys(fields).map((key) => {
              const isOptional = key.endsWith("?")
              return AST.createPropertySignature(
                isOptional ? key.substring(0, key.length - 1) : key,
                fields[key].ast,
                isOptional,
                true
              )
            }),
            []
          )
        )

      /*
      const schema: S.Schema<{
        readonly a: string;
        readonly b: number;
        readonly c?: boolean;
      }>
      */
      const schema = struct({
        a: S.string,
        b: S.number,
        "c?": S.boolean
      })

      const is = P.is(schema)
      expect(is({ a: "a", b: 1 })).toBe(true)
      expect(is({ a: "a", b: 1, c: true })).toBe(true)

      expect(is({ a: "a" })).toBe(false)
      expect(is({ a: "a", b: 1, c: 1 })).toBe(false)
    })
  })

  it("filter/ annotation options", () => {
    const schema = pipe(
      S.string,
      S.filter((s): s is string => s.length === 1, {
        typeId: "Char",
        description: "description",
        documentation: "documentation",
        examples: ["examples"],
        identifier: "identifier",
        jsonSchema: { minLength: 1, maxLength: 1 },
        title: "title"
      })
    )
    expect(schema.ast.annotations).toEqual({
      [AST.TypeAnnotationId]: "Char",
      [AST.DescriptionAnnotationId]: "description",
      [AST.DocumentationAnnotationId]: "documentation",
      [AST.ExamplesAnnotationId]: [
        "examples"
      ],
      [AST.IdentifierAnnotationId]: "identifier",
      [AST.JSONSchemaAnnotationId]: {
        "maxLength": 1,
        "minLength": 1
      },
      [AST.TitleAnnotationId]: "title"
    })
  })

  it("rest/ should throw on unsupported schemas", () => {
    const schema = pipe(S.tuple(), S.filter(() => true))
    expect(() => pipe(schema, S.rest(S.number))).toThrowError(
      new Error("`rest` is not supported on this schema")
    )
  })

  it("element/ should throw on unsupported schemas", () => {
    const schema = pipe(S.tuple(), S.filter(() => true))
    expect(() => pipe(schema, S.element(S.number))).toThrowError(
      new Error("`element` is not supported on this schema")
    )
  })

  it("optionalElement/ should throw on unsupported schemas", () => {
    const schema = pipe(S.tuple(), S.filter(() => true))
    expect(() => pipe(schema, S.optionalElement(S.number))).toThrowError(
      new Error("`optionalElement` is not supported on this schema")
    )
  })
})
