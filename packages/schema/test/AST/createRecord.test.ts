import * as AST from "@effect/schema/AST"
import { describe, expect, it } from "vitest"

describe("AST > createRecord", () => {
  it("numeric literal", () => {
    expect(AST.createRecord(new AST.Literal(1), AST.numberKeyword, true)).toEqual(
      AST.TypeLiteral.make([new AST.PropertySignature(1, AST.numberKeyword, false, true)], [])
    )
  })

  it("should throw on unsupported keys", () => {
    expect(() => AST.createRecord(AST.undefinedKeyword, AST.numberKeyword, true)).toThrow(
      new Error("createRecord: unsupported key schema (undefined)")
    )
  })

  it("should throw on unsupported literals", () => {
    expect(() => AST.createRecord(new AST.Literal(true), AST.numberKeyword, true)).toThrow(
      new Error("createRecord: unsupported literal (true)")
    )
  })
})
