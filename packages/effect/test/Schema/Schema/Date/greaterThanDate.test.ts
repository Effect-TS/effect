import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("greaterThanDate", () => {
  const schema = S.DateFromSelf.pipe(S.greaterThanDate(new Date(0)))

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(
      schema,
      new Date(1)
    )

    await Util.assertions.decoding.fail(
      schema,
      new Date(0),
      `greaterThanDate(1970-01-01T00:00:00.000Z)
└─ Predicate refinement failure
   └─ Expected a date after 1970-01-01T00:00:00.000Z, actual 1970-01-01T00:00:00.000Z`
    )
    await Util.assertions.decoding.fail(
      schema,
      new Date(-1),
      `greaterThanDate(1970-01-01T00:00:00.000Z)
└─ Predicate refinement failure
   └─ Expected a date after 1970-01-01T00:00:00.000Z, actual 1969-12-31T23:59:59.999Z`
    )
  })
})
