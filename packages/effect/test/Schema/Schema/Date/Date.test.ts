import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("Date", () => {
  const schema = S.Date

  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(schema)
  })

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(
      schema,
      "1970-01-01T00:00:00.000Z",
      new Date(0)
    )
    await Util.assertions.decoding.fail(
      schema,
      "a",
      `Date
└─ Predicate refinement failure
   └─ Expected a valid Date, actual Invalid Date`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, new Date(0), "1970-01-01T00:00:00.000Z")
    await Util.expectEncodeFailure(
      schema,
      new Date("fail"),
      `Date
└─ Predicate refinement failure
   └─ Expected a valid Date, actual Invalid Date`
    )
  })
})
