import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("ReadonlyArray", () => {
  it("minItems", async () => {
    const schema = S.array(S.number).pipe(S.minItems(2))

    await Util.expectParseFailure(
      schema,
      [1],
      "Expected an array of at least 2 items, actual [1]"
    )

    await Util.expectParseSuccess(schema, [1, 2])
    await Util.expectParseSuccess(schema, [1, 2, 3])
  })

  it("maxItems", async () => {
    const schema = S.array(S.number).pipe(S.maxItems(2))

    await Util.expectParseFailure(
      schema,
      [1, 2, 3],
      "Expected an array of at most 2 items, actual [1,2,3]"
    )

    await Util.expectParseSuccess(schema, [1])
    await Util.expectParseSuccess(schema, [1, 2])
  })

  it("items", async () => {
    const schema = S.array(S.number).pipe(S.itemsCount(2))

    await Util.expectParseFailure(
      schema,
      [],
      "Expected an array of exactly 2 items, actual []"
    )
    await Util.expectParseFailure(
      schema,
      [1],
      "Expected an array of exactly 2 items, actual [1]"
    )
    await Util.expectParseSuccess(schema, [1, 2])
    await Util.expectParseFailure(
      schema,
      [1, 2, 3],
      "Expected an array of exactly 2 items, actual [1,2,3]"
    )
  })
})
