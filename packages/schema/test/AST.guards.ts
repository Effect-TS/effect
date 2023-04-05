import { pipe } from "@effect/data/Function"
import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"

it("isDeclaration", () => {
  expect(AST.isDeclaration(S.optionFromSelf(S.number).ast)).toEqual(true)
  expect(AST.isDeclaration(S.number.ast)).toEqual(false)
})

it("isTemplateLiteral", () => {
  expect(AST.isTemplateLiteral(S.templateLiteral(S.literal("a"), S.string).ast)).toEqual(true)
  expect(AST.isTemplateLiteral(S.number.ast)).toEqual(false)
})

it("isLazy", () => {
  expect(AST.isLazy(S.json.ast)).toEqual(true)
  expect(AST.isLazy(S.number.ast)).toEqual(false)
})

it("isTransform", () => {
  expect(AST.isTransform(pipe(S.string, S.trim).ast)).toEqual(true)
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
