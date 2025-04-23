import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("headNonEmpty", () => {
  it("decoding", async () => {
    const schema = S.headNonEmpty(S.NonEmptyArray(S.NumberFromString))
    await Util.assertions.decoding.succeed(schema, ["1"], 1)
    await Util.assertions.decoding.fail(
      schema,
      ["a"],
      `(readonly [NumberFromString, ...NumberFromString[]] <-> number | number)
└─ Encoded side transformation failure
   └─ readonly [NumberFromString, ...NumberFromString[]]
      └─ [0]
         └─ NumberFromString
            └─ Transformation process failure
               └─ Unable to decode "a" into a number`
    )
  })

  it("encoding", async () => {
    const schema = S.headNonEmpty(S.NonEmptyArray(S.NumberFromString))
    await Util.assertions.encoding.succeed(schema, 1, ["1"])
  })
})
