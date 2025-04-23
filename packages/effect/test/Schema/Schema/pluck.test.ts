import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../TestUtils.js"

describe("pluck", () => {
  describe("decoding", () => {
    it("struct (string keys)", async () => {
      const origin = S.Struct({ a: S.String, b: S.NumberFromString })
      const schema = S.pluck(origin, "a")
      await Util.assertions.decoding.succeed(schema, { a: "a", b: "2" }, "a")
      await Util.assertions.decoding.fail(
        schema,
        { a: 1, b: "2" },
        `({ readonly a: string } <-> string)
└─ Encoded side transformation failure
   └─ { readonly a: string }
      └─ ["a"]
         └─ Expected string, actual 1`
      )
    })

    it("struct (symbol keys)", async () => {
      const a = Symbol.for("effect/schema/test/a")
      const b = Symbol.for("effect/schema/test/b")
      const origin = S.Struct({ [a]: S.String, [b]: S.NumberFromString })
      const schema = S.pluck(origin, a)
      await Util.assertions.decoding.succeed(schema, { [a]: "a", [b]: "2" }, "a")
      await Util.assertions.decoding.fail(
        schema,
        { [a]: 1, [b]: "2" },
        `({ readonly Symbol(effect/schema/test/a): string } <-> string)
└─ Encoded side transformation failure
   └─ { readonly Symbol(effect/schema/test/a): string }
      └─ [Symbol(effect/schema/test/a)]
         └─ Expected string, actual 1`
      )
    })

    it("struct with optional key", async () => {
      const origin = S.Struct({ a: S.optional(S.String), b: S.Number })
      const schema = S.pluck(origin, "a")
      await Util.assertions.decoding.succeed(schema, { b: 2 }, undefined)
      await Util.assertions.decoding.succeed(schema, { a: undefined, b: 2 }, undefined)
      await Util.assertions.decoding.succeed(schema, { a: "a", b: 2 }, "a")
    })

    it("union", async () => {
      const origin = S.Union(S.Struct({ _tag: S.Literal("A") }), S.Struct({ _tag: S.Literal("B") }))
      const schema = S.pluck(origin, "_tag")
      await Util.assertions.decoding.succeed(schema, { _tag: "A" }, "A")
      await Util.assertions.decoding.succeed(schema, { _tag: "B" }, "B")
      await Util.assertions.decoding.fail(
        schema,
        {},
        `({ readonly _tag: "A" | "B" } <-> "A" | "B")
└─ Encoded side transformation failure
   └─ { readonly _tag: "A" | "B" }
      └─ ["_tag"]
         └─ is missing`
      )
    })
  })

  describe("encoding", () => {
    it("struct (string keys)", async () => {
      const origin = S.Struct({ a: S.NonEmptyString })
      const schema = S.pluck(origin, "a")
      await Util.assertions.encoding.succeed(schema, "a", { a: "a" })
      await Util.assertions.encoding.fail(
        schema,
        "",
        `({ readonly a: NonEmptyString } <-> NonEmptyString)
└─ Type side transformation failure
   └─ NonEmptyString
      └─ Predicate refinement failure
         └─ Expected a non empty string, actual ""`
      )
    })

    it("struct (symbol keys)", async () => {
      const a = Symbol.for("effect/schema/test/a")
      const origin = S.Struct({ [a]: S.NonEmptyString })
      const schema = S.pluck(origin, a)
      await Util.assertions.encoding.succeed(schema, "a", { [a]: "a" })
      await Util.assertions.encoding.fail(
        schema,
        "",
        `({ readonly Symbol(effect/schema/test/a): NonEmptyString } <-> NonEmptyString)
└─ Type side transformation failure
   └─ NonEmptyString
      └─ Predicate refinement failure
         └─ Expected a non empty string, actual ""`
      )
    })
  })

  it("struct with optional key", async () => {
    const origin = S.Struct({ a: S.optional(S.String) })
    const schema = S.pluck(origin, "a")
    await Util.assertions.encoding.succeed(schema, undefined, {})
    await Util.assertions.encoding.succeed(schema, "a", { a: "a" })
  })

  it("struct with exact optional key", async () => {
    const origin = S.Struct({ a: S.optionalWith(S.String, { exact: true }) })
    const schema = S.pluck(origin, "a")
    await Util.assertions.encoding.succeed(schema, undefined, {})
    await Util.assertions.encoding.succeed(schema, "a", { a: "a" })
  })
})
