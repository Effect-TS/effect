import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, expect, it } from "vitest"

describe("Schema > extend", () => {
  describe("decoding", () => {
    it(`struct extend struct (dual)`, async () => {
      const schema = S.extend(S.Struct({ a: S.String }), S.Struct({ b: S.Number }))
      await Util.expectDecodeUnknownSuccess(schema, { a: "a", b: 1 })
    })

    it(`struct with defaults extend struct`, async () => {
      const schema = S.Struct({
        a: S.optional(S.String, { exact: true, default: () => "" }),
        b: S.String
      })
        .pipe(
          S.extend(S.Struct({ c: S.Number }))
        )
      await Util.expectDecodeUnknownSuccess(schema, { b: "b", c: 1 }, { a: "", b: "b", c: 1 })
    })

    it(`struct extend struct with defaults`, async () => {
      const schema = S.Struct({ a: S.Number }).pipe(
        S.extend(
          S.Struct({ b: S.String, c: S.optional(S.String, { exact: true, default: () => "" }) })
        )
      )
      await Util.expectDecodeUnknownSuccess(schema, { a: 1, b: "b" }, { a: 1, b: "b", c: "" })
    })

    it(`struct with defaults extend struct with defaults `, async () => {
      const schema = S.Struct({
        a: S.optional(S.String, { exact: true, default: () => "" }),
        b: S.String
      })
        .pipe(
          S.extend(
            S.Struct({
              c: S.optional(S.Number, { exact: true, default: () => 0 }),
              d: S.Boolean
            })
          )
        )
      await Util.expectDecodeUnknownSuccess(schema, { b: "b", d: true }, { a: "", b: "b", c: 0, d: true })
    })

    it(`union with defaults extend union with defaults `, async () => {
      const schema = S.Union(
        S.Struct({
          a: S.optional(S.String, { exact: true, default: () => "a" }),
          b: S.String
        }),
        S.Struct({
          c: S.optional(S.String, { exact: true, default: () => "c" }),
          d: S.String
        })
      ).pipe(
        S.extend(
          S.Union(
            S.Struct({
              e: S.optional(S.String, { exact: true, default: () => "e" }),
              f: S.String
            }),
            S.Struct({
              g: S.optional(S.String, { exact: true, default: () => "g" }),
              h: S.String
            })
          )
        )
      )
      await Util.expectDecodeUnknownSuccess(schema, { b: "b", f: "f" }, {
        a: "a",
        b: "b",
        e: "e",
        f: "f"
      })
      await Util.expectDecodeUnknownSuccess(schema, { d: "d", h: "h" }, {
        c: "c",
        d: "d",
        g: "g",
        h: "h"
      })
    })

    it(`struct extend union`, () => {
      const schema = S.Struct({ b: S.Boolean }).pipe(
        S.extend(S.Union(
          S.Struct({ a: S.Literal("a") }),
          S.Struct({ a: S.Literal("b") })
        ))
      )
      const is = S.is(schema)

      expect(is({ a: "a", b: false })).toBe(true)
      expect(is({ a: "b", b: false })).toBe(true)

      expect(is({ a: "a" })).toBe(false)
      expect(is({ a: "b" })).toBe(false)
    })

    it(`union extend struct`, () => {
      const schema = S.Union(
        S.Struct({ a: S.Literal("a") }),
        S.Struct({ b: S.Literal("b") })
      ).pipe(
        S.extend(S.Struct({ c: S.Boolean }))
      )
      const is = S.is(schema)

      expect(is({ a: "a", c: false })).toBe(true)
      expect(is({ b: "b", c: false })).toBe(true)

      expect(is({ a: "a" })).toBe(false)
      expect(is({ a: "b" })).toBe(false)
    })

    it(`nested union extends struct`, () => {
      const schema = S.Union(
        S.Union(
          S.Struct({ a: S.Literal("a") }),
          S.Struct({ a: S.Literal("b") })
        ),
        S.Struct({ b: S.Literal("b") })
      ).pipe(
        S.extend(S.Struct({ c: S.Boolean }))
      )
      expect(AST.isUnion(schema.ast)).toBe(true)
      const ast = schema.ast as AST.Union
      expect(ast.types.length).toBe(3)
      expect(ast.types.every(AST.isTypeLiteral)).toBe(true)

      const is = S.is(schema)

      expect(is({ a: "a", c: false })).toBe(true)
      expect(is({ b: "b", c: false })).toBe(true)
      expect(is({ a: "b", c: false })).toBe(true)

      expect(is({ a: "a" })).toBe(false)
      expect(is({ a: "b" })).toBe(false)
    })

    it(`union extend union`, () => {
      const schema = S.Union(
        S.Struct({ a: S.Literal("a") }),
        S.Struct({ a: S.Literal("b") })
      ).pipe(
        S.extend(
          S.Union(
            S.Struct({ c: S.Boolean }),
            S.Struct({ d: S.Number })
          )
        )
      )
      const is = S.is(schema)

      expect(is({ a: "a", c: false })).toBe(true)
      expect(is({ a: "b", d: 69 })).toBe(true)
      expect(is({ a: "a", d: 69 })).toBe(true)
      expect(is({ a: "b", c: false })).toBe(true)

      expect(is({ a: "a" })).toBe(false)
      expect(is({ a: "b" })).toBe(false)
      expect(is({ c: false })).toBe(false)
      expect(is({ d: 42 })).toBe(false)
    })

    it("struct extend record(string, string)", async () => {
      const schema = S.Struct({ a: S.String }).pipe(
        S.extend(S.Record(S.String, S.String))
      )
      await Util.expectDecodeUnknownSuccess(schema, { a: "a" })
      await Util.expectDecodeUnknownSuccess(schema, { a: "a", b: "b" })

      await Util.expectDecodeUnknownFailure(
        schema,
        {},
        `{ a: string; [x: string]: string }
└─ ["a"]
   └─ is missing`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { b: "b" },
        `{ a: string; [x: string]: string }
└─ ["a"]
   └─ is missing`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: 1 },
        `{ a: string; [x: string]: string }
└─ ["a"]
   └─ Expected a string, actual 1`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: "a", b: 1 },
        `{ a: string; [x: string]: string }
└─ ["b"]
   └─ Expected a string, actual 1`
      )
    })

    it("struct extend record(templateLiteral, string)", async () => {
      const schema = S.Struct({ a: S.String }).pipe(
        S.extend(S.Record(
          S.TemplateLiteral(
            S.String,
            S.Literal("-"),
            S.Number
          ),
          S.String
        ))
      )
      // type A = {
      //   [x: `${string}-${number}`]: string
      //   readonly a: string
      // }
      // const a: A = { a: "a" } // OK
      await Util.expectDecodeUnknownSuccess(schema, { a: "a" })
    })

    describe("both operands are transformations", () => {
      const BoolFromString = S.transform(
        S.String,
        S.Boolean,
        { decode: (x) => !!x, encode: (x) => "" + x }
      )

      it("optional, transformation", async () => {
        const schema = S.Struct({
          a: S.optional(S.Boolean, { exact: true, default: () => true })
        }).pipe(
          S.extend(
            S.Struct({
              b: S.Array(BoolFromString)
            })
          )
        )

        await Util.expectDecodeUnknownSuccess(schema, {
          b: ["a"]
        }, { a: true, b: [true] })
      })

      it("transformation, optional", async () => {
        const schema = S.Struct({
          b: S.Array(BoolFromString)
        }).pipe(
          S.extend(
            S.Struct({
              a: S.optional(S.Boolean, { exact: true, default: () => true })
            })
          )
        )

        await Util.expectDecodeUnknownSuccess(schema, {
          b: ["a"]
        }, { a: true, b: [true] })
      })
    })
  })

  describe("encoding", () => {
    it("struct + record(string, NumberFromChar)", async () => {
      const schema = S.Struct({ a: S.Number }).pipe(
        S.extend(S.Record(S.String, Util.NumberFromChar))
      )
      await Util.expectEncodeSuccess(schema, { a: 1 }, { a: 1 })
      await Util.expectEncodeSuccess(schema, { a: 1, b: 1 }, { a: 1, b: "1" })
    })

    it("struct + record(symbol, NumberFromChar)", async () => {
      const b = Symbol.for("@effect/schema/test/b")
      const schema = S.Struct({ a: S.Number }).pipe(
        S.extend(S.Record(S.SymbolFromSelf, Util.NumberFromChar))
      )
      await Util.expectEncodeSuccess(schema, { a: 1 }, { a: 1 })
      await Util.expectEncodeSuccess(schema, { a: 1, [b]: 1 }, { a: 1, [b]: "1" })
    })
  })

  it(`nested struct extend nested struct`, async () => {
    const A = S.Struct({ a: S.Struct({ b: S.String }) })
    const B = S.Struct({ a: S.Struct({ c: S.Number }) })
    const schema = S.extend(A, B)
    await Util.expectDecodeUnknownSuccess(schema, { a: { b: "a", c: 1 } })

    await Util.expectDecodeUnknownFailure(
      schema,
      { a: { b: "a", c: null } },
      `{ a: { b: string; c: number } }
└─ ["a"]
   └─ { b: string; c: number }
      └─ ["c"]
         └─ Expected a number, actual null`
    )
  })

  it("errors", () => {
    expect(() => S.String.pipe(S.extend(S.Number))).toThrow(
      new Error("cannot extend `string` with `number` (path [])")
    )
    expect(() =>
      S.Record(S.String, S.Number).pipe(
        S.extend(S.Record(S.String, S.Boolean))
      )
    ).toThrow(new Error("Duplicate index signature for type `string`"))
    expect(() =>
      S.Record(S.SymbolFromSelf, S.Number).pipe(
        S.extend(S.Record(S.SymbolFromSelf, S.Boolean))
      )
    ).toThrow(new Error("Duplicate index signature for type `symbol`"))
    expect(() =>
      S.Record(S.String, S.Number).pipe(
        S.extend(S.Record(S.String.pipe(S.minLength(2)), S.Boolean))
      )
    ).toThrow(new Error("Duplicate index signature for type `string`"))
    expect(() =>
      S.Struct({ a: S.Literal("a") }).pipe(
        S.extend(S.Struct({ a: S.String }))
      )
    ).toThrow(new Error("cannot extend `\"a\"` with `string` (path [\"a\"])"))
    expect(() =>
      S.Struct({ a: S.Literal("a") }).pipe(
        S.extend(
          S.Union(
            S.Struct({ a: S.String }),
            S.Struct({ b: S.Number })
          )
        )
      )
    ).toThrow(new Error("cannot extend `\"a\"` with `string` (path [\"a\"])"))
    expect(() => S.extend(S.Struct({ a: S.Struct({ b: S.String }) }), S.Struct({ a: S.Struct({ b: S.Number }) })))
      .toThrow(new Error("cannot extend `string` with `number` (path [\"a\", \"b\"])"))
  })
})
