import * as AST from "@effect/schema/AST"
import { describe, expect, it } from "vitest"

describe("AST/createTemplateLiteral", () => {
  it("should return a literal if there are no template literal spans", () => {
    expect(AST.createTemplateLiteral("a", [])).toEqual(AST.createLiteral("a"))
  })
})
