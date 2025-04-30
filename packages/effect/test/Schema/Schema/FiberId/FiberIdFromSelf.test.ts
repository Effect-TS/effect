import { describe, it } from "@effect/vitest"
import * as FiberId from "effect/FiberId"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("FiberIdFromSelf", () => {
  it("arbitrary", () => {
    Util.assertions.arbitrary.validateGeneratedValues(S.FiberIdFromSelf)
  })

  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(S.FiberIdFromSelf)
  })

  it("decoding", async () => {
    const schema = S.FiberIdFromSelf

    await Util.assertions.decoding.succeed(schema, FiberId.none)
    await Util.assertions.decoding.succeed(schema, FiberId.runtime(1, 100))
    await Util.assertions.decoding.succeed(schema, FiberId.composite(FiberId.none, FiberId.none))

    await Util.assertions.decoding.fail(
      schema,
      null,
      `Expected FiberIdFromSelf, actual null`
    )
  })

  it("pretty", () => {
    const schema = S.FiberIdFromSelf
    Util.assertions.pretty(schema, FiberId.none, `FiberId.none`)
    Util.assertions.pretty(schema, FiberId.runtime(1, 100), `FiberId.runtime(1, 100)`)
    Util.assertions.pretty(
      schema,
      FiberId.composite(FiberId.none, FiberId.none),
      `FiberId.composite(FiberId.none, FiberId.none)`
    )
  })
})
