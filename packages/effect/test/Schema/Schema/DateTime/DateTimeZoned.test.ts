import { describe, it } from "@effect/vitest"
import { DateTime } from "effect"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("DateTimeZoned", () => {
  const schema = S.DateTimeZoned
  const dt = DateTime.unsafeMakeZoned(0, { timeZone: "Europe/London" })

  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(schema)
  })

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(schema, "1970-01-01T01:00:00.000+01:00[Europe/London]", dt)
    await Util.assertions.decoding.fail(
      schema,
      "1970-01-01T00:00:00.000Z",
      `DateTimeZoned
└─ Transformation process failure
   └─ Unable to decode "1970-01-01T00:00:00.000Z" into a DateTime.Zoned`
    )
    await Util.assertions.decoding.fail(
      schema,
      "a",
      `DateTimeZoned
└─ Transformation process failure
   └─ Unable to decode "a" into a DateTime.Zoned`
    )
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(schema, dt, "1970-01-01T01:00:00.000+01:00[Europe/London]")
  })
})
