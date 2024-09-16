import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { describe, it } from "vitest"

describe("greaterThanOrEqualToDate", () => {
  const schema = S.DateFromSelf.pipe(S.greaterThanOrEqualToDate(new Date(0)))

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(
      schema,
      new Date(1)
    )
    await Util.expectDecodeUnknownSuccess(
      schema,
      new Date(0)
    )

    await Util.expectDecodeUnknownFailure(
      schema,
      new Date(-1),
      `a date after or equal to 1970-01-01T00:00:00.000Z
└─ Predicate refinement failure
   └─ Expected a date after or equal to 1970-01-01T00:00:00.000Z, actual 1969-12-31T23:59:59.999Z`
    )
  })
})
