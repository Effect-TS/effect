import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

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
    await Util.assertions.encoding.succeed(schema, new Date(0), "1970-01-01T00:00:00.000Z")
    await Util.assertions.encoding.fail(
      schema,
      new Date("fail"),
      `Date
└─ Predicate refinement failure
   └─ Expected a valid Date, actual Invalid Date`
    )
  })
})
