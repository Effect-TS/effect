import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import * as Cause from "effect/Cause"
import * as FiberId from "effect/FiberId"
import { describe, expect, it } from "vitest"

describe("CauseFromSelf", () => {
  it("arbitrary", () => {
    Util.expectArbitrary(S.CauseFromSelf({ error: S.NumberFromString }))
  })

  it("property tests", () => {
    Util.roundtrip(S.CauseFromSelf({ error: S.NumberFromString }))
  })

  it("decoding", async () => {
    const schema = S.CauseFromSelf({ error: S.NumberFromString })

    await Util.expectDecodeUnknownSuccess(schema, Cause.fail("1"), Cause.fail(1))

    await Util.expectDecodeUnknownFailure(
      schema,
      null,
      `Expected Cause<NumberFromString>, actual null`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      Cause.fail("a"),
      `Cause<NumberFromString>
└─ CauseEncoded<NumberFromString>
   └─ Union member
      └─ { _tag: "Fail"; error: NumberFromString }
         └─ ["error"]
            └─ NumberFromString
               └─ Transformation process failure
                  └─ Expected NumberFromString, actual "a"`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      Cause.parallel(Cause.die("error"), Cause.fail("a")),
      `Cause<NumberFromString>
└─ CauseEncoded<NumberFromString>
   └─ Union member
      └─ { _tag: "Parallel"; left: CauseEncoded<NumberFromString>; right: CauseEncoded<NumberFromString> }
         └─ ["right"]
            └─ CauseEncoded<NumberFromString>
               └─ Union member
                  └─ { _tag: "Fail"; error: NumberFromString }
                     └─ ["error"]
                        └─ NumberFromString
                           └─ Transformation process failure
                              └─ Expected NumberFromString, actual "a"`
    )
  })

  it("encoding", async () => {
    const schema = S.CauseFromSelf({ error: S.NumberFromString })

    await Util.expectEncodeSuccess(schema, Cause.fail(1), Cause.fail("1"))
  })

  it("pretty", () => {
    const schema = S.CauseFromSelf({ error: S.String })
    const pretty = Pretty.make(schema)
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
