import { pipe } from "@fp-ts/data/Function"
import * as ast from "@fp-ts/schema/AST"
import * as G from "@fp-ts/schema/Guard"
import { empty } from "@fp-ts/schema/Provider"
import * as S from "@fp-ts/schema/Schema"

const unsafeGuardFor = G.provideUnsafeGuardFor(empty)

describe("Schema", () => {
  it("make", () => {
    expect(S.make).exist
  })

  it("nativeEnum", () => {
    enum Fruits {
      Apple,
      Banana
    }
    const schema = S.nativeEnum(Fruits)
    const guard = unsafeGuardFor(schema)
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
          return S.make(ast.struct(fields, schema.ast.indexSignature))
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
    const guard = unsafeGuardFor(schema)
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
      const guard = unsafeGuardFor(keyOf)
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
      const guard = unsafeGuardFor(keyOf)
      expect(guard.is("a")).toEqual(true)
      expect(guard.is("b")).toEqual(false)
      expect(guard.is("c")).toEqual(false)
    })
  })
})
