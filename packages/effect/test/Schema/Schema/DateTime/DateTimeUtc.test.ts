import { describe, it } from "@effect/vitest"
import { DateTime } from "effect"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("DateTimeUtc", () => {
  const schema = S.DateTimeUtc

  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(schema)
  })

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(
      schema,
      "1970-01-01T00:00:00.000Z",
      DateTime.unsafeMake(0)
    )
    await Util.assertions.decoding.fail(
      schema,
      "a",
      `DateTimeUtc
└─ Transformation process failure
   └─ Unable to decode "a" into a DateTime.Utc`
    )
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(schema, DateTime.unsafeMake(0), "1970-01-01T00:00:00.000Z")
  })
})
