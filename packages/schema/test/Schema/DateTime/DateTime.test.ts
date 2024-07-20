import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { DateTime } from "effect"
import { describe, it } from "vitest"

describe("DateTime.Utc", () => {
  const schema = S.DateTimeUtc

  it("property tests", () => {
    Util.roundtrip(schema)
  })

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(
      schema,
      "1970-01-01T00:00:00.000Z",
      DateTime.unsafeMake(0)
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "a",
      `DateTime.Utc
└─ Transformation process failure
   └─ Expected DateTime.Utc, actual "a"`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, DateTime.unsafeMake(0), "1970-01-01T00:00:00.000Z")
  })
})

describe("DateTime.Zoned", () => {
  const schema = S.DateTimeZoned
  const dt = DateTime.unsafeMakeZoned(0, "Europe/London")

  it("property tests", () => {
    Util.roundtrip(schema)
  })

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(schema, "1970-01-01T00:00:00.000Z Europe/London", dt)
    await Util.expectDecodeUnknownFailure(
      schema,
      "1970-01-01T00:00:00.000Z",
      `DateTime.Zoned
└─ Transformation process failure
   └─ Expected DateTime.Zoned, actual "1970-01-01T00:00:00.000Z"`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "a",
      `DateTime.Zoned
└─ Transformation process failure
   └─ Expected DateTime.Zoned, actual "a"`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, dt, "1970-01-01T00:00:00.000Z Europe/London")
  })
})
