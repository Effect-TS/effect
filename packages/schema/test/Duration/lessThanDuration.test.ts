import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { Duration } from "effect"
import { describe, it } from "vitest"

describe("Schema/lessThanDuration", () => {
  const schema = S.DurationFromSelf.pipe(S.lessThanDuration("5 seconds"))

  it("decoding", async () => {
    await Util.expectParseSuccess(
      schema,
      Duration.decode("4 seconds"),
      Duration.decode("4 seconds")
    )

    await Util.expectParseFailure(
      schema,
      Duration.decode("5 seconds"),
      `Expected a Duration less than Duration(5s), actual Duration(5s)`
    )

    await Util.expectParseFailure(
      schema,
      Duration.decode("6 seconds"),
      `Expected a Duration less than Duration(5s), actual Duration(6s)`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(
      schema,
      Duration.decode("4 seconds"),
      Duration.decode("4 seconds")
    )
  })
})
