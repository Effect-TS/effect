import * as DateTime from "effect/DateTime"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("DateTimeZonedFromDate", () => {
  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(S.DateTimeZonedFromDate, new Date(0), DateTime.unsafeMakeZoned(0))
    await Util.expectDecodeUnknownSuccess(
      S.DateTimeZonedFromDate,
      new Date("2024-12-06T00:00:00Z"),
      DateTime.unsafeMakeZoned({ day: 6, month: 12, year: 2024 })
    )

    await Util.expectDecodeUnknownFailure(
      S.DateTimeZonedFromDate,
      null,
      `DateTimeZonedFromDate
└─ Encoded side transformation failure
   └─ ValidDateFromSelf
      └─ From side refinement failure
         └─ Expected DateFromSelf, actual null`
    )
    await Util.expectDecodeUnknownFailure(
      S.DateTimeZonedFromDate,
      new Date(NaN),
      `DateTimeZonedFromDate
└─ Encoded side transformation failure
   └─ ValidDateFromSelf
      └─ Predicate refinement failure
         └─ Expected ValidDateFromSelf, actual Invalid Date`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(S.DateTimeZonedFromDate, DateTime.unsafeMakeZoned(0), new Date(0))
    expect(
      S.encodeSync(S.DateTimeZonedFromDate)(
        DateTime.unsafeMakeZoned({ day: 6, month: 12, year: 2024 })
      )
    ).toStrictEqual(new Date("2024-12-06T00:00:00Z"))
  })
})
