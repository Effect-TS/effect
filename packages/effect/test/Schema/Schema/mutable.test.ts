import { describe, it } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
import { identity } from "effect"
import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"

describe("mutable", () => {
  it("string", () => {
    deepStrictEqual(S.mutable(S.String).ast, S.String.ast)
  })

  it("struct", () => {
    const schema = S.mutable(S.Struct({ a: S.Number }))
    deepStrictEqual(
      schema.ast,
      new AST.TypeLiteral([
        new AST.PropertySignature("a", S.Number.ast, false, false)
      ], [])
    )
  })

  it("record", () => {
    const schema = S.mutable(S.Record({ key: S.String, value: S.Number }))
    deepStrictEqual(schema.ast, new AST.TypeLiteral([], [new AST.IndexSignature(S.String.ast, S.Number.ast, false)]))
  })

  it("array", () => {
    const schema = S.mutable(S.Array(S.String))
    deepStrictEqual(schema.ast, new AST.TupleType([], [new AST.Type(S.String.ast)], false))
  })

  it("union", () => {
    const schema = S.mutable(S.Union(S.Struct({ a: S.Number }), S.Array(S.String)))
    deepStrictEqual(
      schema.ast,
      AST.Union.make([
        new AST.TypeLiteral([
          new AST.PropertySignature("a", S.Number.ast, false, false)
        ], []),
        new AST.TupleType([], [new AST.Type(S.String.ast)], false)
      ])
    )
  })

  it("refinement", () => {
    const schema = S.mutable(S.Array(S.String).pipe(S.maxItems(2)))
    if (AST.isRefinement(schema.ast)) {
      deepStrictEqual(schema.ast.from, new AST.TupleType([], [new AST.Type(S.String.ast)], false))
    }
  })

  it("suspend", () => {
    const schema = S.mutable(S.suspend( // intended outer suspend
      () => S.Array(S.String)
    ))
    if (AST.isSuspend(schema.ast)) {
      deepStrictEqual(schema.ast.f(), new AST.TupleType([], [new AST.Type(S.String.ast)], false))
    }
  })

  it("transformation", () => {
    const schema = S.mutable(
      S.transform(S.Array(S.String), S.Array(S.String), { strict: true, decode: identity, encode: identity })
    )
    if (AST.isTransformation(schema.ast)) {
      deepStrictEqual(schema.ast.from, new AST.TupleType([], [new AST.Type(S.String.ast)], false))
      deepStrictEqual(schema.ast.to, new AST.TupleType([], [new AST.Type(S.String.ast)], false))
    }
  })
})
