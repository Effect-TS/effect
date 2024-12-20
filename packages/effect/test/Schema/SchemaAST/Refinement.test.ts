import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"
import { assert, describe, expect, it } from "vitest"

const expectGetExpected = (schema: S.Schema.Any, expected: string) => {
  if (AST.isRefinement(schema.ast)) {
    expect(schema.ast.getExpected()).toBe(expected)
  } else {
    // eslint-disable-next-line no-console
    console.log(schema.ast)
    assert.fail(`expected a Refinement`)
  }
}

describe("AST.Refinement", () => {
  it("toString", () => {
    expect(String(S.Number.pipe(S.filter(() => true)))).toBe("{ number | filter }")
    expect(String(S.Number.pipe(S.int()))).toBe("an integer")
    expect(String(S.Number.pipe(S.int(), S.positive()))).toBe("an integer & a positive number")
    expect(String(S.Int.pipe(S.positive()))).toBe("Int & a positive number")
  })

  it("getExpected", () => {
    expectGetExpected(S.Number.pipe(S.filter(() => true)), "{ number | filter }")
    expectGetExpected(S.Number.pipe(S.int()), "an integer")
    expectGetExpected(S.Number.pipe(S.int(), S.positive()), "a positive number")
    expectGetExpected(S.Int.pipe(S.positive()), "a positive number")
  })
})
