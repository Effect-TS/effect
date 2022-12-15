import { pipe } from "@fp-ts/data/Function"
import * as ast from "@fp-ts/schema/AST"
import * as G from "@fp-ts/schema/Guard"
import { empty } from "@fp-ts/schema/Provider"
import * as _ from "@fp-ts/schema/Schema"

const guardFor = G.provideGuardFor(empty)

describe("Schema", () => {
  it("exist", () => {
    expect(_.make).exist
    expect(_.filter).exist
    expect(_.filterWith).exist
    expect(_.refine).exist
    expect(_.string).exist
    expect(_.number).exist
    expect(_.boolean).exist
    expect(_.bigint).exist
    expect(_.unknown).exist
    expect(_.any).exist
    expect(_.never).exist
    expect(_.json).exist
  })

  it("nativeEnum", () => {
    enum Fruits {
      Apple,
      Banana
    }
    const schema = _.nativeEnum(Fruits)
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
      (schema: _.Schema<A>): _.Schema<Omit<A, From> & { [K in To]: A[From] }> => {
        if (ast.isStruct(schema.ast)) {
          const fields = schema.ast.fields.slice()
          const i = fields.findIndex((field) => field.key === from)
          fields[i] = ast.field(to, fields[i].value, fields[i].isReadonly)
          return _.make(
            ast.struct(fields, schema.ast.indexSignatures)
          )
        }
        throw new Error("cannot rename")
      }

    const schema = pipe(
      _.struct({
        a: _.string,
        b: _.number
      }),
      rename("a", "aa")
    )
    const guard = guardFor(schema)
    expect(guard.is({ a: "foo", b: 1 })).toEqual(false)
    expect(guard.is({ aa: "foo", b: 1 })).toEqual(true)
  })

  describe("keyof", () => {
    it("struct", () => {
      const schema = _.struct({
        a: _.string,
        b: _.number
      })
      const keyOf = _.keyof(schema)
      const guard = guardFor(keyOf)
      expect(guard.is("a")).toEqual(true)
      expect(guard.is("b")).toEqual(true)
      expect(guard.is("c")).toEqual(false)
    })

    it("union", () => {
      const schema = _.union(
        _.struct({
          a: _.string,
          b: _.number
        }),
        _.struct({
          a: _.boolean,
          c: _.number
        })
      )
      const keyOf = _.keyof(schema)
      const guard = guardFor(keyOf)
      expect(guard.is("a")).toEqual(true)
      expect(guard.is("b")).toEqual(false)
      expect(guard.is("c")).toEqual(false)
    })
  })
})
