import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
import { describe, expect, it } from "vitest"

describe("Schema > make", () => {
  it("should return the same reference when using .annotations(undefined)", () => {
    const schema = S.make(AST.undefinedKeyword)
    const copy = schema.annotations(undefined)
    expect(schema === copy).toBe(true)
  })
})
