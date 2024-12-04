import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"
import { describe, expect, it } from "vitest"

describe("guards", () => {
  it("isDeclaration", () => {
    expect(AST.isDeclaration(S.OptionFromSelf(S.Number).ast)).toEqual(true)
    expect(AST.isDeclaration(S.Number.ast)).toEqual(false)
  })

  it("isTemplateLiteral", () => {
    expect(AST.isTemplateLiteral(S.TemplateLiteral(S.Literal("a"), S.String).ast)).toEqual(true)
    expect(AST.isTemplateLiteral(S.Number.ast)).toEqual(false)
  })

  it("isSuspend", () => {
    type A = readonly [number, A | null]
    const schema: S.Schema<A> = S.suspend( // intended outer suspend
      () => S.Tuple(S.Number, S.Union(schema, S.Literal(null)))
    )
    expect(AST.isSuspend(schema.ast)).toEqual(true)
    expect(AST.isSuspend(S.Number.ast)).toEqual(false)
  })

  it("isTransform", () => {
    expect(AST.isTransformation(S.Trim.ast)).toEqual(true)
    expect(AST.isTransformation(S.Number.ast)).toEqual(false)
  })

  it("isUndefinedKeyword", () => {
    expect(AST.isUndefinedKeyword(S.Undefined.ast)).toEqual(true)
    expect(AST.isUndefinedKeyword(S.Number.ast)).toEqual(false)
  })

  it("isVoidKeyword", () => {
    expect(AST.isVoidKeyword(S.Void.ast)).toEqual(true)
    expect(AST.isVoidKeyword(S.Unknown.ast)).toEqual(false)
  })

  it("isSymbolKeyword", () => {
    expect(AST.isSymbolKeyword(S.SymbolFromSelf.ast)).toEqual(true)
    expect(AST.isSymbolKeyword(S.Unknown.ast)).toEqual(false)
  })

  it("isObjectKeyword", () => {
    expect(AST.isObjectKeyword(S.Object.ast)).toEqual(true)
    expect(AST.isObjectKeyword(S.Unknown.ast)).toEqual(false)
  })

  it("isEnums", () => {
    enum Fruits {
      Apple,
      Banana
    }
    expect(AST.isEnums(S.Enums(Fruits).ast)).toEqual(true)
    expect(AST.isEnums(S.Unknown.ast)).toEqual(false)
  })

  it("isNeverKeyword", () => {
    expect(AST.isNeverKeyword(S.Never.ast)).toEqual(true)
    expect(AST.isNeverKeyword(S.Unknown.ast)).toEqual(false)
  })

  it("isUniqueSymbol", () => {
    expect(AST.isUniqueSymbol(S.UniqueSymbolFromSelf(Symbol.for("effect/Schema/test/a")).ast)).toEqual(
      true
    )
    expect(AST.isUniqueSymbol(S.Unknown.ast)).toEqual(false)
  })

  it("isUnknownKeyword", () => {
    expect(AST.isUnknownKeyword(S.Unknown.ast)).toEqual(true)
    expect(AST.isUnknownKeyword(S.Any.ast)).toEqual(false)
  })

  it("isAnyKeyword", () => {
    expect(AST.isAnyKeyword(S.Any.ast)).toEqual(true)
    expect(AST.isAnyKeyword(S.Unknown.ast)).toEqual(false)
  })

  it("isBooleanKeyword", () => {
    expect(AST.isBooleanKeyword(S.Boolean.ast)).toEqual(true)
    expect(AST.isBooleanKeyword(S.Unknown.ast)).toEqual(false)
  })

  it("isBigIntKeyword", () => {
    expect(AST.isBigIntKeyword(S.BigIntFromSelf.ast)).toEqual(true)
    expect(AST.isBigIntKeyword(S.Unknown.ast)).toEqual(false)
  })

  it("isParameter", () => {
    expect(AST.isParameter(AST.stringKeyword)).toEqual(true)
    expect(AST.isParameter(AST.symbolKeyword)).toEqual(true)
    expect(AST.isParameter(S.TemplateLiteral(S.String, S.Literal("-"), S.String).ast))
      .toEqual(true)
    expect(AST.isParameter(S.String.pipe(S.minLength(2)).ast)).toEqual(true)
    expect(AST.isParameter(S.TemplateLiteral(S.Literal("a", "b"), S.Literal("c")).ast)).toEqual(
      true
    )
    expect(AST.isParameter(S.Number.pipe(S.int()).ast)).toEqual(false)
    expect(AST.isParameter(S.NumberFromString.ast)).toEqual(false)
    expect(AST.isParameter(S.NumberFromString.pipe(S.int()).ast)).toEqual(false)
  })
})
