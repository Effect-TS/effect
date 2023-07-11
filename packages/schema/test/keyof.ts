import * as AST from "@effect/schema/AST"
import * as P from "@effect/schema/Parser"
import * as S from "@effect/schema/Schema"

describe.concurrent("keyof", () => {
  it("struct/ string keys", () => {
    const schema = S.struct({
      a: S.string,
      b: S.number
    })
    const keyOf = S.keyof(schema)
    const is = P.is(keyOf)
    expect(is("a")).toEqual(true)
    expect(is("b")).toEqual(true)
    expect(is("c")).toEqual(false)
  })

  it("struct/ symbol keys", () => {
    const a = Symbol.for("@effect/schema/test/a")
    const b = Symbol.for("@effect/schema/test/b")
    const schema = S.struct({
      [a]: S.string,
      [b]: S.number
    })
    const keyOf = S.keyof(schema)
    const is = P.is(keyOf)
    expect(is(a)).toEqual(true)
    expect(is(b)).toEqual(true)
    expect(is("a")).toEqual(false)
    expect(is("b")).toEqual(false)
  })

  it("should unify string literals with string", () => {
    const schema = S.struct({ a: S.string }).pipe(S.extend(S.record(S.string, S.string)))
    expect(AST.keyof(schema.ast)).toEqual(S.string.ast)
  })

  it("should unify symbol literals with symbol", () => {
    const a = Symbol.for("@effect/schema/test/a")
    const schema = S.struct({ [a]: S.string }).pipe(S.extend(S.record(S.symbol, S.string)))
    expect(AST.keyof(schema.ast)).toEqual(S.symbol.ast)
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
    expect(AST.keyof(schema.ast)).toEqual(S.literal("name", "categories").ast)
  })

  it("should throw on unsupported schemas", () => {
    expect(() => AST.keyof(S.NumberFromString.ast)).toThrowError(
      new Error("keyof: unsupported schema (Transform)")
    )
  })
})
