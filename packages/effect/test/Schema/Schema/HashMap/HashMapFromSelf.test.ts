import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue } from "@effect/vitest/utils"
import * as HashMap from "effect/HashMap"
import * as P from "effect/ParseResult"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("HashMapFromSelf", () => {
  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(S.HashMapFromSelf({ key: S.Number, value: S.String }))
  })

  it("decoding", async () => {
    const schema = S.HashMapFromSelf({ key: S.NumberFromString, value: S.String })
    await Util.assertions.decoding.succeed(schema, HashMap.fromIterable([]))
    await Util.assertions.decoding.succeed(
      schema,
      HashMap.fromIterable([["1", "a"], ["2", "b"], ["3", "c"]]),
      HashMap.fromIterable([[1, "a"], [2, "b"], [3, "c"]])
    )

    await Util.assertions.decoding.fail(
      schema,
      null,
      `Expected HashMap<NumberFromString, string>, actual null`
    )
    await Util.assertions.decoding.fail(
      schema,
      HashMap.fromIterable([["1", "a"], ["a", "b"]]),
      `HashMap<NumberFromString, string>
└─ ReadonlyArray<readonly [NumberFromString, string]>
   └─ [0]
      └─ readonly [NumberFromString, string]
         └─ [0]
            └─ NumberFromString
               └─ Transformation process failure
                  └─ Unable to decode "a" into a number`
    )
  })

  it("encoding", async () => {
    const schema = S.HashMapFromSelf({ key: S.NumberFromString, value: S.String })
    await Util.assertions.encoding.succeed(schema, HashMap.fromIterable([]), HashMap.fromIterable([]))
    await Util.assertions.encoding.succeed(
      schema,
      HashMap.fromIterable([[1, "a"], [2, "b"], [3, "c"]]),
      HashMap.fromIterable([["1", "a"], ["2", "b"], ["3", "c"]])
    )
  })

  it("is", () => {
    const schema = S.HashMapFromSelf({ key: S.Number, value: S.String })
    const is = P.is(schema)
    assertTrue(is(HashMap.fromIterable([])))
    assertTrue(is(HashMap.fromIterable([[1, "a"], [2, "b"], [3, "c"]])))

    assertFalse(is(null))
    assertFalse(is(undefined))
    assertFalse(is(HashMap.fromIterable<number, string | number>([[1, "a"], [2, 1]])))
    assertFalse(is(HashMap.fromIterable<number, string | number>([[1, 1], [2, "b"]])))
    assertFalse(is(HashMap.fromIterable([[1, 1], [2, 2]])))
    assertFalse(is(HashMap.fromIterable<string | number, number>([["a", 1], ["b", 2], [3, 1]])))
    assertFalse(is(HashMap.fromIterable<number, string | number>([[1, "a"], [2, "b"], [3, 1]])))
  })

  it("pretty", () => {
    const schema = S.HashMapFromSelf({ key: S.Number, value: S.String })
    Util.assertions.pretty(schema, HashMap.fromIterable([]), "HashMap([])")
    Util.assertions.pretty(schema, HashMap.fromIterable([[1, "a"], [2, "b"]]), `HashMap([[1, "a"], [2, "b"]])`)
  })
})
