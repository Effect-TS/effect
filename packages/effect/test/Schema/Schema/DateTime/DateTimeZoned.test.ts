import { DateTime } from "effect"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("DateTimeZoned", () => {
  const schema = S.DateTimeZoned
  const dt = DateTime.unsafeMakeZoned(0, { timeZone: "Europe/London" })

  it("property tests", () => {
    Util.roundtrip(schema)
  })

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(schema, "1970-01-01T01:00:00.000+01:00[Europe/London]", dt)
    await Util.expectDecodeUnknownFailure(
      schema,
      "1970-01-01T00:00:00.000Z",
      `DateTimeZoned
└─ Transformation process failure
   └─ Unable to decode "1970-01-01T00:00:00.000Z" into a DateTime.Zoned`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "a",
      `DateTimeZoned
└─ Transformation process failure
   └─ Unable to decode "a" into a DateTime.Zoned`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, dt, "1970-01-01T01:00:00.000+01:00[Europe/London]")
  })
})
