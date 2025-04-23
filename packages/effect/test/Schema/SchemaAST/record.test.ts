import { describe, it } from "@effect/vitest"
import { deepStrictEqual, throws } from "@effect/vitest/utils"
import * as AST from "effect/SchemaAST"

describe("record", () => {
  it("should throw on unsupported keys", () => {
    throws(
      () => AST.record(AST.undefinedKeyword, AST.numberKeyword),
      new Error(`Unsupported key schema
schema (UndefinedKeyword): undefined`)
    )
  })

  it("should throw on unsupported literals", () => {
    throws(
      () => AST.record(new AST.Literal(true), AST.numberKeyword),
      new Error(`Unsupported literal
details: literal value: true`)
    )
  })

  it("should support numeric literals as keys", () => {
    deepStrictEqual(AST.record(new AST.Literal(1), AST.numberKeyword).propertySignatures, [
      new AST.PropertySignature(1, AST.numberKeyword, false, true)
    ])
  })
})
