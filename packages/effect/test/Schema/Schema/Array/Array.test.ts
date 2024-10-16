import * as Either from "effect/Either"
import * as ParseResult from "effect/ParseResult"
import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"
import { assert, describe, expect, it } from "vitest"

describe("Array", () => {
  it("annotations()", () => {
    const schema = S.Array(S.String).annotations({ identifier: "X" }).annotations({ title: "Y" })
    expect(schema.ast.annotations).toStrictEqual({
      [AST.IdentifierAnnotationId]: "X",
      [AST.TitleAnnotationId]: "Y"
    })
  })

  it("should expose the value", () => {
    const schema = S.Array(S.String)
    expect(schema.value).toStrictEqual(S.String)
  })

  it("should compute the partial result", () => {
    const schema = S.Array(S.Number)
    const all = S.decodeUnknownEither(schema)([1, "a", 2, "b"], { errors: "all" })
    if (Either.isLeft(all)) {
      const issue = all.left.issue
      if (ParseResult.isComposite(issue)) {
        expect(issue.output).toStrictEqual([1, 2])
      } else {
        assert.fail("expected an And")
      }
    } else {
      assert.fail("expected a Left")
    }
    const first = S.decodeUnknownEither(schema)([1, "a", 2, "b"], { errors: "first" })
    if (Either.isLeft(first)) {
      const issue = first.left.issue
      if (ParseResult.isComposite(issue)) {
        expect(issue.output).toStrictEqual([1])
      } else {
        assert.fail("expected an And")
      }
    } else {
      assert.fail("expected a Left")
    }
  })
})
