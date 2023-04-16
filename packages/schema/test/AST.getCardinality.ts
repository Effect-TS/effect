import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"

describe.concurrent("AST.getCardinality", () => {
  it("order", () => {
    const struct = S.struct({ a: S.string })
    const actual = [
      struct.ast,
      S.unknown.ast,
      S.any.ast,
      S.object.ast,
      S.symbol.ast,
      S.bigint.ast,
      S.number.ast,
      S.string.ast,
      S.boolean.ast,
      S.uniqueSymbol(Symbol.for("a")).ast,
      S.undefined.ast,
      S.void.ast,
      S.literal("a").ast,
      S.never.ast
    ].map(
      AST.getCardinality
    )
      .sort()
    const expected = [
      S.never.ast,
      S.uniqueSymbol(Symbol.for("a")).ast,
      S.undefined.ast,
      S.void.ast,
      S.literal("a").ast,
      S.boolean.ast,
      S.symbol.ast,
      S.bigint.ast,
      S.number.ast,
      S.string.ast,
      struct.ast,
      S.object.ast,
      S.unknown.ast,
      S.any.ast
    ].map(AST.getCardinality)
    expect(actual).toEqual(expected)
  })
})
