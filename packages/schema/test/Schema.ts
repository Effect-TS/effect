import * as E from "@effect/data/Either"
import * as O from "@effect/data/Option"
import * as AST from "@effect/schema/AST"
import * as P from "@effect/schema/Parser"
import * as S from "@effect/schema/Schema"

describe.concurrent("Schema", () => {
  it("exports", () => {
    expect(S.parse).exist
    expect(S.parseSync).exist
    expect(S.parseOption).exist
    expect(S.parseEither).exist
    expect(S.parseResult).exist

    expect(S.decode).exist
    expect(S.decodeSync).exist
    expect(S.decodeOption).exist
    expect(S.decodeEither).exist
    expect(S.decodeResult).exist

    expect(S.encode).exist
    expect(S.encodeSync).exist
    expect(S.encodeOption).exist
    expect(S.encodeEither).exist
    expect(S.encodeResult).exist

    expect(S.validate).exist
    expect(S.validateSync).exist
    expect(S.validateOption).exist
    expect(S.validateEither).exist
    expect(S.validateResult).exist

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
    expect(S.ULIDTypeId).exist

    expect(S.nullable).exist

    expect(S.partial).exist
    expect(S.required).exist

    expect(S.numberFromString).exist
    expect(S.dateFromString).exist
    expect(S.trim).exist
    expect(S.clamp).exist
    expect(S.clampBigint).exist
  })

  it("struct should allow a \"constructor\" field name", () => {
    const schema = S.struct({ constructor: S.string })
    expect(schema.ast._tag).toEqual("TypeLiteral")
  })

  it("brand/ annotations", () => {
    // const Branded: S.Schema<number & Brand<"A"> & Brand<"B">>
    const Branded = S.string.pipe(
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
    const Branded = S.string.pipe(
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
    const Int = S.string.pipe(S.numberFromString, S.int(), S.brand("Int"))
    expect(Int(1)).toEqual(1)
    expect(() => Int(1.2)).toThrowError(
      new Error(`error(s) found
└─ Expected integer, actual 1.2`)
    )
  })

  it("brand/ option", () => {
    const Int = S.string.pipe(S.numberFromString, S.int(), S.brand("Int"))
    expect(Int.option(1)).toEqual(O.some(1))
    expect(Int.option(1.2)).toEqual(O.none())
  })

  it("brand/ either", () => {
    const Int = S.string.pipe(S.numberFromString, S.int(), S.brand("Int"))
    expect(Int.either(1)).toEqual(E.right(1))
    expect(Int.either(1.2)).toEqual(E.left([{
      meta: 1.2,
      message: `error(s) found
└─ Expected integer, actual 1.2`
    }]))
  })

  it("brand/ refine", () => {
    const Int = S.string.pipe(S.numberFromString, S.int(), S.brand("Int"))
    expect(Int.refine(1)).toEqual(true)
    expect(Int.refine(1.2)).toEqual(false)
  })

  it("brand/ composition", () => {
    const int = <I, A extends number>(self: S.Schema<I, A>) => self.pipe(S.int(), S.brand("Int"))

    const positive = <I, A extends number>(self: S.Schema<I, A>) =>
      self.pipe(S.positive(), S.brand("Positive"))

    const PositiveInt = S.string.pipe(S.numberFromString, int, positive)

    expect(PositiveInt.refine(1)).toEqual(true)
    expect(PositiveInt.refine(-1)).toEqual(false)
    expect(PositiveInt.refine(1.2)).toEqual(false)
  })

  it("title", () => {
    expect(S.string.pipe(S.title("MyString")).ast.annotations).toEqual({
      [AST.TitleAnnotationId]: "MyString"
    })
  })

  it("description", () => {
    expect(S.string.pipe(S.description("description")).ast.annotations).toEqual({
      [AST.DescriptionAnnotationId]: "description",
      [AST.TitleAnnotationId]: "string"
    })
  })

  it("examples", () => {
    expect(S.string.pipe(S.examples(["example"])).ast.annotations).toEqual({
      [AST.ExamplesAnnotationId]: ["example"],
      [AST.TitleAnnotationId]: "string"
    })
  })

  it("documentation", () => {
    expect(S.string.pipe(S.documentation("documentation")).ast.annotations).toEqual({
      [AST.DocumentationAnnotationId]: "documentation",
      [AST.TitleAnnotationId]: "string"
    })
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

      const schema = S.struct({
        a: S.string,
        b: S.number
      }).pipe(
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
    const schema = S.string.pipe(
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
    const schema = S.tuple().pipe(S.filter(() => true))
    expect(() => schema.pipe(S.rest(S.number))).toThrowError(
      new Error("`rest` is not supported on this schema")
    )
  })

  it("element/ should throw on unsupported schemas", () => {
    const schema = S.tuple().pipe(S.filter(() => true))
    expect(() => schema.pipe(S.element(S.number))).toThrowError(
      new Error("`element` is not supported on this schema")
    )
  })

  it("optionalElement/ should throw on unsupported schemas", () => {
    const schema = S.tuple().pipe(S.filter(() => true))
    expect(() => schema.pipe(S.optionalElement(S.number))).toThrowError(
      new Error("`optionalElement` is not supported on this schema")
    )
  })

  it("isSchema", () => {
    expect(S.isSchema(S.string)).toBe(true)
    expect(S.isSchema(S.struct({ f: S.optional(S.string).toOption() }))).toBe(true)
    expect(S.isSchema(S.string.pipe(S.brand("my-brand")))).toBe(true)
  })
})
