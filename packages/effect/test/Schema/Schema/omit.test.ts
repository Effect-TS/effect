import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("omit", () => {
  it("Struct", async () => {
    const a = Symbol.for("effect/Schema/test/a")
    const schema = S.Struct({ [a]: S.String, b: S.NumberFromString, c: S.Boolean }).pipe(
      S.omit("c")
    )
    await Util.expectDecodeUnknownSuccess(schema, { [a]: "a", b: "1" }, { [a]: "a", b: 1 })

    await Util.expectDecodeUnknownFailure(
      schema,
      null,
      "Expected { readonly b: NumberFromString; readonly Symbol(effect/Schema/test/a): string }, actual null"
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      { [a]: "a" },
      `{ readonly b: NumberFromString; readonly Symbol(effect/Schema/test/a): string }
└─ ["b"]
   └─ is missing`
    )
    await Util.expectDecodeUnknownFailure(
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
    })
      .pipe(
        S.omit("c")
      )
    await Util.expectDecodeUnknownSuccess(schema, { a: "a", b: "1" }, { a: "a", b: 1 })
    await Util.expectDecodeUnknownSuccess(schema, { b: "1" }, { b: 1 })

    await Util.expectDecodeUnknownFailure(
      schema,
      null,
      "Expected { readonly a?: string; readonly b: NumberFromString }, actual null"
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      { a: "a" },
      `{ readonly a?: string; readonly b: NumberFromString }
└─ ["b"]
   └─ is missing`
    )
  })

  it("suspend", async () => {
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
    const schema = A.pipe(S.omit("a"))
    await Util.expectDecodeUnknownSuccess(schema, { as: [] })
    await Util.expectDecodeUnknownSuccess(schema, { as: [{ a: "a", as: [] }] })

    await Util.expectDecodeUnknownFailure(
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

  it("struct with property signature transformations", async () => {
    const schema = S.Struct({
      a: S.optionalWith(S.String, { exact: true, default: () => "" }),
      b: S.NumberFromString,
      c: S.Boolean
    }).pipe(
      S.omit("c")
    )
    await Util.expectDecodeUnknownSuccess(schema, { a: "a", b: "1" }, { a: "a", b: 1 })
    await Util.expectDecodeUnknownSuccess(schema, { b: "1" }, { a: "", b: 1 })
  })

  it("typeSchema(Class)", () => {
    class A extends S.Class<A>("A")({ a: S.String, b: S.NumberFromString }) {}
    const schema = A.pipe(S.typeSchema, S.omit("a"))
    expect(schema.ast).toStrictEqual(S.Struct({ b: S.Number }).ast)
  })

  it("Class", () => {
    class A extends S.Class<A>("A")({ a: S.String, b: S.NumberFromString }) {}
    const schema = A.pipe(S.omit("a"))
    expect(schema.ast).toStrictEqual(S.Struct({ b: S.NumberFromString }).ast)
  })

  it("struct with key rename", async () => {
    const schema = S.Struct({
      a: S.String,
      b: S.propertySignature(S.Number).pipe(S.fromKey("c"))
    }).pipe(S.omit("a"))
    await Util.expectDecodeUnknownSuccess(schema, { c: 1 }, { b: 1 })
  })

  it("rename", async () => {
    const schema = S.Struct({
      a: S.String,
      c: S.Number
    }).pipe(S.rename({ c: "b" }), S.omit("a"))
    await Util.expectDecodeUnknownSuccess(schema, { c: 1 }, { b: 1 })
  })
})
