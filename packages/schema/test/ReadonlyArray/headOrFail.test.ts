import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("ReadonlyArray > headOrFail", () => {
  it("decoding", async () => {
    const schema = S.headOrFail(S.number)
    await Util.expectParseSuccess(schema, [1], 1)
    await Util.expectParseFailure(
      schema,
      [],
      `(ReadonlyArray<number> <-> number)
└─ Transformation process failure
   └─ Expected (ReadonlyArray<number> <-> number), actual []`
    )
    await Util.expectParseFailure(
      schema,
      ["a"],
      `(ReadonlyArray<number> <-> number)
└─ From side transformation failure
   └─ ReadonlyArray<number>
      └─ [0]
         └─ Expected a number, actual "a"`
    )
  })

  it("encoding", async () => {
    const schema = S.headOrFail(S.number)
    await Util.expectEncodeSuccess(schema, 1, [1])
  })
})
