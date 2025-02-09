import * as DateTime from "effect/DateTime"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("DateTimeUtcFromDate", () => {
  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(S.DateTimeUtcFromDate, new Date(0), DateTime.unsafeMake(0))
    await Util.expectDecodeUnknownSuccess(
      S.DateTimeUtcFromDate,
      new Date("2024-12-06T00:00:00Z"),
      DateTime.unsafeMake({ day: 6, month: 12, year: 2024, hour: 0, minute: 0, second: 0, millisecond: 0 })
    )

    await Util.expectDecodeUnknownFailure(
      S.DateTimeUtcFromDate,
      null,
      `DateTimeUtcFromDate
└─ Encoded side transformation failure
   └─ Expected DateFromSelf, actual null`
    )
    await Util.expectDecodeUnknownFailure(
      S.DateTimeUtcFromDate,
      new Date(NaN),
      `DateTimeUtcFromDate
└─ Transformation process failure
   └─ Expected DateTimeUtcFromDate, actual Invalid Date`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(S.DateTimeUtcFromDate, DateTime.unsafeMake(0), new Date(0))
    expect(
      S.encodeSync(S.DateTimeUtcFromDate)(
        DateTime.unsafeMake({ day: 6, month: 12, year: 2024, hour: 0, minute: 0, second: 0, millisecond: 0 })
      )
    ).toStrictEqual(new Date("2024-12-06T00:00:00Z"))
  })
})
