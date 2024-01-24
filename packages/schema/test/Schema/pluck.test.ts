import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("Schema > pluck", () => {
  describe("decoding", () => {
    it("struct (string keys)", async () => {
      const schema = S.pluck(S.struct({ a: S.string, b: S.number }), "a")
      await Util.expectDecodeUnknownSuccess(schema, { a: "a", b: 2 }, "a")
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: 1, b: 2 },
        `({ a: string; b: number } <-> string)
└─ From side transformation failure
   └─ { a: string; b: number }
      └─ ["a"]
         └─ Expected a string, actual 1`
      )
    })

    it("struct (symbol keys)", async () => {
      const a = Symbol.for("effect/schema/test/a")
      const b = Symbol.for("effect/schema/test/b")
      const schema = S.pluck(S.struct({ [a]: S.string, [b]: S.number }), a)
      await Util.expectDecodeUnknownSuccess(schema, { [a]: "a", [b]: 2 }, "a")
      await Util.expectDecodeUnknownFailure(
        schema,
        { [a]: 1, [b]: 2 },
        `({ Symbol(effect/schema/test/a): string; Symbol(effect/schema/test/b): number } <-> string)
└─ From side transformation failure
   └─ { Symbol(effect/schema/test/a): string; Symbol(effect/schema/test/b): number }
      └─ [Symbol(effect/schema/test/a)]
         └─ Expected a string, actual 1`
      )
    })

    it("struct with optional key", async () => {
      const schema = S.pluck(S.struct({ a: S.optional(S.string), b: S.number }), "a")
      await Util.expectSuccess(S.decodeUnknown(schema)({ b: 2 }), undefined)
      await Util.expectSuccess(S.decodeUnknown(schema)({ a: undefined, b: 2 }), undefined)
      await Util.expectDecodeUnknownSuccess(schema, { a: "a", b: 2 }, "a")
    })

    it("union", async () => {
      const schema = S.pluck(S.union(S.struct({ _tag: S.literal("A") }), S.struct({ _tag: S.literal("B") })), "_tag")
      await Util.expectDecodeUnknownSuccess(schema, { _tag: "A" }, "A")
      await Util.expectDecodeUnknownSuccess(schema, { _tag: "B" }, "B")
      await Util.expectDecodeUnknownFailure(
        schema,
        {},
        `({ _tag: "A" } | { _tag: "B" } <-> "A" | "B")
└─ From side transformation failure
   └─ { _tag: "A" } | { _tag: "B" }
      └─ { _tag: "A" | "B" }
         └─ ["_tag"]
            └─ is missing`
      )
    })
  })

  describe("encoding", () => {
    it("struct (always fails)", async () => {
      const schema = S.pluck(S.struct({ a: S.string, b: S.number }), "a")
      await Util.expectEncodeFailure(
        schema,
        "a",
        `({ a: string; b: number } <-> string)
└─ From side transformation failure
   └─ { a: string; b: number }
      └─ ["b"]
         └─ is missing`
      )
    })

    it("struct (string keys, possibly successful)", async () => {
      const schema = S.pluck(S.struct({ a: S.NonEmpty }), "a")
      await Util.expectEncodeSuccess(schema, "a", { a: "a" })
      await Util.expectEncodeFailure(
        schema,
        "",
        `({ a: NonEmpty } <-> NonEmpty)
└─ To side transformation failure
   └─ NonEmpty
      └─ Predicate refinement failure
         └─ Expected NonEmpty (a non empty string), actual ""`
      )
    })

    it("struct (symbol keys, possibly successful)", async () => {
      const a = Symbol.for("effect/schema/test/a")
      const schema = S.pluck(S.struct({ [a]: S.NonEmpty }), a)
      await Util.expectEncodeSuccess(schema, "a", { [a]: "a" })
      await Util.expectEncodeFailure(
        schema,
        "",
        `({ Symbol(effect/schema/test/a): NonEmpty } <-> NonEmpty)
└─ To side transformation failure
   └─ NonEmpty
      └─ Predicate refinement failure
         └─ Expected NonEmpty (a non empty string), actual ""`
      )
    })
  })

  it("struct with optional key", async () => {
    const schema = S.pluck(S.struct({ a: S.optional(S.string) }), "a")
    await Util.expectEncodeSuccess(schema, undefined, {})
    await Util.expectEncodeSuccess(schema, "a", { a: "a" })
  })

  it("struct with exact optional key", async () => {
    const schema = S.pluck(S.struct({ a: S.optional(S.string, { exact: true }) }), "a")
    await Util.expectEncodeSuccess(schema, undefined, {})
    await Util.expectEncodeSuccess(schema, "a", { a: "a" })
  })
})
