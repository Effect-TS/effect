import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue } from "@effect/vitest/utils"
import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"

describe("guards", () => {
  it("isDeclaration", () => {
    assertTrue(AST.isDeclaration(S.OptionFromSelf(S.Number).ast))
    assertFalse(AST.isDeclaration(S.Number.ast))
  })

  it("isTemplateLiteral", () => {
    assertTrue(AST.isTemplateLiteral(S.TemplateLiteral(S.Literal("a"), S.String).ast))
    assertFalse(AST.isTemplateLiteral(S.Number.ast))
  })

  it("isSuspend", () => {
    type A = readonly [number, A | null]
    const schema: S.Schema<A> = S.suspend( // intended outer suspend
      () => S.Tuple(S.Number, S.Union(schema, S.Literal(null)))
    )
    assertTrue(AST.isSuspend(schema.ast))
    assertFalse(AST.isSuspend(S.Number.ast))
  })

  it("isTransform", () => {
    assertTrue(AST.isTransformation(S.Trim.ast))
    assertFalse(AST.isTransformation(S.Number.ast))
  })

  it("isUndefinedKeyword", () => {
    assertTrue(AST.isUndefinedKeyword(S.Undefined.ast))
    assertFalse(AST.isUndefinedKeyword(S.Number.ast))
  })

  it("isVoidKeyword", () => {
    assertTrue(AST.isVoidKeyword(S.Void.ast))
    assertFalse(AST.isVoidKeyword(S.Unknown.ast))
  })

  it("isSymbolKeyword", () => {
    assertTrue(AST.isSymbolKeyword(S.SymbolFromSelf.ast))
    assertFalse(AST.isSymbolKeyword(S.Unknown.ast))
  })

  it("isObjectKeyword", () => {
    assertTrue(AST.isObjectKeyword(S.Object.ast))
    assertFalse(AST.isObjectKeyword(S.Unknown.ast))
  })

  it("isEnums", () => {
    enum Fruits {
      Apple,
      Banana
    }
    assertTrue(AST.isEnums(S.Enums(Fruits).ast))
    assertFalse(AST.isEnums(S.Unknown.ast))
  })

  it("isNeverKeyword", () => {
    assertTrue(AST.isNeverKeyword(S.Never.ast))
    assertFalse(AST.isNeverKeyword(S.Unknown.ast))
  })

  it("isUniqueSymbol", () => {
    assertTrue(AST.isUniqueSymbol(S.UniqueSymbolFromSelf(Symbol.for("effect/Schema/test/a")).ast))
    assertFalse(AST.isUniqueSymbol(S.Unknown.ast))
  })

  it("isUnknownKeyword", () => {
    assertTrue(AST.isUnknownKeyword(S.Unknown.ast))
    assertFalse(AST.isUnknownKeyword(S.Any.ast))
  })

  it("isAnyKeyword", () => {
    assertTrue(AST.isAnyKeyword(S.Any.ast))
    assertFalse(AST.isAnyKeyword(S.Unknown.ast))
  })

  it("isBooleanKeyword", () => {
    assertTrue(AST.isBooleanKeyword(S.Boolean.ast))
    assertFalse(AST.isBooleanKeyword(S.Unknown.ast))
  })

  it("isBigIntKeyword", () => {
    assertTrue(AST.isBigIntKeyword(S.BigIntFromSelf.ast))
    assertFalse(AST.isBigIntKeyword(S.Unknown.ast))
  })

  it("isParameter", () => {
    assertTrue(AST.isParameter(AST.stringKeyword))
    assertTrue(AST.isParameter(AST.symbolKeyword))
    assertTrue(AST.isParameter(S.TemplateLiteral(S.String, S.Literal("-"), S.String).ast))
    assertTrue(AST.isParameter(S.String.pipe(S.minLength(2)).ast))
    assertTrue(AST.isParameter(S.TemplateLiteral(S.Literal("a", "b"), S.Literal("c")).ast))
    assertFalse(AST.isParameter(S.Number.pipe(S.int()).ast))
    assertFalse(AST.isParameter(S.NumberFromString.ast))
    assertFalse(AST.isParameter(S.NumberFromString.pipe(S.int()).ast))
  })
})
