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

    expectUnify([S.any, S.string], [S.any])
    expectUnify([S.any, S.unknown], [S.any])
    expectUnify([S.literal("a"), S.any], [S.any])

    expectUnify([S.unknown, S.string], [S.unknown])
    expectUnify([S.unknown, S.literal("a")], [S.unknown])

    expectUnify([S.object, S.object], [S.object])
    expectUnify([S.object, S.struct({ a: S.string })], [S.object])
    expectUnify([S.object, S.tuple(S.string)], [S.object])
    expectUnify([S.object, S.string], [S.object, S.string])

    expectUnify([S.string, S.string], [S.string])
    expectUnify([S.string, S.number], [S.string, S.number])

    expectUnify([S.literal("a"), S.literal("a")], [S.literal("a")])
    expectUnify([S.literal("a"), S.literal("b")], [S.literal("a"), S.literal("b")])
    expectUnify([S.literal("a"), S.string], [S.string])
    expectUnify([S.string, S.literal("a")], [S.string])
    expectUnify([S.literal("a"), S.literal("b"), S.string], [S.string])
    expectUnify([S.literal("a"), S.string, S.literal("b")], [S.string])

    expectUnify([S.literal(1), S.literal(1)], [S.literal(1)])
    expectUnify([S.literal(1), S.literal(2)], [S.literal(1), S.literal(2)])
    expectUnify([S.literal(1), S.number], [S.number])

    expectUnify([S.literal(true), S.literal(true)], [S.literal(true)])
    expectUnify([S.literal(true), S.literal(false)], [S.literal(true), S.literal(false)])
    expectUnify([S.literal(true), S.boolean], [S.boolean])

    expectUnify([S.literal(1n), S.literal(1n)], [S.literal(1n)])
    expectUnify([S.literal(1n), S.literal(2n)], [S.literal(1n), S.literal(2n)])
    expectUnify([S.literal(1n), S.bigintFromSelf], [S.bigintFromSelf])

    expectUnify([S.uniqueSymbolFromSelf(Symbol.for("a")), S.uniqueSymbolFromSelf(Symbol.for("a"))], [
      S.uniqueSymbolFromSelf(Symbol.for("a"))
    ])
    expectUnify([S.uniqueSymbolFromSelf(Symbol.for("a")), S.symbolFromSelf], [S.symbolFromSelf])

    expectUnify([S.struct({}), S.struct({})], [S.struct({})])
    expectUnify([S.object, S.struct({})], [S.object, S.struct({})])
  })
})
