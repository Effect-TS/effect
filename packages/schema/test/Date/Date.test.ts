import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("Date > Date", () => {
  const schema = S.Date

  it("property tests", () => {
    Util.roundtrip(schema)
  })

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(
      schema,
      "1970-01-01T00:00:00.000Z",
      new Date(0)
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "a",
      `Date
└─ Predicate refinement failure
   └─ Expected Date (a valid Date), actual Invalid Date`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, new Date(0), "1970-01-01T00:00:00.000Z")
    await Util.expectEncodeFailure(
      schema,
      new Date("fail"),
      `Date
└─ Predicate refinement failure
   └─ Expected Date (a valid Date), actual Invalid Date`
    )
  })
})
