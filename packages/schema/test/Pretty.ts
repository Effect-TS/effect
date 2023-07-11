import * as AST from "@effect/schema/AST"
import * as P from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"

describe.concurrent("Pretty", () => {
  it("exports", () => {
    expect(P.to).exist
    expect(P.PrettyHookId).exist
  })

  it("to", () => {
    const schema = S.NumberFromString
    const pretty = P.to(schema)
    expect(pretty(1)).toEqual(`1`)
  })

  it("from", () => {
    const schema = S.NumberFromString
    const pretty = P.from(schema)
    expect(pretty("a")).toEqual(`"a"`)
  })

  it("templateLiteral. a${string}b", () => {
    const schema = S.templateLiteral(S.literal("a"), S.string, S.literal("b"))
    const pretty = P.to(schema)
    expect(pretty("acb")).toEqual(`"acb"`)
  })

  it("never", () => {
    const schema = S.never
    const pretty = P.to(schema)
    expect(() => pretty("a" as any as never)).toThrowError(
      new Error("cannot pretty print a `never` value")
    )
  })

  it("unknown", () => {
    const schema = S.unknown
    const pretty = P.to(schema)
    expect(pretty("a")).toEqual(`"a"`)
    expect(pretty(1n)).toEqual(`1n`)
  })

  it("string", () => {
    const schema = S.string
    const pretty = P.to(schema)
    expect(pretty("a")).toEqual(`"a"`)
  })

  it("number", () => {
    const schema = S.number
    const pretty = P.to(schema)
    expect(pretty(1)).toEqual("1")
    expect(pretty(NaN)).toEqual("NaN")
    expect(pretty(Infinity)).toEqual("Infinity")
    expect(pretty(-Infinity)).toEqual("-Infinity")
  })

  it("boolean", () => {
    const schema = S.boolean
    const pretty = P.to(schema)
    expect(pretty(true)).toEqual("true")
  })

  it("bigint", () => {
    const pretty = P.to(S.bigint)
    expect(pretty(1n)).toEqual("1n")
  })

  it("symbol", () => {
    const pretty = P.to(S.symbol)
    expect(pretty(Symbol.for("@effect/data/test/a"))).toEqual("Symbol(@effect/data/test/a)")
  })

  it("void", () => {
    const pretty = P.to(S.void)
    expect(pretty(undefined)).toEqual("void(0)")
  })

  it("literal/ null", () => {
    const schema = S.literal(null)
    const pretty = P.to(schema)
    expect(pretty(null)).toEqual("null")
  })

  it("literal/ bigint", () => {
    const schema = S.literal(1n)
    const pretty = P.to(schema)
    expect(pretty(1n)).toEqual("1n")
  })

  it("uniqueSymbol", () => {
    const a = Symbol.for("@effect/schema/test/a")
    const schema = S.uniqueSymbol(a)
    const pretty = P.to(schema)
    expect(pretty(a)).toEqual("Symbol(@effect/schema/test/a)")
  })

  it("Numeric enums", () => {
    enum Fruits {
      Apple,
      Banana
    }
    const schema = S.enums(Fruits)
    const pretty = P.to(schema)
    expect(pretty(Fruits.Apple)).toEqual(`0`)
    expect(pretty(Fruits.Banana)).toEqual(`1`)
  })

  it("String enums", () => {
    enum Fruits {
      Apple = "apple",
      Banana = "banana",
      Cantaloupe = 0
    }
    const schema = S.enums(Fruits)
    const pretty = P.to(schema)
    expect(pretty(Fruits.Apple)).toEqual(`"apple"`)
    expect(pretty(Fruits.Banana)).toEqual(`"banana"`)
    expect(pretty(Fruits.Cantaloupe)).toEqual(`0`)
  })

  it("Const enums", () => {
    const Fruits = {
      Apple: "apple",
      Banana: "banana",
      Cantaloupe: 3
    } as const
    const schema = S.enums(Fruits)
    const pretty = P.to(schema)
    expect(pretty(Fruits.Apple)).toEqual(`"apple"`)
    expect(pretty(Fruits.Banana)).toEqual(`"banana"`)
    expect(pretty(Fruits.Cantaloupe)).toEqual(`3`)
  })

  it("struct/ baseline", () => {
    const schema = S.struct({ a: S.string, b: S.number })
    const pretty = P.to(schema)
    expect(pretty({ a: "a", b: 1 })).toEqual(
      `{ "a": "a", "b": 1 }`
    )
  })

  it("struct/ empty", () => {
    const schema = S.struct({})
    const pretty = P.to(schema)
    expect(pretty({})).toEqual(
      "{}"
    )
  })

  it("record(string, string)", () => {
    const schema = S.record(S.string, S.string)
    const pretty = P.to(schema)
    expect(pretty({ a: "a", b: "b" })).toEqual(
      `{ "a": "a", "b": "b" }`
    )
  })

  it("record(symbol, string)", () => {
    const a = Symbol.for("@effect/schema/test/a")
    const schema = S.record(S.symbol, S.string)
    const pretty = P.to(schema)
    expect(pretty({ [a]: "a" })).toEqual(
      `{ Symbol(@effect/schema/test/a): "a" }`
    )
  })

  it("struct/ should not output optional property signatures", () => {
    const schema = S.struct({ a: S.optional(S.number) })
    const pretty = P.to(schema)
    expect(pretty({})).toEqual("{}")
    expect(pretty({ a: 1 })).toEqual(`{ "a": 1 }`)
  })

  it("struct/ should escape keys", () => {
    const schema = S.struct({ "-": S.number })
    const pretty = P.to(schema)
    expect(pretty({ "-": 1 })).toEqual(`{ "-": 1 }`)
  })

  it("struct/ required property signature", () => {
    const schema = S.struct({ a: S.number })
    const pretty = P.to(schema)
    expect(pretty({ a: 1 })).toEqual(`{ "a": 1 }`)
    const x = { a: 1, b: "b" }
    expect(pretty(x)).toEqual(`{ "a": 1 }`)
  })

  it("struct/ required property signature with undefined", () => {
    const schema = S.struct({ a: S.union(S.number, S.undefined) })
    const pretty = P.to(schema)
    expect(pretty({ a: 1 })).toEqual(`{ "a": 1 }`)
    expect(pretty({ a: undefined })).toEqual(`{ "a": undefined }`)
    const x = { a: 1, b: "b" }
    expect(pretty(x)).toEqual(`{ "a": 1 }`)
  })

  it("struct/ optional property signature", () => {
    const schema = S.struct({ a: S.optional(S.number) })
    const pretty = P.to(schema)
    expect(pretty({})).toEqual(`{}`)
    expect(pretty({ a: 1 })).toEqual(`{ "a": 1 }`)
    const x = { a: 1, b: "b" }
    expect(pretty(x)).toEqual(`{ "a": 1 }`)
  })

  it("struct/ optional property signature with undefined", () => {
    const schema = S.struct({ a: S.optional(S.union(S.number, S.undefined)) })
    const pretty = P.to(schema)
    expect(pretty({})).toEqual(`{}`)
    expect(pretty({ a: 1 })).toEqual(`{ "a": 1 }`)
    const x = { a: 1, b: "b" }
    expect(pretty(x)).toEqual(`{ "a": 1 }`)
    expect(pretty({ a: undefined })).toEqual(`{ "a": undefined }`)
  })

  it("tuple/ required element", () => {
    const schema = S.tuple(S.number)
    const pretty = P.to(schema)
    expect(pretty([1])).toEqual(`[1]`)
    const x = [1, "b"] as any
    expect(pretty(x)).toEqual(`[1]`)
  })

  it("tuple/ required element with undefined", () => {
    const schema = S.tuple(S.union(S.number, S.undefined))
    const pretty = P.to(schema)
    expect(pretty([1])).toEqual(`[1]`)
    expect(pretty([undefined])).toEqual(`[undefined]`)
    const x = [1, "b"] as any
    expect(pretty(x)).toEqual(`[1]`)
  })

  it("tuple/ optional element", () => {
    const schema = S.tuple().pipe(S.optionalElement(S.number))
    const pretty = P.to(schema)
    expect(pretty([])).toEqual(`[]`)
    expect(pretty([1])).toEqual(`[1]`)
    const x = [1, "b"] as any
    expect(pretty(x)).toEqual(`[1]`)
  })

  it("tuple/ optional element with undefined", () => {
    const schema = S.tuple().pipe(S.optionalElement(S.union(S.number, S.undefined)))
    const pretty = P.to(schema)
    expect(pretty([])).toEqual(`[]`)
    expect(pretty([1])).toEqual(`[1]`)
    const x = [1, "b"] as any
    expect(pretty(x)).toEqual(`[1]`)
    expect(pretty([undefined])).toEqual(`[undefined]`)
  })

  it("tuple/ baseline", () => {
    const schema = S.tuple(S.string, S.number)
    const pretty = P.to(schema)
    expect(pretty(["a", 1])).toEqual(`["a", 1]`)
  })

  it("tuple/ empty tuple", () => {
    const schema = S.tuple()
    const pretty = P.to(schema)
    expect(pretty([])).toEqual(`[]`)
  })

  it("tuple/ optional elements", () => {
    const schema = S.tuple().pipe(S.optionalElement(S.string), S.optionalElement(S.number))
    const pretty = P.to(schema)
    expect(pretty([])).toEqual(`[]`)
    expect(pretty(["a"])).toEqual(`["a"]`)
    expect(pretty(["a", 1])).toEqual(`["a", 1]`)
  })

  it("tuple/ array", () => {
    const schema = S.array(S.string)
    const pretty = P.to(schema)
    expect(pretty([])).toEqual(`[]`)
    expect(pretty(["a"])).toEqual(`["a"]`)
  })

  it("tuple/ post rest element", () => {
    const schema = S.array(S.number).pipe(S.element(S.boolean))
    const pretty = P.to(schema)
    expect(pretty([true])).toEqual(`[true]`)
    expect(pretty([1, true])).toEqual(`[1, true]`)
    expect(pretty([1, 2, true])).toEqual(`[1, 2, true]`)
    expect(pretty([1, 2, 3, true])).toEqual(`[1, 2, 3, true]`)
  })

  it("tuple/ post rest elements", () => {
    const schema = S.array(S.number).pipe(
      S.element(S.boolean),
      S.element(S.union(S.string, S.undefined))
    )
    const pretty = P.to(schema)
    expect(pretty([true, "c"])).toEqual(`[true, "c"]`)
    expect(pretty([1, true, "c"])).toEqual(`[1, true, "c"]`)
    expect(pretty([1, 2, true, "c"])).toEqual(`[1, 2, true, "c"]`)
    expect(pretty([1, 2, 3, true, "c"])).toEqual(`[1, 2, 3, true, "c"]`)
    expect(pretty([1, 2, 3, true, undefined])).toEqual(`[1, 2, 3, true, undefined]`)
  })

  it("tuple/ post rest elements when rest is unknown", () => {
    const schema = S.array(S.unknown).pipe(S.element(S.boolean))
    const pretty = P.to(schema)
    expect(pretty([1, "a", 2, "b", true])).toEqual(`[1, "a", 2, "b", true]`)
    expect(pretty([true])).toEqual(`[true]`)
  })

  it("tuple/ all", () => {
    const schema = S.tuple(S.string).pipe(
      S.rest(S.number),
      S.element(S.boolean)
    )
    const pretty = P.to(schema)
    expect(pretty(["a", true])).toEqual(`["a", true]`)
    expect(pretty(["a", 1, true])).toEqual(`["a", 1, true]`)
    expect(pretty(["a", 1, 2, true])).toEqual(`["a", 1, 2, true]`)
  })

  it("tuple/ nonEmptyArray", () => {
    const schema = S.nonEmptyArray(S.number)
    const pretty = P.to(schema)
    expect(pretty([1])).toEqual(`[1]`)
    expect(pretty([1, 2])).toEqual(`[1, 2]`)
  })

  it("tuple/ ReadonlyArray<unknown>", () => {
    const schema = S.array(S.unknown)
    const pretty = P.to(schema)
    expect(pretty([])).toEqual(`[]`)
    expect(pretty(["a", 1, true])).toEqual(`["a", 1, true]`)
  })

  it("tuple/ ReadonlyArray<any>", () => {
    const schema = S.array(S.any)
    const pretty = P.to(schema)
    expect(pretty([])).toEqual(`[]`)
    expect(pretty(["a", 1, true])).toEqual(`["a", 1, true]`)
  })

  it("union/ primitives", () => {
    const schema = S.union(S.string, S.number)
    const pretty = P.to(schema)
    expect(pretty("a")).toEqual(
      `"a"`
    )
    expect(pretty(1)).toEqual(
      "1"
    )
  })

  it("union/ discriminated", () => {
    const schema = S.union(
      S.struct({ tag: S.literal("a"), a: S.string }),
      S.struct({ tag: S.literal("b"), b: S.number })
    )
    const pretty = P.to(schema)
    expect(pretty({ tag: "a", a: "-" })).toEqual(
      `{ "tag": "a", "a": "-" }`
    )
    expect(pretty({ tag: "b", b: 1 })).toEqual(
      `{ "tag": "b", "b": 1 }`
    )
  })

  it("lazy", () => {
    interface A {
      readonly a: string
      readonly as: ReadonlyArray<A>
    }
    const A: S.Schema<A> = S.lazy<A>(() =>
      S.struct({
        a: S.string,
        as: S.array(A)
      })
    )
    const pretty = P.to(A)
    expect(pretty({ a: "a", as: [] })).toEqual(
      `{ "a": "a", "as": [] }`
    )
  })

  it("Transform", () => {
    const pretty = P.to(S.string.pipe(S.trim))
    expect(pretty("a")).toEqual(`"a"`)
  })

  it("extend/ struct + record", () => {
    const schema = S.struct({ a: S.string }).pipe(
      S.extend(S.record(S.string, S.union(S.string, S.number)))
    )
    const pretty = P.to(schema)
    expect(pretty({ a: "a" })).toEqual(`{ "a": "a" }`)
    expect(pretty({ a: "a", b: "b", c: 1 })).toEqual(`{ "a": "a", "b": "b", "c": 1 }`)
  })

  it("should allow for custom compilers", () => {
    const match: typeof P.match = {
      ...P.match,
      "BooleanKeyword": () => (b: boolean) => b ? "True" : "False"
    }
    const go = AST.getCompiler(match)
    const pretty = <A>(schema: S.Schema<A>) => (a: A): string => go(schema.ast)(a)
    expect(pretty(S.boolean)(true)).toEqual(`True`)
    const schema = S.tuple(S.string, S.boolean)
    expect(pretty(schema)(["a", true])).toEqual(`["a", True]`)
  })
})
