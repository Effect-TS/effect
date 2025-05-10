import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../TestUtils.js"

describe("transformLiteral", () => {
  describe("Struct", () => {
    it("simple", async () => {
      const schema = S.transformLiteral(0, "a")

      await Util.assertions.decoding.succeed(schema, 0, "a")
      await Util.assertions.encoding.succeed(schema, "a", 0)
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

      await Util.assertions.decoding.succeed(schema, 1, "b")
      await Util.assertions.encoding.succeed(schema, "b", 1)
    })

    it("mixed types", async () => {
      const schema = S.transformLiterals(
        [0, BigInt(0)],
        ["a", true],
        [null, false]
      )

      await Util.assertions.decoding.succeed(schema, 0, BigInt(0))
      await Util.assertions.encoding.succeed(schema, BigInt(0), 0)
      await Util.assertions.decoding.succeed(schema, "a", true)
      await Util.assertions.encoding.succeed(schema, true, "a")
      await Util.assertions.decoding.succeed(schema, null, false)
      await Util.assertions.encoding.succeed(schema, false, null)
    })
  })
})
