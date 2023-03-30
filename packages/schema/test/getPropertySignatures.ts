import { pipe } from "@effect/data/Function"
import * as O from "@effect/data/Option"
import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"

describe.concurrent("getPropertySignatures", () => {
  it("_getPropertySignatures/ string", () => {
    const schema = S.string
    expect(AST._getPropertySignatures(schema.ast)).toEqual([])
  })

  it("_getPropertySignatures/ declaration", () => {
    const schema = S.optionFromSelf(S.number)
    expect(AST._getPropertySignatures(schema.ast)).toEqual([
      AST.createPropertySignature(
        "_tag",
        S.union(S.literal("Some"), S.literal("None")).ast,
        false,
        true
      )
    ])
  })

  it("_getPropertySignatures/ tuple", () => {
    const schema = S.tuple(S.string, S.number)
    expect(AST._getPropertySignatures(schema.ast)).toEqual([
      AST.createPropertySignature(0, S.string.ast, false, true),
      AST.createPropertySignature(1, S.number.ast, false, true)
    ])
  })

  it("_getPropertySignatures/struct string keys", () => {
    const schema = S.struct({ a: S.string, b: S.number })
    expect(AST._getPropertySignatures(schema.ast)).toEqual([
      AST.createPropertySignature("a", S.string.ast, false, true),
      AST.createPropertySignature("b", S.number.ast, false, true)
    ])
  })

  it("_getPropertySignatures/struct symbol keys", () => {
    const a = Symbol.for("@effect/schema/test/a")
    const b = Symbol.for("@effect/schema/test/b")
    const schema = S.struct({ [a]: S.string, [b]: S.number })
    expect(AST._getPropertySignatures(schema.ast)).toEqual([
      AST.createPropertySignature(a, S.string.ast, false, true),
      AST.createPropertySignature(b, S.number.ast, false, true)
    ])
  })

  it("_getPropertySignatures/union required property signatures", () => {
    const schema = S.union(
      S.struct({ a: S.string, b: S.number }),
      S.struct({ a: S.boolean, c: S.boolean })
    )
    expect(AST._getPropertySignatures(schema.ast)).toEqual([
      AST.createPropertySignature(
        "a",
        AST.createUnion([S.string.ast, S.boolean.ast]),
        false,
        true
      )
    ])
  })

  it("_getPropertySignatures/union optional property signatures", () => {
    const schema = S.union(
      S.struct({ a: S.string, b: S.number }),
      S.struct({ c: S.boolean, a: S.optional(S.boolean) })
    )
    expect(AST._getPropertySignatures(schema.ast)).toEqual([
      AST.createPropertySignature(
        "a",
        AST.createUnion([S.string.ast, S.boolean.ast]),
        true,
        true
      )
    ])
  })

  it("_getPropertySignatures/ lazy", () => {
    interface Category {
      readonly name: string
      readonly categories: ReadonlyArray<Category>
    }
    const Category: S.Schema<Category> = S.lazy<Category>(() =>
      S.struct({
        name: S.string,
        categories: S.array(Category)
      })
    )
    expect(AST._getPropertySignatures(Category.ast)).toEqual([
      AST.createPropertySignature("name", S.string.ast, false, true),
      AST.createPropertySignature(
        "categories",
        AST.createTuple([], O.some([Category.ast]), true),
        false,
        true
      )
    ])
  })

  it("_getPropertySignatures/Refinement", () => {
    const schema = pipe(
      S.struct({ a: S.optional(S.string), b: S.string }),
      S.filter(S.is(S.struct({ a: S.string })))
    )
    expect(() => AST._getPropertySignatures(schema.ast)).toThrowError(
      new Error("cannot compute property signatures for refinements")
    )
  })

  it("_getPropertySignatures/Transform", () => {
    const schema = S.optionFromNullable(S.number)
    expect(() => AST._getPropertySignatures(schema.ast)).toThrowError(
      new Error("cannot compute property signatures for transformations")
    )
  })

  it("getPropertySignatures/ struct", () => {
    const Name = pipe(S.string, S.identifier("name"))
    const Age = pipe(S.number, S.identifier("age"))
    const schema = S.struct({
      name: Name,
      age: Age
    })
    const shape = S.getPropertySignatures(schema)
    expect(shape.name).toStrictEqual(Name)
    expect(shape.age).toStrictEqual(Age)
  })
})
