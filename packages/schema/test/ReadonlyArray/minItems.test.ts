import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("ReadonlyArray/minItems", () => {
  const schema = S.array(S.number).pipe(S.minItems(2))
  it("decoding", async () => {
    await Util.expectParseFailure(
      schema,
      [1],
      "Expected an array of at least 2 items, actual [1]"
    )

    await Util.expectParseSuccess(schema, [1, 2])
    await Util.expectParseSuccess(schema, [1, 2, 3])
  })
})
