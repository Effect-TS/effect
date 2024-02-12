import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("Schema > pluck", () => {
  describe("decoding", () => {
    it("struct (string keys)", async () => {
      const origin = S.struct({ a: S.string, b: S.NumberFromString })
      const schema = S.pluck(origin, "a")
      await Util.expectDecodeUnknownSuccess(schema, { a: "a", b: "2" }, "a")
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: 1, b: "2" },
        `({ a: string; b: NumberFromString } <-> string)
└─ From side transformation failure
   └─ { a: string; b: NumberFromString }
      └─ ["a"]
         └─ Expected a string, actual 1`
      )

      const schemaNoTransformation = S.pluck(origin, "b", { transformation: false })
      await Util.expectDecodeUnknownSuccess(schemaNoTransformation, "2", 2)
    })

    it("struct (symbol keys)", async () => {
      const a = Symbol.for("effect/schema/test/a")
      const b = Symbol.for("effect/schema/test/b")
      const origin = S.struct({ [a]: S.string, [b]: S.NumberFromString })
      const schema = S.pluck(origin, a)
      await Util.expectDecodeUnknownSuccess(schema, { [a]: "a", [b]: "2" }, "a")
      await Util.expectDecodeUnknownFailure(
        schema,
        { [a]: 1, [b]: "2" },
        `({ Symbol(effect/schema/test/a): string; Symbol(effect/schema/test/b): NumberFromString } <-> string)
└─ From side transformation failure
   └─ { Symbol(effect/schema/test/a): string; Symbol(effect/schema/test/b): NumberFromString }
      └─ [Symbol(effect/schema/test/a)]
         └─ Expected a string, actual 1`
      )

      const schemaNoTransformation = S.pluck(origin, b, { transformation: false })
      await Util.expectDecodeUnknownSuccess(schemaNoTransformation, "2", 2)
    })

    it("struct with optional key", async () => {
      const origin = S.struct({ a: S.optional(S.string), b: S.number })
      const schema = S.pluck(origin, "a")
      await Util.expectSuccess(S.decodeUnknown(schema)({ b: 2 }), undefined)
      await Util.expectSuccess(S.decodeUnknown(schema)({ a: undefined, b: 2 }), undefined)
      await Util.expectDecodeUnknownSuccess(schema, { a: "a", b: 2 }, "a")

      const schemaNoTransformation = S.pluck(origin, "a", { transformation: false })
      await Util.expectSuccess(S.decodeUnknown(schemaNoTransformation)(undefined), undefined)
      await Util.expectDecodeUnknownSuccess(schemaNoTransformation, "a")
    })

    it("union", async () => {
      const origin = S.union(S.struct({ _tag: S.literal("A") }), S.struct({ _tag: S.literal("B") }))
      const schema = S.pluck(origin, "_tag")
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

      const schemaNoTransformation = S.pluck(origin, "_tag", { transformation: false })
      await Util.expectDecodeUnknownSuccess(schemaNoTransformation, "A")
      await Util.expectDecodeUnknownSuccess(schemaNoTransformation, "B")
    })
  })

  describe("encoding", () => {
    it("struct (always fails)", async () => {
      const origin = S.struct({ a: S.string, b: S.number })
      const schema = S.pluck(origin, "a")
      await Util.expectEncodeFailure(
        schema,
        "a",
        `({ a: string; b: number } <-> string)
└─ From side transformation failure
   └─ { a: string; b: number }
      └─ ["b"]
         └─ is missing`
      )

      const schemaNoTransformation = S.pluck(origin, "a", { transformation: false })
      await Util.expectEncodeSuccess(schemaNoTransformation, "a", "a")
    })

    it("struct (string keys, possibly successful)", async () => {
      const origin = S.struct({ a: S.NonEmpty })
      const schema = S.pluck(origin, "a")
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

      const schemaNoTransformation = S.pluck(origin, "a", { transformation: false })
      await Util.expectEncodeSuccess(schemaNoTransformation, "a", "a")
    })

    it("struct (symbol keys, possibly successful)", async () => {
      const a = Symbol.for("effect/schema/test/a")
      const origin = S.struct({ [a]: S.NonEmpty })
      const schema = S.pluck(origin, a)
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

      const schemaNoTransformation = S.pluck(origin, a, { transformation: false })
      await Util.expectEncodeSuccess(schemaNoTransformation, "a", "a")
    })
  })

  it("struct with optional key", async () => {
    const origin = S.struct({ a: S.optional(S.string) })
    const schema = S.pluck(origin, "a")
    await Util.expectEncodeSuccess(schema, undefined, {})
    await Util.expectEncodeSuccess(schema, "a", { a: "a" })

    const schemaNoTransformation = S.pluck(origin, "a", { transformation: false })
    await Util.expectEncodeSuccess(schemaNoTransformation, undefined, undefined)
    await Util.expectEncodeSuccess(schemaNoTransformation, "a", "a")
  })

  it("struct with exact optional key", async () => {
    const origin = S.struct({ a: S.optional(S.string, { exact: true }) })
    const schema = S.pluck(origin, "a")
    await Util.expectEncodeSuccess(schema, undefined, {})
    await Util.expectEncodeSuccess(schema, "a", { a: "a" })

    const schemaNoTransformation = S.pluck(origin, "a", { transformation: false })
    await Util.expectEncodeSuccess(schemaNoTransformation, undefined, undefined)
    await Util.expectEncodeSuccess(schemaNoTransformation, "a", "a")
  })
})
