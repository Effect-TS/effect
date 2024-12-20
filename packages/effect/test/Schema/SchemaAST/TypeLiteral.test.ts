import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"
import { describe, expect, it } from "vitest"

describe("AST.TypeLiteral", () => {
  it("should throw on onvalid index signature parameters", () => {
    expect(() => new AST.IndexSignature(S.NumberFromString.ast, AST.stringKeyword, true)).toThrow(
      new Error(
        `Unsupported index signature parameter
details: An index signature parameter type must be \`string\`, \`symbol\`, a template literal type or a refinement of the previous types`
      )
    )
  })

  describe("toString", () => {
    it("Struct (immutable)", () => {
      expect(S.Struct({ a: S.String, b: S.Number }).ast.toString()).toBe(`{ readonly a: string; readonly b: number }`)
    })

    it("Struct (mutable)", () => {
      expect(S.mutable(S.Struct({ a: S.String, b: S.Number })).ast.toString()).toBe(
        `{ a: string; b: number }`
      )
    })

    it("Record (immutable)", () => {
      expect(S.Record({ key: S.String, value: S.Number }).ast.toString()).toBe(`{ readonly [x: string]: number }`)
    })

    it("Record (mutable)", () => {
      expect(S.mutable(S.Record({ key: S.String, value: S.Number })).ast.toString()).toBe(
        `{ [x: string]: number }`
      )
    })
  })
})
