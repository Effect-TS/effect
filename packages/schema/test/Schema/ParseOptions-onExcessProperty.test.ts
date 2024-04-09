import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("Schema > `onExcessProperty` option", () => {
  describe("`ignore` option", () => {
    it("should not change tuple behaviour", async () => {
      const schema = S.Tuple(S.Number)
      await Util.expectDecodeUnknownFailure(
        schema,
        [1, "b"],
        `readonly [number]
└─ [1]
   └─ is unexpected, expected 0`
      )
      await Util.expectEncodeFailure(
        schema,
        [1, "b"] as any,
        `readonly [number]
└─ [1]
   └─ is unexpected, expected 0`
      )
    })

    it("tuple of a struct", async () => {
      const schema = S.Tuple(S.Struct({ b: S.Number }))
      await Util.expectDecodeUnknownSuccess(
        schema,
        [{ b: 1, c: "c" }],
        [{ b: 1 }]
      )
    })

    it("tuple rest element of a struct", async () => {
      const schema = S.Array(S.Struct({ b: S.Number }))
      await Util.expectDecodeUnknownSuccess(
        schema,
        [{ b: 1, c: "c" }],
        [{ b: 1 }]
      )
    })

    it("tuple. post rest elements of a struct", async () => {
      const schema = S.Tuple([], S.String, S.Struct({ b: S.Number }))
      await Util.expectDecodeUnknownSuccess(schema, [{ b: 1 }])
      await Util.expectDecodeUnknownSuccess(
        schema,
        [{ b: 1, c: "c" }],
        [{ b: 1 }]
      )
    })

    it("struct excess property signatures", async () => {
      const schema = S.Struct({ a: S.Number })
      await Util.expectDecodeUnknownSuccess(
        schema,
        { a: 1, b: "b" },
        { a: 1 }
      )
    })

    it("struct nested struct", async () => {
      const schema = S.Struct({ a: S.Struct({ b: S.Number }) })
      await Util.expectDecodeUnknownSuccess(
        schema,
        { a: { b: 1, c: "c" } },
        {
          a: { b: 1 }
        }
      )
    })

    it("record of struct", async () => {
      const schema = S.Record(S.String, S.Struct({ b: S.Number }))
      await Util.expectDecodeUnknownSuccess(
        schema,
        { a: { b: 1, c: "c" } },
        { a: { b: 1 } }
      )
    })
  })

  describe("`error` option", () => {
    it("structs", async () => {
      const a = S.Struct({
        a: S.optional(S.Number, { exact: true }),
        b: S.optional(S.String, { exact: true })
      })
      const b = S.Struct({ a: S.optional(S.Number, { exact: true }) })
      const schema = S.Union(a, b)
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: 1, b: "b", c: true },
        `{ a?: number; b?: string } | { a?: number }
├─ Union member
│  └─ { a?: number; b?: string }
│     └─ ["c"]
│        └─ is unexpected, expected "a" | "b"
└─ Union member
   └─ { a?: number }
      └─ ["b"]
         └─ is unexpected, expected "a"`,
        Util.onExcessPropertyError
      )
    })

    it("tuples", async () => {
      const a = S.Tuple(S.Number, S.OptionalElement(S.String))
      const b = S.Tuple(S.Number)
      const schema = S.Union(a, b)
      await Util.expectDecodeUnknownFailure(
        schema,
        [1, "b", true],
        `readonly [number, string?] | readonly [number]
├─ Union member
│  └─ readonly [number, string?]
│     └─ [2]
│        └─ is unexpected, expected 0 | 1
└─ Union member
   └─ readonly [number]
      └─ [1]
         └─ is unexpected, expected 0`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        [1, "b", true],
        `readonly [number, string?] | readonly [number]
├─ Union member
│  └─ readonly [number, string?]
│     └─ [2]
│        └─ is unexpected, expected 0 | 1
└─ Union member
   └─ readonly [number]
      └─ [1]
         └─ is unexpected, expected 0`,
        Util.onExcessPropertyError
      )
    })
  })

  describe("`preserve` option", () => {
    it("should not change tuple behaviour", async () => {
      const schema = S.Tuple(S.Number)
      await Util.expectDecodeUnknownFailure(
        schema,
        [1, "b"],
        `readonly [number]
└─ [1]
   └─ is unexpected, expected 0`,
        Util.onExcessPropertyPreserve
      )
      await Util.expectEncodeFailure(
        schema,
        [1, "b"] as any,
        `readonly [number]
└─ [1]
   └─ is unexpected, expected 0`,
        Util.onExcessPropertyPreserve
      )
    })

    it("struct with string excess keys", async () => {
      const c = Symbol.for("@effect/schema/test/c")
      const schema = S.Struct({ a: S.String })
      const input = { a: "a", b: 1, [c]: true }
      await Util.expectDecodeUnknownSuccess(schema, input, input, Util.onExcessPropertyPreserve)
    })

    it("struct with symbol excess keys", async () => {
      const c = Symbol.for("@effect/schema/test/c")
      const schema = S.Struct({ [c]: S.Boolean })
      const input = { a: "a", b: 1, [c]: true }
      await Util.expectDecodeUnknownSuccess(schema, input, input, Util.onExcessPropertyPreserve)
    })

    it("struct with both string and symbol excess keys", async () => {
      const c = Symbol.for("@effect/schema/test/c")
      const schema = S.Struct({ a: S.String, [c]: S.Boolean })
      const input = { a: "a", b: 1, [c]: true }
      await Util.expectDecodeUnknownSuccess(schema, input, input, Util.onExcessPropertyPreserve)
    })

    it("record(string, string)", async () => {
      const c = Symbol.for("@effect/schema/test/c")
      const schema = S.Struct({ a: S.String })
      const input = { a: "a", [c]: true }
      await Util.expectDecodeUnknownSuccess(schema, input, input, Util.onExcessPropertyPreserve)
    })

    it("record(symbol, boolean)", async () => {
      const c = Symbol.for("@effect/schema/test/c")
      const schema = S.Struct({ [c]: S.Boolean })
      const input = { a: "a", [c]: true }
      await Util.expectDecodeUnknownSuccess(schema, input, input, Util.onExcessPropertyPreserve)
    })
  })
})
