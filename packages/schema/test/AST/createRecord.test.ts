import * as AST from "@effect/schema/AST"
import { describe, expect, it } from "vitest"

describe("AST/createRecord", () => {
  it("numeric literal", () => {
    expect(AST.createRecord(AST.createLiteral(1), AST.numberKeyword, true)).toEqual(
      AST.createTypeLiteral([AST.createPropertySignature(1, AST.numberKeyword, false, true)], [])
    )
  })

  it("should throw on unsupported keys", () => {
    expect(() => AST.createRecord(AST.undefinedKeyword, AST.numberKeyword, true)).toThrow(
      new Error("createRecord: unsupported key schema (UndefinedKeyword)")
    )
  })

  it("should throw on unsupported literals", () => {
    expect(() => AST.createRecord(AST.createLiteral(true), AST.numberKeyword, true)).toThrow(
      new Error("createRecord: unsupported literal true")
    )
  })
})
