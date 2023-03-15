import { pipe } from "@effect/data/Function"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("ReadonlyArray", () => {
  it("minItems", () => {
    const schema = pipe(S.array(S.number), S.minItems(2))

    Util.expectDecodingFailure(
      schema,
      [1],
      "Expected an array of at least 2 items, actual [1]"
    )

    Util.expectDecodingSuccess(schema, [1, 2])
    Util.expectDecodingSuccess(schema, [1, 2, 3])
  })

  it("maxItems", () => {
    const schema = pipe(S.array(S.number), S.maxItems(2))

    Util.expectDecodingFailure(
      schema,
      [1, 2, 3],
      "Expected an array of at most 2 items, actual [1,2,3]"
    )

    Util.expectDecodingSuccess(schema, [1])
    Util.expectDecodingSuccess(schema, [1, 2])
  })

  it("items", () => {
    const schema = pipe(S.array(S.number), S.itemsCount(2))

    Util.expectDecodingFailure(
      schema,
      [],
      "Expected an array of exactly 2 items, actual []"
    )
    Util.expectDecodingFailure(
      schema,
      [1],
      "Expected an array of exactly 2 items, actual [1]"
    )
    Util.expectDecodingSuccess(schema, [1, 2])
    Util.expectDecodingFailure(
      schema,
      [1, 2, 3],
      "Expected an array of exactly 2 items, actual [1,2,3]"
    )
  })
})
