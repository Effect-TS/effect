import { describe, it } from "@effect/vitest"
import * as Duration from "effect/Duration"
import * as S from "effect/Schema"
import * as Util from "../TestUtils.js"

describe("getNumberIndexedAccess", () => {
  describe("Tuple", () => {
    it("decodes and encodes required elements in a tuple", async () => {
      const schema = S.getNumberIndexedAccess(S.Tuple(S.NumberFromString, S.DurationFromNanos))
      await Util.assertions.decoding.succeed(schema, "1", 1)
      await Util.assertions.decoding.succeed(schema, 1n, Duration.nanos(1n))
      await Util.assertions.encoding.succeed(schema, 1, "1")
      await Util.assertions.encoding.succeed(schema, Duration.nanos(1n), 1n)
    })

    it("decodes and encodes a tuple with an optional element", async () => {
      const schema = S.getNumberIndexedAccess(S.Tuple(S.NumberFromString, S.optionalElement(S.DurationFromNanos)))
      await Util.assertions.decoding.succeed(schema, undefined)
      await Util.assertions.decoding.succeed(schema, "1", 1)
      await Util.assertions.decoding.succeed(schema, 1n, Duration.nanos(1n))
      await Util.assertions.encoding.succeed(schema, undefined, undefined)
      await Util.assertions.encoding.succeed(schema, 1, "1")
      await Util.assertions.encoding.succeed(schema, Duration.nanos(1n), 1n)
    })
  })

  it("Array", async () => {
    const schema = S.getNumberIndexedAccess(S.Array(S.NumberFromString))
    await Util.assertions.decoding.succeed(schema, "1", 1)
    await Util.assertions.encoding.succeed(schema, 1, "1")
  })

  it("Union", async () => {
    const schema = S.getNumberIndexedAccess(S.Union(S.Array(S.Number), S.Array(S.String)))
    await Util.assertions.decoding.succeed(schema, "a")
    await Util.assertions.decoding.succeed(schema, 1)
    await Util.assertions.encoding.succeed(schema, "a", "a")
    await Util.assertions.encoding.succeed(schema, 1, 1)
  })
})
