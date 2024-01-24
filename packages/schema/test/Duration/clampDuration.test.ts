import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { Duration } from "effect"
import { describe, it } from "vitest"

describe("Duration > clampDuration", () => {
  it("decoding", async () => {
    const schema = S.DurationFromSelf.pipe(S.clampDuration("5 seconds", "10 seconds"))

    await Util.expectDecodeUnknownSuccess(
      schema,
      Duration.decode("1 seconds"),
      Duration.decode("5 seconds")
    )

    await Util.expectDecodeUnknownSuccess(
      schema,
      Duration.decode("6 seconds"),
      Duration.decode("6 seconds")
    )

    await Util.expectDecodeUnknownSuccess(
      schema,
      Duration.decode("11 seconds"),
      Duration.decode("10 seconds")
    )
  })
})
