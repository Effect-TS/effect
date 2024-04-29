import * as AST from "@effect/schema/AST"
import { jestExpect as expect } from "@jest/expect"
import { describe, it } from "vitest"

describe("AST.TemplateLiteral", () => {
  it("should return a literal if there are no template literal spans", () => {
    expect(AST.TemplateLiteral.make("a", [])).toEqual(new AST.Literal("a"))
  })
})
