import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { deepStrictEqual } from "effect/test/util"
import { describe, it } from "vitest"

describe("pick", () => {
  it("Struct", async () => {
    const a = Symbol.for("effect/Schema/test/a")
    const schema = S.Struct({ [a]: S.String, b: S.NumberFromString, c: S.Boolean }).pipe(
      S.pick(a, "b")
    )
    await Util.assertions.decoding.succeed(schema, { [a]: "a", b: "1" }, { [a]: "a", b: 1 })

    await Util.assertions.decoding.fail(
      schema,
      null,
      "Expected { readonly b: NumberFromString; readonly Symbol(effect/Schema/test/a): string }, actual null"
    )
    await Util.assertions.decoding.fail(
      schema,
      { [a]: "a" },
      `{ readonly b: NumberFromString; readonly Symbol(effect/Schema/test/a): string }
└─ ["b"]
   └─ is missing`
    )
    await Util.assertions.decoding.fail(
      schema,
      { b: "1" },
      `{ readonly b: NumberFromString; readonly Symbol(effect/Schema/test/a): string }
└─ [Symbol(effect/Schema/test/a)]
   └─ is missing`
    )
  })

  it("Struct with exact optionals", async () => {
    const schema = S.Struct({
      a: S.optionalWith(S.String, { exact: true }),
      b: S.NumberFromString,
      c: S.Boolean
    }).pipe(S.pick("a", "b"))
    await Util.assertions.decoding.succeed(schema, { a: "a", b: "1" }, { a: "a", b: 1 })
    await Util.assertions.decoding.succeed(schema, { b: "1" }, { b: 1 })

    await Util.assertions.decoding.fail(
      schema,
      null,
      "Expected { readonly a?: string; readonly b: NumberFromString }, actual null"
    )
    await Util.assertions.decoding.fail(
      schema,
      { a: "a" },
      `{ readonly a?: string; readonly b: NumberFromString }
└─ ["b"]
   └─ is missing`
    )
  })

  it("Suspend", async () => {
    interface A {
      readonly a: string
      readonly as: ReadonlyArray<A>
    }
    const A: S.Schema<A> = S.suspend( // intended outer suspend
      () =>
        S.Struct({
          a: S.String,
          as: S.Array(A)
        })
    )
    const schema = A.pipe(S.pick("as"))
    await Util.assertions.decoding.succeed(schema, { as: [] })
    await Util.assertions.decoding.succeed(schema, { as: [{ a: "a", as: [] }] })

    await Util.assertions.decoding.fail(
      schema,
      { as: [{ as: [] }] },
      `{ readonly as: ReadonlyArray<<suspended schema>> }
└─ ["as"]
   └─ ReadonlyArray<<suspended schema>>
      └─ [0]
         └─ { readonly a: string; readonly as: ReadonlyArray<<suspended schema>> }
            └─ ["a"]
               └─ is missing`
    )
  })

  it("Struct with property signature transformations", async () => {
    const schema = S.Struct({
      a: S.optionalWith(S.String, { exact: true, default: () => "" }),
      b: S.NumberFromString,
      c: S.Boolean
    }).pipe(S.pick("a", "b"))
    await Util.assertions.decoding.succeed(schema, { a: "a", b: "1" }, { a: "a", b: 1 })
    await Util.assertions.decoding.succeed(schema, { b: "1" }, { a: "", b: 1 })
  })

  it("Record(string, number)", async () => {
    const schema = S.Record({ key: S.String, value: S.Number }).pipe(S.pick("a", "b"))
    await Util.assertions.decoding.succeed(schema, { a: 1, b: 2 })
    await Util.assertions.decoding.fail(
      schema,
      { a: "a", b: 2 },
      `{ readonly a: number; readonly b: number }
└─ ["a"]
   └─ Expected number, actual "a"`
    )
    await Util.assertions.decoding.fail(
      schema,
      { a: 1, b: "b" },
      `{ readonly a: number; readonly b: number }
└─ ["b"]
   └─ Expected number, actual "b"`
    )
  })

  it("Record(symbol, number)", async () => {
    const a = Symbol.for("effect/Schema/test/a")
    const b = Symbol.for("effect/Schema/test/b")
    const schema = S.Record({ key: S.SymbolFromSelf, value: S.Number }).pipe(S.pick(a, b))
    await Util.assertions.decoding.succeed(schema, { [a]: 1, [b]: 2 })
    await Util.assertions.decoding.fail(
      schema,
      { [a]: "a", [b]: 2 },
      `{ readonly Symbol(effect/Schema/test/a): number; readonly Symbol(effect/Schema/test/b): number }
└─ [Symbol(effect/Schema/test/a)]
   └─ Expected number, actual "a"`
    )
    await Util.assertions.decoding.fail(
      schema,
      { [a]: 1, [b]: "b" },
      `{ readonly Symbol(effect/Schema/test/a): number; readonly Symbol(effect/Schema/test/b): number }
└─ [Symbol(effect/Schema/test/b)]
   └─ Expected number, actual "b"`
    )
  })

  it("Record(string, string) & Record(`a${string}`, number)", async () => {
    const schema = S.Struct(
      {},
      S.Record({ key: S.String, value: S.String }),
      S.Record({ key: S.TemplateLiteral(S.Literal("a"), S.String), value: S.Number })
    ).pipe(S.pick("a", "b"))
    await Util.assertions.decoding.succeed(schema, { a: 1, b: "b" })
  })

  it("typeSchema(Class)", () => {
    class A extends S.Class<A>("A")({ a: S.String, b: S.NumberFromString }) {}
    const schema = A.pipe(S.typeSchema, S.pick("b"))
    deepStrictEqual(schema.ast, S.Struct({ b: S.Number }).ast)
  })

  it("Class", () => {
    class A extends S.Class<A>("A")({ a: S.String, b: S.NumberFromString }) {}
    const schema = A.pipe(S.pick("b"))
    deepStrictEqual(schema.ast, S.Struct({ b: S.NumberFromString }).ast)
  })
})
