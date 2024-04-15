import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
import { describe, expect, it } from "vitest"

describe("AST > getCardinality", () => {
  it("order", () => {
    const struct = S.Struct({ a: S.String })
    const actual = [
      struct.ast,
      S.Unknown.ast,
      S.Any.ast,
      S.Object.ast,
      S.SymbolFromSelf.ast,
      S.BigIntFromSelf.ast,
      S.Number.ast,
      S.String.ast,
      S.Boolean.ast,
      S.UniqueSymbolFromSelf(Symbol.for("a")).ast,
      S.Undefined.ast,
      S.Void.ast,
      S.Literal("a").ast,
      S.Never.ast
    ].map(
      AST.getCardinality
    )
      .sort()
    const expected = [
      S.Never.ast,
      S.UniqueSymbolFromSelf(Symbol.for("a")).ast,
      S.Undefined.ast,
      S.Void.ast,
      S.Literal("a").ast,
      S.Boolean.ast,
      S.SymbolFromSelf.ast,
      S.BigIntFromSelf.ast,
      S.Number.ast,
      S.String.ast,
      struct.ast,
      S.Object.ast,
      S.Unknown.ast,
      S.Any.ast
    ].map(AST.getCardinality)
    expect(actual).toEqual(expected)
  })
})
