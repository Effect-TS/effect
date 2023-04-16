import { pipe } from "@effect/data/Function"
import * as O from "@effect/data/Option"
import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"

describe.concurrent("getPropertySignatures", () => {
  it("struct/ string keys", () => {
    const schema = S.struct({ a: S.string, b: S.number })
    expect(AST.getPropertySignatures(schema.ast)).toEqual([
      AST.createPropertySignature("a", S.string.ast, false, true),
      AST.createPropertySignature("b", S.number.ast, false, true)
    ])
  })

  it("struct/ symbol keys", () => {
    const a = Symbol.for("@effect/schema/test/a")
    const b = Symbol.for("@effect/schema/test/b")
    const schema = S.struct({ [a]: S.string, [b]: S.number })
    expect(AST.getPropertySignatures(schema.ast)).toEqual([
      AST.createPropertySignature(a, S.string.ast, false, true),
      AST.createPropertySignature(b, S.number.ast, false, true)
    ])
  })

  it("struct/ should preserve field annotations", () => {
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

  it("lazy", () => {
    interface Category {
      readonly name: string
      readonly categories: ReadonlyArray<Category>
    }
    const schema: S.Schema<Category> = S.lazy<Category>(() =>
      S.struct({
        name: S.string,
        categories: S.array(schema)
      })
    )
    expect(AST.getPropertySignatures(schema.ast)).toEqual([
      AST.createPropertySignature("name", S.string.ast, false, true),
      AST.createPropertySignature(
        "categories",
        AST.createTuple([], O.some([schema.ast]), true),
        false,
        true
      )
    ])
  })

  it("should throw on unsupported schemas", () => {
    expect(() => AST.getPropertySignatures(S.string.ast)).toThrowError(
      new Error("getPropertySignatures: unsupported schema (StringKeyword)")
    )
  })
})
