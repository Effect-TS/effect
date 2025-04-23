import { describe, it } from "@effect/vitest"
import { Duration } from "effect"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("betweenDuration", () => {
  const schema = S.DurationFromSelf.pipe(
    S.betweenDuration("5 seconds", "10 seconds")
  ).annotations({ title: "[5 seconds, 10 seconds] interval" })

  it("decoding", async () => {
    await Util.assertions.decoding.fail(
      schema,
      Duration.decode("4 seconds"),
      `[5 seconds, 10 seconds] interval
└─ Predicate refinement failure
   └─ Expected a Duration between Duration(5s) and Duration(10s), actual Duration(4s)`
    )

    await Util.assertions.decoding.succeed(
      schema,
      Duration.decode("7 seconds"),
      Duration.decode("7 seconds")
    )

    await Util.assertions.decoding.fail(
      schema,
      Duration.decode("11 seconds"),
      `[5 seconds, 10 seconds] interval
└─ Predicate refinement failure
   └─ Expected a Duration between Duration(5s) and Duration(10s), actual Duration(11s)`
    )
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(
      schema,
      Duration.decode("7 seconds"),
      Duration.decode("7 seconds")
    )
  })
})
