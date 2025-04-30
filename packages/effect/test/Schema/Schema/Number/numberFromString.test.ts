import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("NumberFromString", () => {
  const schema = S.NumberFromString

  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(schema)
  })

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(schema, "0", 0)
    await Util.assertions.decoding.succeed(schema, "-0", -0)
    await Util.assertions.decoding.succeed(schema, "1", 1)
    await Util.assertions.decoding.succeed(schema, "1.2", 1.2)

    await Util.assertions.decoding.succeed(schema, "NaN", NaN)
    await Util.assertions.decoding.succeed(schema, "Infinity", Infinity)
    await Util.assertions.decoding.succeed(schema, "-Infinity", -Infinity)

    await Util.assertions.decoding.fail(
      schema,
      "",
      `NumberFromString
└─ Transformation process failure
   └─ Unable to decode "" into a number`
    )
    await Util.assertions.decoding.fail(
      schema,
      " ",
      `NumberFromString
└─ Transformation process failure
   └─ Unable to decode " " into a number`
    )
    await Util.assertions.decoding.fail(
      schema,
      "1AB",
      `NumberFromString
└─ Transformation process failure
   └─ Unable to decode "1AB" into a number`
    )
    await Util.assertions.decoding.fail(
      schema,
      "AB1",
      `NumberFromString
└─ Transformation process failure
   └─ Unable to decode "AB1" into a number`
    )
    await Util.assertions.decoding.fail(
      schema,
      "a",
      `NumberFromString
└─ Transformation process failure
   └─ Unable to decode "a" into a number`
    )
    await Util.assertions.decoding.fail(
      schema,
      "a1",
      `NumberFromString
└─ Transformation process failure
   └─ Unable to decode "a1" into a number`
    )
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(schema, 1, "1")
  })
})
