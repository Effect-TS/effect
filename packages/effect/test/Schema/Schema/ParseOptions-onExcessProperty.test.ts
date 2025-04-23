import { describe, it } from "@effect/vitest"
import { assertLeft } from "@effect/vitest/utils"
import * as ParseResult from "effect/ParseResult"
import * as S from "effect/Schema"
import * as Util from "../TestUtils.js"

describe("`onExcessProperty` option", () => {
  describe("`ignore` option", () => {
    it("should not change tuple behaviour", async () => {
      const schema = S.Tuple(S.Number)
      await Util.assertions.decoding.fail(
        schema,
        [1, "b"],
        `readonly [number]
└─ [1]
   └─ is unexpected, expected: 0`
      )
      await Util.assertions.encoding.fail(
        schema,
        [1, "b"] as any,
        `readonly [number]
└─ [1]
   └─ is unexpected, expected: 0`
      )
    })

    it("tuple of a struct", async () => {
      const schema = S.Tuple(S.Struct({ b: S.Number }))
      await Util.assertions.decoding.succeed(
        schema,
        [{ b: 1, c: "c" }],
        [{ b: 1 }]
      )
    })

    it("tuple rest element of a struct", async () => {
      const schema = S.Array(S.Struct({ b: S.Number }))
      await Util.assertions.decoding.succeed(
        schema,
        [{ b: 1, c: "c" }],
        [{ b: 1 }]
      )
    })

    it("tuple. post rest elements of a struct", async () => {
      const schema = S.Tuple([], S.String, S.Struct({ b: S.Number }))
      await Util.assertions.decoding.succeed(schema, [{ b: 1 }])
      await Util.assertions.decoding.succeed(
        schema,
        [{ b: 1, c: "c" }],
        [{ b: 1 }]
      )
    })

    it("struct excess property signatures", async () => {
      const schema = S.Struct({ a: S.Number })
      await Util.assertions.decoding.succeed(
        schema,
        { a: 1, b: "b" },
        { a: 1 }
      )
    })

    it("struct nested struct", async () => {
      const schema = S.Struct({ a: S.Struct({ b: S.Number }) })
      await Util.assertions.decoding.succeed(
        schema,
        { a: { b: 1, c: "c" } },
        {
          a: { b: 1 }
        }
      )
    })

    it("record of struct", async () => {
      const schema = S.Record({ key: S.String, value: S.Struct({ b: S.Number }) })
      await Util.assertions.decoding.succeed(
        schema,
        { a: { b: 1, c: "c" } },
        { a: { b: 1 } }
      )
    })
  })

  describe("`error` option", () => {
    describe("should register the actual value", () => {
      it("struct", () => {
        const schema = S.Struct({ a: S.String })
        const input = { a: "a", b: 1 }
        const e = ParseResult.decodeUnknownEither(schema)(input, Util.onExcessPropertyError)
        assertLeft(
          e,
          new ParseResult.Composite(
            schema.ast,
            input,
            new ParseResult.Pointer("b", input, new ParseResult.Unexpected(1, `is unexpected, expected: "a"`)),
            {}
          )
        )
      })

      it("tuple", () => {
        const schema = S.Tuple(S.String)
        const input = ["a", 1]
        const e = ParseResult.decodeUnknownEither(schema)(input, Util.onExcessPropertyError)
        assertLeft(
          e,
          new ParseResult.Composite(
            schema.ast,
            input,
            new ParseResult.Pointer(1, input, new ParseResult.Unexpected(1, `is unexpected, expected: 0`)),
            []
          )
        )
      })
    })

    it("structs", async () => {
      const a = S.Struct({
        a: S.optionalWith(S.Number, { exact: true }),
        b: S.optionalWith(S.String, { exact: true })
      })
      const b = S.Struct({ a: S.optionalWith(S.Number, { exact: true }) })
      const schema = S.Union(a, b)
      await Util.assertions.decoding.fail(
        schema,
        { a: 1, b: "b", c: true },
        `{ readonly a?: number; readonly b?: string } | { readonly a?: number }
├─ { readonly a?: number; readonly b?: string }
│  └─ ["c"]
│     └─ is unexpected, expected: "a" | "b"
└─ { readonly a?: number }
   └─ ["b"]
      └─ is unexpected, expected: "a"`,
        { parseOptions: Util.onExcessPropertyError }
      )
    })

    it("tuples", async () => {
      const a = S.Tuple(S.Number, S.optionalElement(S.String))
      const b = S.Tuple(S.Number)
      const schema = S.Union(a, b)
      await Util.assertions.decoding.fail(
        schema,
        [1, "b", true],
        `readonly [number, string?] | readonly [number]
├─ readonly [number, string?]
│  └─ [2]
│     └─ is unexpected, expected: 0 | 1
└─ readonly [number]
   └─ [1]
      └─ is unexpected, expected: 0`
      )
      await Util.assertions.decoding.fail(
        schema,
        [1, "b", true],
        `readonly [number, string?] | readonly [number]
├─ readonly [number, string?]
│  └─ [2]
│     └─ is unexpected, expected: 0 | 1
└─ readonly [number]
   └─ [1]
      └─ is unexpected, expected: 0`,
        { parseOptions: Util.onExcessPropertyError }
      )
    })
  })

  describe("`preserve` option", () => {
    it("should not change tuple behaviour", async () => {
      const schema = S.Tuple(S.Number)
      await Util.assertions.decoding.fail(
        schema,
        [1, "b"],
        `readonly [number]
└─ [1]
   └─ is unexpected, expected: 0`,
        { parseOptions: Util.onExcessPropertyPreserve }
      )
      await Util.assertions.encoding.fail(
        schema,
        [1, "b"] as any,
        `readonly [number]
└─ [1]
   └─ is unexpected, expected: 0`,
        { parseOptions: Util.onExcessPropertyPreserve }
      )
    })

    it("struct with string excess keys", async () => {
      const c = Symbol.for("effect/Schema/test/c")
      const schema = S.Struct({ a: S.String })
      const input = { a: "a", b: 1, [c]: true }
      await Util.assertions.decoding.succeed(schema, input, input, {
        parseOptions: Util.onExcessPropertyPreserve
      })
    })

    it("struct with symbol excess keys", async () => {
      const c = Symbol.for("effect/Schema/test/c")
      const schema = S.Struct({ [c]: S.Boolean })
      const input = { a: "a", b: 1, [c]: true }
      await Util.assertions.decoding.succeed(schema, input, input, {
        parseOptions: Util.onExcessPropertyPreserve
      })
    })

    it("struct with both string and symbol excess keys", async () => {
      const c = Symbol.for("effect/Schema/test/c")
      const schema = S.Struct({ a: S.String, [c]: S.Boolean })
      const input = { a: "a", b: 1, [c]: true }
      await Util.assertions.decoding.succeed(schema, input, input, {
        parseOptions: Util.onExcessPropertyPreserve
      })
    })

    it("record(string, string)", async () => {
      const c = Symbol.for("effect/Schema/test/c")
      const schema = S.Struct({ a: S.String })
      const input = { a: "a", [c]: true }
      await Util.assertions.decoding.succeed(schema, input, input, {
        parseOptions: Util.onExcessPropertyPreserve
      })
    })

    it("record(symbol, boolean)", async () => {
      const c = Symbol.for("effect/Schema/test/c")
      const schema = S.Struct({ [c]: S.Boolean })
      const input = { a: "a", [c]: true }
      await Util.assertions.decoding.succeed(schema, input, input, {
        parseOptions: Util.onExcessPropertyPreserve
      })
    })
  })
})
