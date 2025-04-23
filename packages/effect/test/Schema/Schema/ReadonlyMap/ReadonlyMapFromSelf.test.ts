import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue } from "@effect/vitest/utils"
import * as P from "effect/ParseResult"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("ReadonlyMapFromSelf", () => {
  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(S.ReadonlyMapFromSelf({ key: S.Number, value: S.String }))
  })

  it("decoding", async () => {
    const schema = S.ReadonlyMapFromSelf({ key: S.NumberFromString, value: S.String })
    await Util.assertions.decoding.succeed(schema, new Map(), new Map())
    await Util.assertions.decoding.succeed(
      schema,
      new Map([["1", "a"], ["2", "b"], ["3", "c"]]),
      new Map([[1, "a"], [2, "b"], [3, "c"]])
    )

    await Util.assertions.decoding.fail(
      schema,
      null,
      `Expected ReadonlyMap<NumberFromString, string>, actual null`
    )
    await Util.assertions.decoding.fail(
      schema,
      new Map([["1", "a"], ["a", "b"]]),
      `ReadonlyMap<NumberFromString, string>
└─ ReadonlyArray<readonly [NumberFromString, string]>
   └─ [1]
      └─ readonly [NumberFromString, string]
         └─ [0]
            └─ NumberFromString
               └─ Transformation process failure
                  └─ Unable to decode "a" into a number`
    )
  })

  it("encoding", async () => {
    const schema = S.ReadonlyMapFromSelf({ key: S.NumberFromString, value: S.String })
    await Util.assertions.encoding.succeed(schema, new Map(), new Map())
    await Util.assertions.encoding.succeed(
      schema,
      new Map([[1, "a"], [2, "b"], [3, "c"]]),
      new Map([["1", "a"], ["2", "b"], ["3", "c"]])
    )
  })

  it("is", () => {
    const schema = S.ReadonlyMapFromSelf({ key: S.Number, value: S.String })
    const is = P.is(schema)
    assertTrue(is(new Map()))
    assertTrue(is(new Map([[1, "a"], [2, "b"], [3, "c"]])))

    assertFalse(is(null))
    assertFalse(is(undefined))
    assertFalse(is(new Map<number, string | number>([[1, "a"], [2, 1]])))
    assertFalse(is(new Map<number, string | number>([[1, 1], [2, "b"]])))
    assertFalse(is(new Map([[1, 1], [2, 2]])))
    assertFalse(is(new Map<string | number, number>([["a", 1], ["b", 2], [3, 1]])))
    assertFalse(is(new Map<number, string | number>([[1, "a"], [2, "b"], [3, 1]])))
  })

  it("pretty", () => {
    const schema = S.ReadonlyMapFromSelf({ key: S.Number, value: S.String })
    Util.assertions.pretty(schema, new Map(), "new Map([])")
    Util.assertions.pretty(schema, new Map([[1, "a"], [2, "b"]]), `new Map([[1, "a"], [2, "b"]])`)
  })
})
