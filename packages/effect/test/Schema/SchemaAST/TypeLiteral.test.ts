import { describe, it } from "@effect/vitest"
import { strictEqual, throws } from "@effect/vitest/utils"
import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"

describe("AST.TypeLiteral", () => {
  it("should throw on onvalid index signature parameters", () => {
    throws(
      () => new AST.IndexSignature(S.NumberFromString.ast, AST.stringKeyword, true),
      new Error(
        `Unsupported index signature parameter
details: An index signature parameter type must be \`string\`, \`symbol\`, a template literal type or a refinement of the previous types`
      )
    )
  })

  describe("toString", () => {
    it("Struct (immutable)", () => {
      strictEqual(S.Struct({ a: S.String, b: S.Number }).ast.toString(), `{ readonly a: string; readonly b: number }`)
    })

    it("Struct (mutable)", () => {
      strictEqual(S.mutable(S.Struct({ a: S.String, b: S.Number })).ast.toString(), `{ a: string; b: number }`)
    })

    it("Record (immutable)", () => {
      strictEqual(S.Record({ key: S.String, value: S.Number }).ast.toString(), `{ readonly [x: string]: number }`)
    })

    it("Record (mutable)", () => {
      strictEqual(S.mutable(S.Record({ key: S.String, value: S.Number })).ast.toString(), `{ [x: string]: number }`)
    })
  })
})
