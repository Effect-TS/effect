import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import * as Cause from "effect/Cause"
import * as FiberId from "effect/FiberId"
import { describe, expect, it } from "vitest"

describe("Cause/causeFromSelf", () => {
  it("property tests", () => {
    Util.roundtrip(S.causeFromSelf(S.NumberFromString))
  })

  it("decoding", async () => {
    const schema = S.causeFromSelf(S.NumberFromString)

    await Util.expectParseSuccess(schema, Cause.fail("1"), Cause.fail(1))

    await Util.expectParseFailure(schema, null, `Expected Cause, actual null`)
    await Util.expectParseFailure(
      schema,
      Cause.fail("a"),
      `union member: /error Expected string <-> number, actual "a"`
    )
    await Util.expectParseFailure(
      schema,
      Cause.parallel(Cause.die("error"), Cause.fail("a")),
      `union member: /right union member: /error Expected string <-> number, actual "a"`
    )
  })

  it("encoding", async () => {
    const schema = S.causeFromSelf(S.NumberFromString)

    await Util.expectEncodeSuccess(schema, Cause.fail(1), Cause.fail("1"))
  })

  it("pretty", () => {
    const schema = S.causeFromSelf(S.string)
    const pretty = Pretty.to(schema)
    expect(pretty(Cause.die("error"))).toEqual(`Cause.die(Error: error)`)
    expect(pretty(Cause.empty)).toEqual(`Cause.empty`)
    expect(pretty(Cause.fail("error"))).toEqual(`Cause.fail("error")`)
    expect(pretty(Cause.interrupt(FiberId.composite(FiberId.none, FiberId.none)))).toEqual(
      `Cause.interrupt(FiberId.composite(FiberId.none, FiberId.none))`
    )
    expect(pretty(Cause.parallel(Cause.die("error"), Cause.fail("error")))).toEqual(
      `Cause.parallel(Cause.die(Error: error), Cause.fail("error"))`
    )
    expect(pretty(Cause.sequential(Cause.die("error"), Cause.fail("error")))).toEqual(
      `Cause.sequential(Cause.die(Error: error), Cause.fail("error"))`
    )
  })
})
