import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue } from "@effect/vitest/utils"
import * as List from "effect/List"
import * as P from "effect/ParseResult"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("ListFromSelf", () => {
  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(S.ListFromSelf(S.Number))
  })

  it("decoding", async () => {
    const schema = S.ListFromSelf(S.NumberFromString)
    await Util.assertions.decoding.succeed(schema, List.empty(), List.empty())
    await Util.assertions.decoding.succeed(
      schema,
      List.fromIterable(["1", "2", "3"]),
      List.fromIterable([1, 2, 3])
    )

    await Util.assertions.decoding.fail(
      schema,
      null,
      `Expected List<NumberFromString>, actual null`
    )
    await Util.assertions.decoding.fail(
      schema,
      List.fromIterable(["1", "a", "3"]),
      `List<NumberFromString>
└─ ReadonlyArray<NumberFromString>
   └─ [1]
      └─ NumberFromString
         └─ Transformation process failure
            └─ Unable to decode "a" into a number`
    )
  })

  it("encoding", async () => {
    const schema = S.ListFromSelf(S.NumberFromString)
    await Util.assertions.encoding.succeed(schema, List.empty(), List.empty())
    await Util.assertions.encoding.succeed(
      schema,
      List.fromIterable([1, 2, 3]),
      List.fromIterable(["1", "2", "3"])
    )
  })

  it("is", () => {
    const schema = S.ListFromSelf(S.String)
    const is = P.is(schema)
    assertTrue(is(List.empty()))
    assertTrue(is(List.fromIterable(["a", "b", "c"])))

    assertFalse(is(List.fromIterable(["a", "b", 1])))
    assertFalse(is({ _id: Symbol.for("effect/Schema/test/FakeList") }))
  })

  it("pretty", () => {
    const schema = S.ListFromSelf(S.String)
    Util.assertions.pretty(schema, List.empty(), "List()")
    Util.assertions.pretty(schema, List.fromIterable(["a", "b"]), `List("a", "b")`)
  })
})
