import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("`exact` option", () => {
  describe("decoding", () => {
    it("false (default)", async () => {
      const schema = S.Struct({ a: S.Unknown })
      await Util.assertions.decoding.succeed(schema, {}, { a: undefined })
    })

    it("true", async () => {
      const schema = S.Struct({ a: S.Unknown })
      await Util.expectDecodeUnknownFailure(
        schema,
        {},
        `{ readonly a: unknown }
└─ ["a"]
   └─ is missing`,
        { exact: true }
      )
    })
  })

  describe("is", () => {
    it("true (default)", async () => {
      const schema = S.Struct({ a: S.Unknown })
      expect(S.is(schema)({})).toBe(false)
    })

    it("false", async () => {
      const schema = S.Struct({ a: S.Unknown })
      expect(S.is(schema)({}, { exact: false })).toBe(true)
    })
  })

  describe("asserts", () => {
    it("true (default)", async () => {
      const schema = S.Struct({ a: S.Unknown })
      Util.expectAssertsFailure(
        schema,
        {},
        `{ readonly a: unknown }
└─ ["a"]
   └─ is missing`
      )
    })

    it("false", async () => {
      const schema = S.Struct({ a: S.Unknown })
      Util.expectAssertsSuccess(schema, {}, { exact: false })
    })
  })
})
