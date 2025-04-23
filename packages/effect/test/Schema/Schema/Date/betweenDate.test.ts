import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("betweenDate", () => {
  const schema = S.DateFromSelf.pipe(S.betweenDate(new Date(-1), new Date(1)))

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(
      schema,
      new Date(-1)
    )
    await Util.assertions.decoding.succeed(
      schema,
      new Date(0)
    )
    await Util.assertions.decoding.succeed(
      schema,
      new Date(1)
    )

    await Util.assertions.decoding.fail(
      schema,
      new Date(-2),
      `betweenDate(1969-12-31T23:59:59.999Z, 1970-01-01T00:00:00.001Z)
└─ Predicate refinement failure
   └─ Expected a date between 1969-12-31T23:59:59.999Z and 1970-01-01T00:00:00.001Z, actual 1969-12-31T23:59:59.998Z`
    )
    await Util.assertions.decoding.fail(
      schema,
      new Date(2),
      `betweenDate(1969-12-31T23:59:59.999Z, 1970-01-01T00:00:00.001Z)
└─ Predicate refinement failure
   └─ Expected a date between 1969-12-31T23:59:59.999Z and 1970-01-01T00:00:00.001Z, actual 1970-01-01T00:00:00.002Z`
    )
  })
})
