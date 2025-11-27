import { describe, it } from "@effect/vitest"
import { deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import * as Either from "effect/Either"
import * as ParseResult from "effect/ParseResult"
import * as S from "effect/Schema"

describe("Array", () => {
  it("should expose the value", () => {
    const schema = S.Array(S.String)
    strictEqual(schema.value, S.String)
  })

  it("should compute the partial result", () => {
    const schema = S.Array(S.Number)
    const all = S.decodeUnknownEither(schema)([1, "a", 2, "b"], { errors: "all" })
    if (Either.isLeft(all)) {
      const issue = all.left.issue
      if (ParseResult.isComposite(issue)) {
        deepStrictEqual(issue.output, [1, 2])
      } else {
        throw new Error("expected an And")
      }
    } else {
      throw new Error("expected a Left")
    }
    const first = S.decodeUnknownEither(schema)([1, "a", 2, "b"], { errors: "first" })
    if (Either.isLeft(first)) {
      const issue = first.left.issue
      if (ParseResult.isComposite(issue)) {
        deepStrictEqual(issue.output, [1])
      } else {
        throw new Error("expected an And")
      }
    } else {
      throw new Error("expected a Left")
    }
  })
})
