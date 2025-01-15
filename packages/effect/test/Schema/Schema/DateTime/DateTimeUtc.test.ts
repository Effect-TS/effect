import { DateTime } from "effect"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("DateTimeUtc", () => {
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
      `DateTimeUtc
└─ Transformation process failure
   └─ Unable to decode "a" into a DateTime.Utc`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, DateTime.unsafeMake(0), "1970-01-01T00:00:00.000Z")
  })
})
