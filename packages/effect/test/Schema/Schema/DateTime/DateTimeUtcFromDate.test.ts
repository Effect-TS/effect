import * as DateTime from "effect/DateTime"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("DateTimeUtcFromDate", () => {
  const schema = S.DateTimeUtcFromDate

  it("property tests", () => {
    Util.roundtrip(schema)
  })

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(schema, new Date(0), DateTime.unsafeMake(0))
    await Util.expectDecodeUnknownSuccess(
      schema,
      new Date("2024-12-06T00:00:00Z"),
      DateTime.unsafeMake({ day: 6, month: 12, year: 2024, hour: 0, minute: 0, second: 0, millisecond: 0 })
    )

    await Util.expectDecodeUnknownFailure(
      schema,
      null,
      `DateTimeUtcFromDate
└─ Encoded side transformation failure
   └─ Expected DateFromSelf, actual null`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      new Date(NaN),
      `DateTimeUtcFromDate
└─ Transformation process failure
   └─ Unable to decode Invalid Date into a DateTime.Utc`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, DateTime.unsafeMake(0), new Date(0))
    expect(
      S.encodeSync(schema)(
        DateTime.unsafeMake({ day: 6, month: 12, year: 2024, hour: 0, minute: 0, second: 0, millisecond: 0 })
      )
    ).toStrictEqual(new Date("2024-12-06T00:00:00Z"))
  })
})
