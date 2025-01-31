import { describe, it } from "@effect/vitest"
import * as DateTime from "effect/DateTime"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { deepStrictEqual } from "effect/test/util"

describe("DateTimeUtcFromDate", () => {
  const schema = S.DateTimeUtcFromDate

  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(schema)
  })

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(schema, new Date(0), DateTime.unsafeMake(0))
    await Util.assertions.decoding.succeed(
      schema,
      new Date("2024-12-06T00:00:00Z"),
      DateTime.unsafeMake({ day: 6, month: 12, year: 2024, hour: 0, minute: 0, second: 0, millisecond: 0 })
    )

    await Util.assertions.decoding.fail(
      schema,
      null,
      `DateTimeUtcFromDate
└─ Encoded side transformation failure
   └─ Expected DateFromSelf, actual null`
    )
    await Util.assertions.decoding.fail(
      schema,
      new Date(NaN),
      `DateTimeUtcFromDate
└─ Transformation process failure
   └─ Unable to decode Invalid Date into a DateTime.Utc`
    )
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(schema, DateTime.unsafeMake(0), new Date(0))
    deepStrictEqual(
      S.encodeSync(schema)(
        DateTime.unsafeMake({ day: 6, month: 12, year: 2024, hour: 0, minute: 0, second: 0, millisecond: 0 })
      ),
      new Date("2024-12-06T00:00:00Z")
    )
  })
})
