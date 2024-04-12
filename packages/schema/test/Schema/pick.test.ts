import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, expect, it } from "vitest"

describe("Schema > pick", () => {
  it("struct", async () => {
    const a = Symbol.for("@effect/schema/test/a")
    const schema = S.Struct({ [a]: S.String, b: S.NumberFromString, c: S.Boolean }).pipe(
      S.Pick(a, "b")
    )
    await Util.expectDecodeUnknownSuccess(schema, { [a]: "a", b: "1" }, { [a]: "a", b: 1 })

    await Util.expectDecodeUnknownFailure(
      schema,
      null,
      "Expected { Symbol(@effect/schema/test/a): string; b: NumberFromString }, actual null"
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      { [a]: "a" },
      `{ Symbol(@effect/schema/test/a): string; b: NumberFromString }
└─ ["b"]
   └─ is missing`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      { b: 1 },
      `{ Symbol(@effect/schema/test/a): string; b: NumberFromString }
└─ [Symbol(@effect/schema/test/a)]
   └─ is missing`
    )
  })

  it("struct with optionals", async () => {
    const schema = S.Struct({
      a: S.optional(S.String, { exact: true }),
      b: S.NumberFromString,
      c: S.Boolean
    })
      .pipe(
        S.Pick("a", "b")
      )
    await Util.expectDecodeUnknownSuccess(schema, { a: "a", b: "1" }, { a: "a", b: 1 })
    await Util.expectDecodeUnknownSuccess(schema, { b: "1" }, { b: 1 })

    await Util.expectDecodeUnknownFailure(
      schema,
      null,
      "Expected { a?: string; b: NumberFromString }, actual null"
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      { a: "a" },
      `{ a?: string; b: NumberFromString }
└─ ["b"]
   └─ is missing`
    )
  })

  it("suspend", async () => {
    interface A {
      readonly a: string
      readonly as: ReadonlyArray<A>
    }
    const A: S.Schema<A> = S.Suspend( // intended outer suspend
      () =>
        S.Struct({
          a: S.String,
          as: S.Array(A)
        })
    )
    const schema = A.pipe(S.Pick("as"))
    await Util.expectDecodeUnknownSuccess(schema, { as: [] })
    await Util.expectDecodeUnknownSuccess(schema, { as: [{ a: "a", as: [] }] })

    await Util.expectDecodeUnknownFailure(
      schema,
      { as: [{ as: [] }] },
      `{ as: ReadonlyArray<<suspended schema>> }
└─ ["as"]
   └─ ReadonlyArray<<suspended schema>>
      └─ [0]
         └─ { a: string; as: ReadonlyArray<<suspended schema>> }
            └─ ["a"]
               └─ is missing`
    )
  })

  it("struct with property signature transformations", async () => {
    const schema = S.Struct({
      a: S.optional(S.String, { exact: true, default: () => "" }),
      b: S.NumberFromString,
      c: S.Boolean
    }).pipe(
      S.Pick("a", "b")
    )
    await Util.expectDecodeUnknownSuccess(schema, { a: "a", b: "1" }, { a: "a", b: 1 })
    await Util.expectDecodeUnknownSuccess(schema, { b: "1" }, { a: "", b: 1 })
  })

  it("record(string, number)", async () => {
    const schema = S.Record(S.String, S.Number).pipe(S.Pick("a", "b"))
    await Util.expectDecodeUnknownSuccess(schema, { a: 1, b: 2 })
    await Util.expectDecodeUnknownFailure(
      schema,
      { a: "a", b: 2 },
      `{ a: number; b: number }
└─ ["a"]
   └─ Expected a number, actual "a"`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      { a: 1, b: "b" },
      `{ a: number; b: number }
└─ ["b"]
   └─ Expected a number, actual "b"`
    )
  })

  it("record(symbol, number)", async () => {
    const a = Symbol.for("@effect/schema/test/a")
    const b = Symbol.for("@effect/schema/test/b")
    const schema = S.Record(S.SymbolFromSelf, S.Number).pipe(S.Pick(a, b))
    await Util.expectDecodeUnknownSuccess(schema, { [a]: 1, [b]: 2 })
    await Util.expectDecodeUnknownFailure(
      schema,
      { [a]: "a", [b]: 2 },
      `{ Symbol(@effect/schema/test/a): number; Symbol(@effect/schema/test/b): number }
└─ [Symbol(@effect/schema/test/a)]
   └─ Expected a number, actual "a"`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      { [a]: 1, [b]: "b" },
      `{ Symbol(@effect/schema/test/a): number; Symbol(@effect/schema/test/b): number }
└─ [Symbol(@effect/schema/test/b)]
   └─ Expected a number, actual "b"`
    )
  })

  it("record(string, string) & record(`a${string}`, number)", async () => {
    const schema = S.Struct(
      {},
      S.Record(S.String, S.String),
      S.Record(S.TemplateLiteral(S.Literal("a"), S.String), S.Number)
    ).pipe(
      S.Pick("a", "b")
    )
    await Util.expectDecodeUnknownSuccess(schema, { a: 1, b: "b" })
  })

  it("typeSchema(Class)", () => {
    class A extends S.Class<A>("A")({ a: S.String, b: S.NumberFromString }) {}
    const schema = A.pipe(S.TypeSchema, S.Pick("b"))
    expect(schema.ast).toStrictEqual(S.Struct({ b: S.Number }).ast)
  })

  it("Class", () => {
    class A extends S.Class<A>("A")({ a: S.String, b: S.NumberFromString }) {}
    const schema = A.pipe(S.Pick("b"))
    expect(schema.ast).toStrictEqual(S.Struct({ b: S.NumberFromString }).ast)
  })
})
