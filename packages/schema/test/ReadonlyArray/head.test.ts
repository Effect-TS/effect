import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import * as Option from "effect/Option"
import { describe, it } from "vitest"

describe("ReadonlyArray > head", () => {
  it("decoding", async () => {
    const schema = S.head(S.number)
    await Util.expectParseSuccess(schema, [], Option.none())
    await Util.expectParseSuccess(schema, [1], Option.some(1))
    await Util.expectParseFailure(
      schema,
      ["a"],
      `(ReadonlyArray<number> <-> Option<number>)
└─ From side transformation failure
   └─ ReadonlyArray<number>
      └─ [0]
         └─ Expected a number, actual "a"`
    )
  })

  it("encoding", async () => {
    const schema = S.head(S.number)
    await Util.expectEncodeSuccess(schema, Option.none(), [])
    await Util.expectEncodeSuccess(schema, Option.some(1), [1])
  })
})
