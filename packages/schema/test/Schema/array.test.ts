import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
import * as Either from "effect/Either"
import { assert, describe, expect, it } from "vitest"

describe("Schema > array", () => {
  it("annotations()", () => {
    const schema = S.array(S.string).annotations({ identifier: "X" }).annotations({ title: "Y" })
    expect(schema.ast.annotations).toStrictEqual({
      [AST.IdentifierAnnotationId]: "X",
      [AST.TitleAnnotationId]: "Y"
    })
  })

  it("should expose the value", () => {
    const schema = S.array(S.string)
    expect(schema.value).toStrictEqual(S.string)
  })

  it("should compute the partial result", () => {
    const schema = S.array(S.number)
    const all = S.decodeUnknownEither(schema)([1, "a", 2, "b"], { errors: "all" })
    if (Either.isLeft(all)) {
      const issue = all.left.error
      if (issue._tag === "TupleType") {
        expect(issue.output).toStrictEqual([1, 2])
      } else {
        assert.fail("expected a TupleType")
      }
    } else {
      assert.fail("expected a Left")
    }
    const first = S.decodeUnknownEither(schema)([1, "a", 2, "b"], { errors: "first" })
    if (Either.isLeft(first)) {
      const issue = first.left.error
      if (issue._tag === "TupleType") {
        expect(issue.output).toStrictEqual([1])
      } else {
        assert.fail("expected a TupleType")
      }
    } else {
      assert.fail("expected a Left")
    }
  })
})
