import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue } from "@effect/vitest/utils"
import * as P from "effect/ParseResult"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("ReadonlySetFromSelf", () => {
  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(S.ReadonlySetFromSelf(S.Number))
  })

  it("decoding", async () => {
    const schema = S.ReadonlySetFromSelf(S.NumberFromString)
    await Util.assertions.decoding.succeed(schema, new Set(), new Set())
    await Util.assertions.decoding.succeed(schema, new Set(["1", "2", "3"]), new Set([1, 2, 3]))

    await Util.assertions.decoding.fail(
      schema,
      null,
      `Expected ReadonlySet<NumberFromString>, actual null`
    )
    await Util.assertions.decoding.fail(
      schema,
      new Set(["1", "a", "3"]),
      `ReadonlySet<NumberFromString>
└─ ReadonlyArray<NumberFromString>
   └─ [1]
      └─ NumberFromString
         └─ Transformation process failure
            └─ Unable to decode "a" into a number`
    )
  })

  it("encoding", async () => {
    const schema = S.ReadonlySetFromSelf(S.NumberFromString)
    await Util.assertions.encoding.succeed(schema, new Set(), new Set())
    await Util.assertions.encoding.succeed(schema, new Set([1, 2, 3]), new Set(["1", "2", "3"]))
  })

  it("is", () => {
    const schema = S.ReadonlySetFromSelf(S.String)
    const is = P.is(schema)
    assertTrue(is(new Set()))
    assertTrue(is(new Set(["a", "b", "c"])))

    assertFalse(is(new Set(["a", "b", 1])))
    assertFalse(is(null))
    assertFalse(is(undefined))
  })

  it("pretty", () => {
    const schema = S.ReadonlySetFromSelf(S.String)
    Util.assertions.pretty(schema, new Set(), "new Set([])")
    Util.assertions.pretty(schema, new Set(["a", "b"]), `new Set(["a", "b"])`)
  })
})
