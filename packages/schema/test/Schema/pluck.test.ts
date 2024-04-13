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
      const origin = S.struct({ [a]: S.string, [b]: S.NumberFromString })
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
      const origin = S.struct({ a: S.optional(S.string), b: S.number })
      const schema = S.pluck(origin, "a")
      await Util.expectSuccess(S.decodeUnknown(schema)({ b: 2 }), undefined)
      await Util.expectSuccess(S.decodeUnknown(schema)({ a: undefined, b: 2 }), undefined)
      await Util.expectDecodeUnknownSuccess(schema, { a: "a", b: 2 }, "a")
    })

    it("union", async () => {
      const origin = S.union(S.struct({ _tag: S.literal("A") }), S.struct({ _tag: S.literal("B") }))
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
      const origin = S.struct({ a: S.NonEmpty })
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
      const origin = S.struct({ [a]: S.NonEmpty })
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
    const origin = S.struct({ a: S.optional(S.string) })
    const schema = S.pluck(origin, "a")
    await Util.expectEncodeSuccess(schema, undefined, {})
    await Util.expectEncodeSuccess(schema, "a", { a: "a" })
  })

  it("struct with exact optional key", async () => {
    const origin = S.struct({ a: S.optional(S.string, { exact: true }) })
    const schema = S.pluck(origin, "a")
    await Util.expectEncodeSuccess(schema, undefined, {})
    await Util.expectEncodeSuccess(schema, "a", { a: "a" })
  })

  // it("struct with renamed key", async () => {
  //   const origin = S.struct({ a: S.propertySignature(S.string).pipe(S.fromKey("b")) })
  //   // The `pluck` typing explicitly depends on `I`, resulting in:
  //   // Property 'b' is missing in type '{ a?: any; }' but required in type '{ readonly b: string; }'
  //   // It isn't clear if the `pluck` typings should be fixed, or the test
  //   const schema = S.pluck(origin, "a")
  //   await Util.expectEncodeSuccess(schema, "a", { "b": "a" })
  //   await Util.expectDecodeUnknownSuccess(schema, { b: "a" }, "a")
  // })
})
