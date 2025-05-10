import { describe, it } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"

const expectUnify = (input: Array<S.Schema.All>, expected: Array<S.Schema.All>) => {
  const actual = AST.unify(input.map((schema) => schema.ast))
  deepStrictEqual(actual, expected.map((e) => e.ast))
}

describe("AST.unify", () => {
  it("should unify", () => {
    expectUnify([], [])

    expectUnify([S.Any, S.String], [S.Any])
    expectUnify([S.Any, S.Unknown], [S.Any])
    expectUnify([S.Literal("a"), S.Any], [S.Any])

    expectUnify([S.Unknown, S.String], [S.Unknown])
    expectUnify([S.Unknown, S.Literal("a")], [S.Unknown])

    expectUnify([S.Object, S.Object], [S.Object])
    expectUnify([S.Object, S.Struct({ a: S.String })], [S.Object])
    expectUnify([S.Object, S.Tuple(S.String)], [S.Object])
    expectUnify([S.Object, S.String], [S.Object, S.String])

    expectUnify([S.String, S.String], [S.String])
    expectUnify([S.String, S.Number], [S.String, S.Number])

    expectUnify([S.Literal("a"), S.Literal("a")], [S.Literal("a")])
    expectUnify([S.Literal("a"), S.Literal("b")], [S.Literal("a"), S.Literal("b")])
    expectUnify([S.Literal("a"), S.String], [S.String])
    expectUnify([S.String, S.Literal("a")], [S.String])
    expectUnify([S.Literal("a"), S.Literal("b"), S.String], [S.String])
    expectUnify([S.Literal("a"), S.String, S.Literal("b")], [S.String])

    expectUnify([S.Literal(1), S.Literal(1)], [S.Literal(1)])
    expectUnify([S.Literal(1), S.Literal(2)], [S.Literal(1), S.Literal(2)])
    expectUnify([S.Literal(1), S.Number], [S.Number])

    expectUnify([S.Literal(true), S.Literal(true)], [S.Literal(true)])
    expectUnify([S.Literal(true), S.Literal(false)], [S.Literal(true), S.Literal(false)])
    expectUnify([S.Literal(true), S.Boolean], [S.Boolean])

    expectUnify([S.Literal(1n), S.Literal(1n)], [S.Literal(1n)])
    expectUnify([S.Literal(1n), S.Literal(2n)], [S.Literal(1n), S.Literal(2n)])
    expectUnify([S.Literal(1n), S.BigIntFromSelf], [S.BigIntFromSelf])

    expectUnify([S.UniqueSymbolFromSelf(Symbol.for("a")), S.UniqueSymbolFromSelf(Symbol.for("a"))], [
      S.UniqueSymbolFromSelf(Symbol.for("a"))
    ])
    expectUnify([S.UniqueSymbolFromSelf(Symbol.for("a")), S.SymbolFromSelf], [S.SymbolFromSelf])

    expectUnify([S.Struct({}), S.Struct({})], [S.Struct({})])
    expectUnify([S.Object, S.Struct({})], [S.Object, S.Struct({})])
  })
})
