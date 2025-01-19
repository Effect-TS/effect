import * as Option from "effect/Option"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("head", () => {
  it("decoding", async () => {
    const schema = S.head(S.Array(S.NumberFromString))
    await Util.assertions.decoding.succeed(schema, [], Option.none())
    await Util.assertions.decoding.succeed(schema, ["1"], Option.some(1))
    await Util.assertions.decoding.fail(
      schema,
      ["a"],
      `(ReadonlyArray<NumberFromString> <-> Option<number>)
└─ Encoded side transformation failure
   └─ ReadonlyArray<NumberFromString>
      └─ [0]
         └─ NumberFromString
            └─ Transformation process failure
               └─ Unable to decode "a" into a number`
    )
  })

  it("encoding", async () => {
    const schema = S.head(S.Array(S.NumberFromString))
    await Util.expectEncodeSuccess(schema, Option.none(), [])
    await Util.expectEncodeSuccess(schema, Option.some(1), ["1"])
  })
})
