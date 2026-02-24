import { describe, it } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"

describe("getPropertySignatures", () => {
  it("Struct", () => {
    const schema = S.Struct({ a: S.String, b: S.Number })
    deepStrictEqual(AST.getPropertySignatures(schema.ast), [
      new AST.PropertySignature("a", S.String.ast, false, true),
      new AST.PropertySignature("b", S.Number.ast, false, true)
    ])
  })

  it("Refinement", () => {
    const schema = S.Struct({ a: S.String, b: S.Number }).pipe(S.filter(() => true))
    deepStrictEqual(AST.getPropertySignatures(schema.ast), [
      new AST.PropertySignature("a", S.String.ast, false, true),
      new AST.PropertySignature("b", S.Number.ast, false, true)
    ])
  })

  it("suspend", () => {
    const schema = S.suspend(() => S.Struct({ a: S.String, b: S.Number }))
    deepStrictEqual(AST.getPropertySignatures(schema.ast), [
      new AST.PropertySignature("a", S.String.ast, false, true),
      new AST.PropertySignature("b", S.Number.ast, false, true)
    ])
  })

  it("Union", () => {
    const schema = S.Union(S.Struct({ _tag: S.Literal("A") }), S.Struct({ _tag: S.Literal("B") }))
    deepStrictEqual(AST.getPropertySignatures(schema.ast), [
      new AST.PropertySignature("_tag", S.Literal("A", "B").ast, false, true)
    ])
  })

  it("Class", () => {
    class A extends S.Class<A>("A")({ a: S.String, b: S.Number }) {}
    const schema = A.pipe(S.typeSchema)
    deepStrictEqual(AST.getPropertySignatures(schema.ast), [
      new AST.PropertySignature("a", S.String.ast, false, true),
      new AST.PropertySignature("b", S.Number.ast, false, true)
    ])
  })

  it("Transformation (Struct with optionalWith default)", () => {
    const schema = S.Struct({
      a: S.String,
      b: S.optionalWith(S.Number, { default: () => 0 })
    })
    deepStrictEqual(AST.getPropertySignatures(schema.ast), [
      new AST.PropertySignature("a", S.String.ast, false, true),
      new AST.PropertySignature("b", S.Number.ast, false, true)
    ])
  })

  it("Transformation (Struct with optionalWith as Option)", () => {
    const schema = S.Struct({
      a: S.String,
      b: S.optionalWith(S.Number, { as: "Option" })
    })
    const signatures = AST.getPropertySignatures(schema.ast)
    deepStrictEqual(signatures.length, 2)
    deepStrictEqual(signatures[0], new AST.PropertySignature("a", S.String.ast, false, true))
    deepStrictEqual(signatures[1].name, "b")
    deepStrictEqual(signatures[1].isOptional, false)
    deepStrictEqual(signatures[1].isReadonly, true)
    // b's type on the decoded side is Option<number> (a Declaration AST)
    deepStrictEqual(signatures[1].type._tag, "Declaration")
  })
})
