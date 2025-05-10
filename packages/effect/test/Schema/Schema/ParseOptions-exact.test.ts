import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue } from "@effect/vitest/utils"
import * as S from "effect/Schema"
import * as Util from "../TestUtils.js"

describe("`exact` option", () => {
  describe("decoding", () => {
    it("false (default)", async () => {
      const schema = S.Struct({ a: S.Unknown })
      await Util.assertions.decoding.succeed(schema, {}, { a: undefined })
    })

    it("true", async () => {
      const schema = S.Struct({ a: S.Unknown, b: S.Unknown })
      await Util.assertions.decoding.fail(
        schema,
        {},
        `{ readonly a: unknown; readonly b: unknown }
└─ ["a"]
   └─ is missing`,
        { parseOptions: { exact: true } }
      )
      await Util.assertions.decoding.fail(
        schema,
        {},
        `{ readonly a: unknown; readonly b: unknown }
├─ ["a"]
│  └─ is missing
└─ ["b"]
   └─ is missing`,
        { parseOptions: { exact: true, errors: "all" } }
      )
    })
  })

  describe("is", () => {
    it("true (default)", async () => {
      const schema = S.Struct({ a: S.Unknown })
      assertFalse(S.is(schema)({}))
    })

    it("false", async () => {
      const schema = S.Struct({ a: S.Unknown })
      assertTrue(S.is(schema)({}, { exact: false }))
    })
  })

  describe("asserts", () => {
    it("true (default)", async () => {
      const schema = S.Struct({ a: S.Unknown })
      Util.assertions.asserts.fail(
        schema,
        {},
        `{ readonly a: unknown }
└─ ["a"]
   └─ is missing`
      )
    })

    it("false", async () => {
      const schema = S.Struct({ a: S.Unknown })
      Util.assertions.asserts.succeed(schema, {}, { parseOptions: { exact: false } })
    })
  })
})
