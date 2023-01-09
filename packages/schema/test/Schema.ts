import { pipe } from "@fp-ts/data/Function"
import * as AST from "@fp-ts/schema/AST"
import * as D from "@fp-ts/schema/Decoder"
import * as S from "@fp-ts/schema/Schema"

describe.concurrent("Schema", () => {
  it("templateLiteral. a", () => {
    const schema = S.templateLiteral(S.literal("a"))
    expect(schema.ast).toEqual(AST.literal("a"))
  })

  it("templateLiteral. a b", () => {
    const schema = S.templateLiteral(S.literal("a"), S.literal(" "), S.literal("b"))
    expect(schema.ast).toEqual(
      AST.literal("a b")
    )
  })

  it("templateLiteral. (a | b) c", () => {
    const schema = S.templateLiteral(S.literal("a", "b"), S.literal("c"))
    expect(schema.ast).toEqual(
      AST.union([AST.literal("ac"), AST.literal("bc")])
    )
  })

  it("templateLiteral. (a | b) c (d | e)", () => {
    const schema = S.templateLiteral(S.literal("a", "b"), S.literal("c"), S.literal("d", "e"))
    expect(schema.ast).toEqual(
      AST.union([
        AST.literal("acd"),
        AST.literal("ace"),
        AST.literal("bcd"),
        AST.literal("bce")
      ])
    )
  })

  it("templateLiteral. (a | b) string (d | e)", () => {
    const schema = S.templateLiteral(S.literal("a", "b"), S.string, S.literal("d", "e"))
    expect(schema.ast).toEqual(
      AST.union([
        AST.templateLiteral("a", [{ type: AST.stringKeyword, literal: "d" }]),
        AST.templateLiteral("a", [{ type: AST.stringKeyword, literal: "e" }]),
        AST.templateLiteral("b", [{ type: AST.stringKeyword, literal: "d" }]),
        AST.templateLiteral("b", [{ type: AST.stringKeyword, literal: "e" }])
      ])
    )
  })

  it("templateLiteral. a${string}", () => {
    const schema = S.templateLiteral(S.literal("a"), S.string)
    expect(schema.ast).toEqual(
      AST.templateLiteral("a", [{ type: AST.stringKeyword, literal: "" }])
    )
  })

  it("templateLiteral. a${string}b", () => {
    const schema = S.templateLiteral(S.literal("a"), S.string, S.literal("b"))
    expect(schema.ast).toEqual(
      AST.templateLiteral("a", [{ type: AST.stringKeyword, literal: "b" }])
    )
  })

  it("optional. should flatten optional calls", () => {
    const schema = S.optional(S.optional(S.string))
    expect(schema).toEqual(S.optional(S.string))
  })

  describe.concurrent("literal", () => {
    it("should return never with no literals", () => {
      expect(S.literal().ast).toEqual(AST.neverKeyword)
    })

    it("should return an unwrapped AST with exactly one literal", () => {
      expect(S.literal(1).ast).toEqual(AST.literal(1))
    })

    it("should return a union with more than one literal", () => {
      expect(S.literal(1, 2).ast).toEqual(
        AST.union([AST.literal(1), AST.literal(2)])
      )
    })
  })

  it("enums", () => {
    enum Fruits {
      Apple,
      Banana
    }
    const schema = S.enums(Fruits)
    const is = D.is(schema)
    expect(is(Fruits.Apple)).toEqual(true)
    expect(is(Fruits.Banana)).toEqual(true)
    expect(is(0)).toEqual(true)
    expect(is(1)).toEqual(true)
    expect(is(3)).toEqual(false)
  })

  describe.concurrent("keyof", () => {
    describe.concurrent("struct", () => {
      it("string keys", () => {
        const schema = S.struct({
          a: S.string,
          b: S.number
        })
        const keyOf = S.keyof(schema)
        const is = D.is(keyOf)
        expect(is("a")).toEqual(true)
        expect(is("b")).toEqual(true)
        expect(is("c")).toEqual(false)
      })

      it("symbol keys", () => {
        const a = Symbol.for("@fp-ts/schema/test/a")
        const b = Symbol.for("@fp-ts/schema/test/b")
        const schema = S.struct({
          [a]: S.string,
          [b]: S.number
        })
        const keyOf = S.keyof(schema)
        const is = D.is(keyOf)
        expect(is(a)).toEqual(true)
        expect(is(b)).toEqual(true)
        expect(is("a")).toEqual(false)
        expect(is("b")).toEqual(false)
      })
    })

    it("union", () => {
      const schema = S.union(
        S.struct({
          a: S.string,
          b: S.number
        }),
        S.struct({
          a: S.boolean,
          c: S.number
        })
      )
      const keyOf = S.keyof(schema)
      const is = D.is(keyOf)
      expect(is("a")).toEqual(true)
      expect(is("b")).toEqual(false)
      expect(is("c")).toEqual(false)
    })
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
            propertySignatures[i] = AST.propertySignature(
              to,
              propertySignatures[i].type,
              propertySignatures[i].isOptional,
              propertySignatures[i].isReadonly
            )
            return S.make(
              AST.typeLiteral(propertySignatures, schema.ast.indexSignatures)
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
      const is = D.is(schema)
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
          & { readonly [K in RequiredKeys<Fields>]: S.Infer<Fields[K]> }
          & {
            readonly [K in OptionalKeys<Fields> as K extends `${infer S}?` ? S : K]+?: S.Infer<
              Fields[K]
            >
          }
        >
      > =>
        S.make(
          AST.typeLiteral(
            Object.keys(fields).map((key) => {
              const isOptional = key.endsWith("?")
              return AST.propertySignature(
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

      const is = D.is(schema)
      expect(is({ a: "a", b: 1 })).toBe(true)
      expect(is({ a: "a", b: 1, c: true })).toBe(true)

      expect(is({ a: "a" })).toBe(false)
      expect(is({ a: "a", b: 1, c: 1 })).toBe(false)
    })
  })
})
