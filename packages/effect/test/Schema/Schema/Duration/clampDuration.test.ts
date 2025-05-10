import { describe, it } from "@effect/vitest"
import { Duration } from "effect"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("clampDuration", () => {
  it("decoding", async () => {
    const schema = S.DurationFromSelf.pipe(S.clampDuration("5 seconds", "10 seconds"))

    await Util.assertions.decoding.succeed(
      schema,
      Duration.decode("1 seconds"),
      Duration.decode("5 seconds")
    )

    await Util.assertions.decoding.succeed(
      schema,
      Duration.decode("6 seconds"),
      Duration.decode("6 seconds")
    )

    await Util.assertions.decoding.succeed(
      schema,
      Duration.decode("11 seconds"),
      Duration.decode("10 seconds")
    )
  })
})
