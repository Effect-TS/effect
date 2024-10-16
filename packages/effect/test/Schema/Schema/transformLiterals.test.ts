import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("transformLiteral", () => {
  describe("Struct", () => {
    it("simple", async () => {
      const schema = S.transformLiteral(0, "a")

      await Util.expectDecodeUnknownSuccess(schema, 0, "a")
      await Util.expectEncodeSuccess(schema, "a", 0)
    })
  })
})

describe("transformLiterals", () => {
  describe("Struct", () => {
    it("simple", async () => {
      const schema = S.transformLiterals(
        [0, "a"],
        [1, "b"],
        [2, "c"]
      )

      await Util.expectDecodeUnknownSuccess(schema, 1, "b")
      await Util.expectEncodeSuccess(schema, "b", 1)
    })

    it("mixed types", async () => {
      const schema = S.transformLiterals(
        [0, BigInt(0)],
        ["a", true],
        [null, false]
      )

      await Util.expectDecodeUnknownSuccess(schema, 0, BigInt(0))
      await Util.expectEncodeSuccess(schema, BigInt(0), 0)
      await Util.expectDecodeUnknownSuccess(schema, "a", true)
      await Util.expectEncodeSuccess(schema, true, "a")
      await Util.expectDecodeUnknownSuccess(schema, null, false)
      await Util.expectEncodeSuccess(schema, false, null)
    })
  })
})
