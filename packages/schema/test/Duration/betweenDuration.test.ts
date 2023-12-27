import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { Duration } from "effect"
import { describe, it } from "vitest"

describe("Schema/betweenDuration", () => {
  const schema = S.DurationFromSelf.pipe(S.betweenDuration("5 seconds", "10 seconds"))

  it("decoding", async () => {
    await Util.expectParseFailure(
      schema,
      Duration.decode("4 seconds"),
      `Expected a Duration between Duration(5s) and Duration(10s), actual Duration(4s)`
    )

    await Util.expectParseSuccess(
      schema,
      Duration.decode("7 seconds"),
      Duration.decode("7 seconds")
    )

    await Util.expectParseFailure(
      schema,
      Duration.decode("11 seconds"),
      `Expected a Duration between Duration(5s) and Duration(10s), actual Duration(11s)`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(
      schema,
      Duration.decode("7 seconds"),
      Duration.decode("7 seconds")
    )
  })
})
