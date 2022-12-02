import { pipe } from "@fp-ts/data/Function"
import * as A from "@fp-ts/schema/Arbitrary"
import * as ast from "@fp-ts/schema/AST"
import * as D from "@fp-ts/schema/Decoder"
import * as G from "@fp-ts/schema/Guard"
import * as JD from "@fp-ts/schema/JsonDecoder"
import { empty } from "@fp-ts/schema/Provider"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"
import * as fc from "fast-check"

const guardFor = G.provideGuardFor(empty)

describe("Schema", () => {
  it("make", () => {
    expect(S.make).exist
  })

  describe("refine", () => {
    it("primitive", () => {
      type Int = number & { __brand: "Int" }
      const isInt = (n: number): n is Int => Number.isInteger(n)
      const IntSym = Symbol.for("@fp-ts/schema/test/Int")

      const schema = pipe(S.number, S.refine(IntSym, isInt))

      const guard = G.guardFor(schema)
      expect(guard.is(1)).toEqual(true)
      expect(guard.is(null)).toEqual(false)
      expect(guard.is(1.2)).toEqual(false)
      const decoder = JD.jsonDecoderFor(schema)
      expect(decoder.decode(1)).toEqual(D.success(1))
      Util.expectFailure(decoder, 1.2, "1.2 did not satisfy is(@fp-ts/schema/test/Int)")
      const arbitrary = A.arbitraryFor(schema)
      expect(fc.sample(arbitrary.arbitrary(fc), 10).every(guard.is)).toEqual(true)
    })

    it("struct", () => {
      const struct = S.struct({
        a: S.number,
        b: S.number
      })
      type S = S.Infer<typeof struct>
      type BrandedStruct = S & { __brand: "BrandedStruct" }
      const isBrandedStruct = (s: S): s is BrandedStruct => s.a === s.b
      const BrandedStructSym = Symbol.for("@fp-ts/schema/test/BrandedStruct")

      const schema = pipe(struct, S.refine(BrandedStructSym, isBrandedStruct))

      const guard = G.guardFor(schema)
      expect(guard.is({ a: 1, b: 1 })).toEqual(true)
      expect(guard.is(null)).toEqual(false)
      expect(guard.is({})).toEqual(false)
      expect(guard.is({ a: 1 })).toEqual(false)
      expect(guard.is({ a: 1, b: 2 })).toEqual(false)
      const decoder = JD.jsonDecoderFor(schema)
      expect(decoder.decode({ a: 1, b: 1 })).toEqual(D.success({ a: 1, b: 1 }))
      Util.expectFailure(
        decoder,
        { a: 1, b: 2 },
        "{\"a\":1,\"b\":2} did not satisfy is(@fp-ts/schema/test/BrandedStruct)"
      )
      const arbitrary = A.arbitraryFor(schema)
      expect(fc.sample(arbitrary.arbitrary(fc), 10).every(guard.is)).toEqual(true)
    })
  })

  it("nativeEnum", () => {
    enum Fruits {
      Apple,
      Banana
    }
    const schema = S.nativeEnum(Fruits)
    const guard = guardFor(schema)
    expect(guard.is(Fruits.Apple)).toEqual(true)
    expect(guard.is(Fruits.Banana)).toEqual(true)
    expect(guard.is(0)).toEqual(true)
    expect(guard.is(1)).toEqual(true)
    expect(guard.is(3)).toEqual(false)
  })

  it("rename", () => {
    const rename = <A, From extends keyof A, To extends PropertyKey>(
      from: From,
      to: To
    ) =>
      (schema: S.Schema<A>): S.Schema<Omit<A, From> & { [K in To]: A[From] }> => {
        if (ast.isStruct(schema.ast)) {
          const fields = schema.ast.fields.slice()
          const i = fields.findIndex((field) => field.key === from)
          fields[i] = ast.field(to, fields[i].value, fields[i].optional, fields[i].readonly)
          return S.make(ast.struct(fields, schema.ast.stringIndexSignature))
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
    const guard = guardFor(schema)
    expect(guard.is({ a: "foo", b: 1 })).toEqual(false)
    expect(guard.is({ aa: "foo", b: 1 })).toEqual(true)
  })

  describe("keyof", () => {
    it("struct", () => {
      const schema = S.struct({
        a: S.string,
        b: S.number
      })
      const keyOf = S.keyof(schema)
      const guard = guardFor(keyOf)
      expect(guard.is("a")).toEqual(true)
      expect(guard.is("b")).toEqual(true)
      expect(guard.is("c")).toEqual(false)
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
      const guard = guardFor(keyOf)
      expect(guard.is("a")).toEqual(true)
      expect(guard.is("b")).toEqual(false)
      expect(guard.is("c")).toEqual(false)
    })
  })
})
