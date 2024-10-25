import * as AST from "@effect/schema/AST"
import { describe, expect, it } from "vitest"

describe("record", () => {
  it("numeric literal", () => {
    expect(AST.record(new AST.Literal(1), AST.numberKeyword).propertySignatures).toEqual(
      [new AST.PropertySignature(1, AST.numberKeyword, false, true)]
    )
  })

  it("should throw on unsupported keys", () => {
    expect(() => AST.record(AST.undefinedKeyword, AST.numberKeyword)).toThrow(
      new Error(`Unsupported key schema
schema (UndefinedKeyword): undefined`)
    )
  })

  it("should throw on unsupported literals", () => {
    expect(() => AST.record(new AST.Literal(true), AST.numberKeyword)).toThrow(
      new Error(`Unsupported literal
details: literal value: true`)
    )
  })
})
