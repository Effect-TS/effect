import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("Schema > pluck", () => {
  describe("decoding", () => {
    it("struct (string keys)", async () => {
      const origin = S.Struct({ a: S.String, b: S.NumberFromString })
      const schema = S.pluck(origin, "a")
      await Util.expectDecodeUnknownSuccess(schema, { a: "a", b: "2" }, "a")
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: 1, b: "2" },
        `({ a: string } <-> string)
└─ Encoded side transformation failure
   └─ { a: string }
      └─ ["a"]
         └─ Expected a string, actual 1`
      )
    })

    it("struct (symbol keys)", async () => {
      const a = Symbol.for("effect/schema/test/a")
      const b = Symbol.for("effect/schema/test/b")
      const origin = S.Struct({ [a]: S.String, [b]: S.NumberFromString })
      const schema = S.pluck(origin, a)
      await Util.expectDecodeUnknownSuccess(schema, { [a]: "a", [b]: "2" }, "a")
      await Util.expectDecodeUnknownFailure(
        schema,
        { [a]: 1, [b]: "2" },
        `({ Symbol(effect/schema/test/a): string } <-> string)
└─ Encoded side transformation failure
   └─ { Symbol(effect/schema/test/a): string }
      └─ [Symbol(effect/schema/test/a)]
         └─ Expected a string, actual 1`
      )
    })

    it("struct with optional key", async () => {
      const origin = S.Struct({ a: S.optional(S.String), b: S.Number })
      const schema = S.pluck(origin, "a")
      await Util.expectSuccess(S.decodeUnknown(schema)({ b: 2 }), undefined)
      await Util.expectSuccess(S.decodeUnknown(schema)({ a: undefined, b: 2 }), undefined)
      await Util.expectDecodeUnknownSuccess(schema, { a: "a", b: 2 }, "a")
    })

    it("union", async () => {
      const origin = S.Union(S.Struct({ _tag: S.Literal("A") }), S.Struct({ _tag: S.Literal("B") }))
      const schema = S.pluck(origin, "_tag")
      await Util.expectDecodeUnknownSuccess(schema, { _tag: "A" }, "A")
      await Util.expectDecodeUnknownSuccess(schema, { _tag: "B" }, "B")
      await Util.expectDecodeUnknownFailure(
        schema,
        {},
        `({ _tag: "A" | "B" } <-> "A" | "B")
└─ Encoded side transformation failure
   └─ { _tag: "A" | "B" }
      └─ ["_tag"]
         └─ is missing`
      )
    })
  })

  describe("encoding", () => {
    it("struct (string keys)", async () => {
      const origin = S.Struct({ a: S.NonEmpty })
      const schema = S.pluck(origin, "a")
      await Util.expectEncodeSuccess(schema, "a", { a: "a" })
      await Util.expectEncodeFailure(
        schema,
        "",
        `({ a: NonEmpty } <-> NonEmpty)
└─ Type side transformation failure
   └─ NonEmpty
      └─ Predicate refinement failure
         └─ Expected NonEmpty (a non empty string), actual ""`
      )
    })

    it("struct (symbol keys)", async () => {
      const a = Symbol.for("effect/schema/test/a")
      const origin = S.Struct({ [a]: S.NonEmpty })
      const schema = S.pluck(origin, a)
      await Util.expectEncodeSuccess(schema, "a", { [a]: "a" })
      await Util.expectEncodeFailure(
        schema,
        "",
        `({ Symbol(effect/schema/test/a): NonEmpty } <-> NonEmpty)
└─ Type side transformation failure
   └─ NonEmpty
      └─ Predicate refinement failure
         └─ Expected NonEmpty (a non empty string), actual ""`
      )
    })
  })

  it("struct with optional key", async () => {
    const origin = S.Struct({ a: S.optional(S.String) })
    const schema = S.pluck(origin, "a")
    await Util.expectEncodeSuccess(schema, undefined, {})
    await Util.expectEncodeSuccess(schema, "a", { a: "a" })
  })

  it("struct with exact optional key", async () => {
    const origin = S.Struct({ a: S.optional(S.String, { exact: true }) })
    const schema = S.pluck(origin, "a")
    await Util.expectEncodeSuccess(schema, undefined, {})
    await Util.expectEncodeSuccess(schema, "a", { a: "a" })
  })
})
