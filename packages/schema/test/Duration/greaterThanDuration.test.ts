import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { Duration } from "effect"
import { describe, it } from "vitest"

describe("Schema/greaterThanDuration", () => {
  const schema = S.DurationFromSelf.pipe(S.greaterThanDuration("5 seconds"))

  it("decoding", async () => {
    await Util.expectParseSuccess(
      schema,
      Duration.decode("6 seconds"),
      Duration.decode("6 seconds")
    )

    await Util.expectParseFailure(
      schema,
      Duration.decode("5 seconds"),
      `Expected a Duration greater than Duration(5s), actual Duration(5s)`
    )

    await Util.expectParseFailure(
      schema,
      Duration.decode("4 seconds"),
      `Expected a Duration greater than Duration(5s), actual Duration(4s)`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(
      schema,
      Duration.decode("6 seconds"),
      Duration.decode("6 seconds")
    )
  })
})
