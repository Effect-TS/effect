import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"

describe("taggedUnion", () => {
  it("should create a union of tagged structs", () => {
    const schema = S.taggedUnion({
      A: {},
      B: { value: S.String },
      C: { otherValue: S.Number }
    })

    const expected = S.Union(
      S.TaggedStruct("A", {}),
      S.TaggedStruct("B", { value: S.String }),
      S.TaggedStruct("C", { otherValue: S.Number })
    )

    Util.assertions.ast.equals(schema, expected)
  })
})
