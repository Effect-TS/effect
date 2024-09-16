import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { describe, it } from "vitest"

describe("betweenDate", () => {
  const schema = S.DateFromSelf.pipe(S.betweenDate(new Date(-1), new Date(1)))

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(
      schema,
      new Date(-1)
    )
    await Util.expectDecodeUnknownSuccess(
      schema,
      new Date(0)
    )
    await Util.expectDecodeUnknownSuccess(
      schema,
      new Date(1)
    )

    await Util.expectDecodeUnknownFailure(
      schema,
      new Date(-2),
      `a date between 1969-12-31T23:59:59.999Z and 1970-01-01T00:00:00.001Z
└─ Predicate refinement failure
   └─ Expected a date between 1969-12-31T23:59:59.999Z and 1970-01-01T00:00:00.001Z, actual 1969-12-31T23:59:59.998Z`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      new Date(2),
      `a date between 1969-12-31T23:59:59.999Z and 1970-01-01T00:00:00.001Z
└─ Predicate refinement failure
   └─ Expected a date between 1969-12-31T23:59:59.999Z and 1970-01-01T00:00:00.001Z, actual 1970-01-01T00:00:00.002Z`
    )
  })
})
