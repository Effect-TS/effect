import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"

describe.concurrent("AST.guards", () => {
  it("isDeclaration", () => {
    expect(AST.isDeclaration(S.optionFromSelf(S.number).ast)).toEqual(true)
    expect(AST.isDeclaration(S.number.ast)).toEqual(false)
  })

  it("isTemplateLiteral", () => {
    expect(AST.isTemplateLiteral(S.templateLiteral(S.literal("a"), S.string).ast)).toEqual(true)
    expect(AST.isTemplateLiteral(S.number.ast)).toEqual(false)
  })

  it("isLazy", () => {
    type A = readonly [number, A | null]
    const schema: S.Schema<A> = S.lazy<A>(
      () => S.tuple(S.number, S.union(schema, S.literal(null)))
    )
    expect(AST.isLazy(schema.ast)).toEqual(true)
    expect(AST.isLazy(S.number.ast)).toEqual(false)
  })

  it("isTransform", () => {
    expect(AST.isTransform(S.string.pipe(S.trim).ast)).toEqual(true)
    expect(AST.isTransform(S.number.ast)).toEqual(false)
  })

  it("isUndefinedKeyword", () => {
    expect(AST.isUndefinedKeyword(S.undefined.ast)).toEqual(true)
    expect(AST.isUndefinedKeyword(S.number.ast)).toEqual(false)
  })

  it("isVoidKeyword", () => {
    expect(AST.isVoidKeyword(S.void.ast)).toEqual(true)
    expect(AST.isVoidKeyword(S.unknown.ast)).toEqual(false)
  })

  it("isSymbolKeyword", () => {
    expect(AST.isSymbolKeyword(S.symbol.ast)).toEqual(true)
    expect(AST.isSymbolKeyword(S.unknown.ast)).toEqual(false)
  })

  it("isObjectKeyword", () => {
    expect(AST.isObjectKeyword(S.object.ast)).toEqual(true)
    expect(AST.isObjectKeyword(S.unknown.ast)).toEqual(false)
  })

  it("isEnums", () => {
    enum Fruits {
      Apple,
      Banana
    }
    expect(AST.isEnums(S.enums(Fruits).ast)).toEqual(true)
    expect(AST.isEnums(S.unknown.ast)).toEqual(false)
  })

  it("isNeverKeyword", () => {
    expect(AST.isNeverKeyword(S.never.ast)).toEqual(true)
    expect(AST.isNeverKeyword(S.unknown.ast)).toEqual(false)
  })

  it("isUniqueSymbol", () => {
    expect(AST.isUniqueSymbol(S.uniqueSymbol(Symbol.for("@effect/schema/test/a")).ast)).toEqual(
      true
    )
    expect(AST.isUniqueSymbol(S.unknown.ast)).toEqual(false)
  })

  it("isUnknownKeyword", () => {
    expect(AST.isUnknownKeyword(S.unknown.ast)).toEqual(true)
    expect(AST.isUnknownKeyword(S.any.ast)).toEqual(false)
  })

  it("isAnyKeyword", () => {
    expect(AST.isAnyKeyword(S.any.ast)).toEqual(true)
    expect(AST.isAnyKeyword(S.unknown.ast)).toEqual(false)
  })

  it("isBooleanKeyword", () => {
    expect(AST.isBooleanKeyword(S.boolean.ast)).toEqual(true)
    expect(AST.isBooleanKeyword(S.unknown.ast)).toEqual(false)
  })

  it("isBigIntKeyword", () => {
    expect(AST.isBigIntKeyword(S.bigint.ast)).toEqual(true)
    expect(AST.isBigIntKeyword(S.unknown.ast)).toEqual(false)
  })

  it("isParameter", () => {
    expect(AST.isParameter(AST.stringKeyword)).toEqual(true)
    expect(AST.isParameter(AST.symbolKeyword)).toEqual(true)
    expect(AST.isParameter(S.templateLiteral(S.string, S.literal("-"), S.string).ast))
      .toEqual(true)
    expect(AST.isParameter(S.string.pipe(S.minLength(2)).ast)).toEqual(true)
    expect(AST.isParameter(S.number.pipe(S.int()).ast)).toEqual(false)
    expect(AST.isParameter(S.NumberFromString.ast)).toEqual(false)
    expect(AST.isParameter(S.NumberFromString.pipe(S.int()).ast))
    expect(AST.isParameter(S.templateLiteral(S.literal("a", "b"), S.literal("c")).ast)).toEqual(
      false
    )
  })
})
