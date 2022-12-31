import { pipe } from "@fp-ts/data/Function"
import * as AST from "@fp-ts/schema/AST"
import * as G from "@fp-ts/schema/Guard"
import * as S from "@fp-ts/schema/Schema"

describe.concurrent("Schema", () => {
  it("templateLiteral. a", () => {
    const schema = S.templateLiteral(S.literal("a"))
    expect(schema.ast).toEqual(AST.literalType("a"))
  })

  it("templateLiteral. a b", () => {
    const schema = S.templateLiteral(S.literal("a"), S.literal(" "), S.literal("b"))
    expect(schema.ast).toEqual(
      AST.literalType("a b")
    )
  })

  it("templateLiteral. (a | b) c", () => {
    const schema = S.templateLiteral(S.literal("a", "b"), S.literal("c"))
    expect(schema.ast).toEqual(
      AST.union([AST.literalType("ac"), AST.literalType("bc")])
    )
  })

  it("templateLiteral. (a | b) c (d | e)", () => {
    const schema = S.templateLiteral(S.literal("a", "b"), S.literal("c"), S.literal("d", "e"))
    expect(schema.ast).toEqual(
      AST.union([
        AST.literalType("acd"),
        AST.literalType("ace"),
        AST.literalType("bcd"),
        AST.literalType("bce")
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
      expect(S.literal(1).ast).toEqual(AST.literalType(1))
    })

    it("should return a union with more than one literal", () => {
      expect(S.literal(1, 2).ast).toEqual(
        AST.union([AST.literalType(1), AST.literalType(2)])
      )
    })
  })

  it("enums", () => {
    enum Fruits {
      Apple,
      Banana
    }
    const schema = S.enums(Fruits)
    const guard = G.guardFor(schema)
    expect(guard.is(Fruits.Apple)).toEqual(true)
    expect(guard.is(Fruits.Banana)).toEqual(true)
    expect(guard.is(0)).toEqual(true)
    expect(guard.is(1)).toEqual(true)
    expect(guard.is(3)).toEqual(false)
  })

  describe.concurrent("keyof", () => {
    describe.concurrent("struct", () => {
      it("string keys", () => {
        const schema = S.struct({
          a: S.string,
          b: S.number
        })
        const keyOf = S.keyof(schema)
        const guard = G.guardFor(keyOf)
        expect(guard.is("a")).toEqual(true)
        expect(guard.is("b")).toEqual(true)
        expect(guard.is("c")).toEqual(false)
      })

      it("symbol keys", () => {
        const a = Symbol.for("@fp-ts/schema/test/a")
        const b = Symbol.for("@fp-ts/schema/test/b")
        const schema = S.struct({
          [a]: S.string,
          [b]: S.number
        })
        const keyOf = S.keyof(schema)
        const guard = G.guardFor(keyOf)
        expect(guard.is(a)).toEqual(true)
        expect(guard.is(b)).toEqual(true)
        expect(guard.is("a")).toEqual(false)
        expect(guard.is("b")).toEqual(false)
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
      const guard = G.guardFor(keyOf)
      expect(guard.is("a")).toEqual(true)
      expect(guard.is("b")).toEqual(false)
      expect(guard.is("c")).toEqual(false)
    })
  })

  describe.concurrent("experimental", () => {
    it("rename", () => {
      const rename = <A, From extends keyof A, To extends PropertyKey>(
        from: From,
        to: To
      ) =>
        (schema: S.Schema<A>): S.Schema<Omit<A, From> & { [K in To]: A[From] }> => {
          if (AST.isStruct(schema.ast)) {
            const fields = schema.ast.fields.slice()
            const i = fields.findIndex((field) => field.key === from)
            fields[i] = AST.field(
              to,
              fields[i].value,
              fields[i].isOptional,
              fields[i].isReadonly
            )
            return S.make(
              AST.struct(fields, schema.ast.indexSignatures)
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
      const guard = G.guardFor(schema)
      expect(guard.is({ a: "foo", b: 1 })).toEqual(false)
      expect(guard.is({ aa: "foo", b: 1 })).toEqual(true)
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
          AST.struct(
            Object.keys(fields).map((key) => {
              const isOptional = key.endsWith("?")
              return AST.field(
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

      const guard = G.guardFor(schema)
      expect(guard.is({ a: "a", b: 1 })).toBe(true)
      expect(guard.is({ a: "a", b: 1, c: true })).toBe(true)

      expect(guard.is({ a: "a" })).toBe(false)
      expect(guard.is({ a: "a", b: 1, c: 1 })).toBe(false)
    })
  })
})
