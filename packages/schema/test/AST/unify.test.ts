import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
import { describe, expect, it } from "vitest"

const expectUnify = (input: Array<S.Schema.All>, expected: Array<S.Schema.All>) => {
  const actual = AST.unify(input.map((schema) => schema.ast))
  expect(actual).toStrictEqual(expected.map((e) => e.ast))
}

describe("AST.unify", () => {
  it("should unify", () => {
    expectUnify([], [])

    expectUnify([S.Any, S.String], [S.Any])
    expectUnify([S.Any, S.Unknown], [S.Any])
    expectUnify([S.literal("a"), S.Any], [S.Any])

    expectUnify([S.Unknown, S.String], [S.Unknown])
    expectUnify([S.Unknown, S.literal("a")], [S.Unknown])

    expectUnify([S.Object, S.Object], [S.Object])
    expectUnify([S.Object, S.Struct({ a: S.String })], [S.Object])
    expectUnify([S.Object, S.Tuple(S.String)], [S.Object])
    expectUnify([S.Object, S.String], [S.Object, S.String])

    expectUnify([S.String, S.String], [S.String])
    expectUnify([S.String, S.Number], [S.String, S.Number])

    expectUnify([S.literal("a"), S.literal("a")], [S.literal("a")])
    expectUnify([S.literal("a"), S.literal("b")], [S.literal("a"), S.literal("b")])
    expectUnify([S.literal("a"), S.String], [S.String])
    expectUnify([S.String, S.literal("a")], [S.String])
    expectUnify([S.literal("a"), S.literal("b"), S.String], [S.String])
    expectUnify([S.literal("a"), S.String, S.literal("b")], [S.String])

    expectUnify([S.literal(1), S.literal(1)], [S.literal(1)])
    expectUnify([S.literal(1), S.literal(2)], [S.literal(1), S.literal(2)])
    expectUnify([S.literal(1), S.Number], [S.Number])

    expectUnify([S.literal(true), S.literal(true)], [S.literal(true)])
    expectUnify([S.literal(true), S.literal(false)], [S.literal(true), S.literal(false)])
    expectUnify([S.literal(true), S.Boolean], [S.Boolean])

    expectUnify([S.literal(1n), S.literal(1n)], [S.literal(1n)])
    expectUnify([S.literal(1n), S.literal(2n)], [S.literal(1n), S.literal(2n)])
    expectUnify([S.literal(1n), S.BigIntFromSelf], [S.BigIntFromSelf])

    expectUnify([S.UniqueSymbolFromSelf(Symbol.for("a")), S.UniqueSymbolFromSelf(Symbol.for("a"))], [
      S.UniqueSymbolFromSelf(Symbol.for("a"))
    ])
    expectUnify([S.UniqueSymbolFromSelf(Symbol.for("a")), S.SymbolFromSelf], [S.SymbolFromSelf])

    expectUnify([S.Struct({}), S.Struct({})], [S.Struct({})])
    expectUnify([S.Object, S.Struct({})], [S.Object, S.Struct({})])
  })
})
