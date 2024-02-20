import * as AST from "@effect/schema/AST"
import { describe, expect, it } from "vitest"

describe("AST/createTemplateLiteral", () => {
  it("should return a literal if there are no template literal spans", () => {
    expect(AST.TemplateLiteral.make("a", [])).toEqual(new AST.Literal("a"))
  })
})
