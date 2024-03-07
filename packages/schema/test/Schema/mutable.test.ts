import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
import { identity } from "effect"
import { describe, expect, it } from "vitest"

describe("Schema/mutable", () => {
  it("string", () => {
    expect(S.mutable(S.string).ast).toEqual(S.string.ast)
  })

  it("struct", () => {
    const schema = S.mutable(S.struct({ a: S.number }))
    expect(schema.ast).toEqual(AST.TypeLiteral.make([
      new AST.PropertySignature("a", S.number.ast, false, false)
    ], []))
  })

  it("record", () => {
    const schema = S.mutable(S.record(S.string, S.number))
    expect(schema.ast).toEqual(
      AST.TypeLiteral.make([], [AST.IndexSignature.make(S.string.ast, S.number.ast, false)])
    )
  })

  it("array", () => {
    const schema = S.mutable(S.array(S.string))
    expect(schema.ast).toEqual(
      new AST.TupleType([], [S.string.ast], false)
    )
  })

  it("union", () => {
    const schema = S.mutable(S.union(S.struct({ a: S.number }), S.array(S.string)))
    expect(schema.ast).toEqual(
      AST.Union.make([
        AST.TypeLiteral.make([
          new AST.PropertySignature("a", S.number.ast, false, false)
        ], []),
        new AST.TupleType([], [S.string.ast], false)
      ])
    )
  })

  it("refinement", () => {
    const schema = S.mutable(S.array(S.string).pipe(S.maxItems(2)))
    if (AST.isRefinement(schema.ast)) {
      expect(schema.ast.from).toEqual(
        new AST.TupleType([], [S.string.ast], false)
      )
    }
  })

  it("suspend", () => {
    const schema = S.mutable(S.suspend( // intended outer suspend
      () => S.array(S.string)
    ))
    if (AST.isSuspend(schema.ast)) {
      expect(schema.ast.f()).toEqual(
        new AST.TupleType([], [S.string.ast], false)
      )
    }
  })

  it("transform", () => {
    const schema = S.mutable(S.transform(S.array(S.string), S.array(S.string), identity, identity))
    if (AST.isTransform(schema.ast)) {
      expect(schema.ast.from).toEqual(
        new AST.TupleType([], [S.string.ast], false)
      )
      expect(schema.ast.to).toEqual(
        new AST.TupleType([], [S.string.ast], false)
      )
    }
  })
})
