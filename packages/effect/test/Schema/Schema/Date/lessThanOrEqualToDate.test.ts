import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("lessThanOrEqualToDate", () => {
  const schema = S.DateFromSelf.pipe(S.lessThanOrEqualToDate(new Date(0)))

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(
      schema,
      new Date(-1)
    )
    await Util.assertions.decoding.succeed(
      schema,
      new Date(0)
    )

    await Util.assertions.decoding.fail(
      schema,
      new Date(1),
      `lessThanOrEqualToDate(1970-01-01T00:00:00.000Z)
└─ Predicate refinement failure
   └─ Expected a date before or equal to 1970-01-01T00:00:00.000Z, actual 1970-01-01T00:00:00.001Z`
    )
  })
})
