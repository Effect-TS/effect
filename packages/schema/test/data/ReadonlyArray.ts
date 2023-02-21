import { pipe } from "@effect/data/Function"
import * as A from "@fp-ts/schema/data/ReadonlyArray"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe.concurrent("ReadonlyArray", () => {
  it("exports", () => {
    expect(A.MinItemsId).exist
    expect(A.MaxItemsId).exist
    expect(A.ItemsCountId).exist
  })

  it("minItems", () => {
    const schema = pipe(S.array(S.number), A.minItems(2))

    Util.expectDecodingFailure(
      schema,
      [1],
      "Expected an array of at least 2 items, actual [1]"
    )

    Util.expectDecodingSuccess(schema, [1, 2])
    Util.expectDecodingSuccess(schema, [1, 2, 3])
  })

  it("maxItems", () => {
    const schema = pipe(S.array(S.number), A.maxItems(2))

    Util.expectDecodingFailure(
      schema,
      [1, 2, 3],
      "Expected an array of at most 2 items, actual [1,2,3]"
    )

    Util.expectDecodingSuccess(schema, [1])
    Util.expectDecodingSuccess(schema, [1, 2])
  })

  it("items", () => {
    const schema = pipe(S.array(S.number), A.itemsCount(2))

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
