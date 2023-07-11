import * as P from "@effect/schema/Parser"
import * as S from "@effect/schema/Schema"

describe.concurrent("is", () => {
  it("never", () => {
    const is = P.is(S.never)
    expect(is(1)).toEqual(false)
  })

  it("string", () => {
    const is = P.is(S.string)
    expect(is("a")).toEqual(true)
    expect(is(1)).toEqual(false)
  })

  it("number", () => {
    const is = P.is(S.number)
    expect(is(1)).toEqual(true)
    expect(is(NaN)).toEqual(true)
    expect(is(Infinity)).toEqual(true)
    expect(is(-Infinity)).toEqual(true)
    expect(is("a")).toEqual(false)
  })

  it("boolean", () => {
    const is = P.is(S.boolean)
    expect(is(true)).toEqual(true)
    expect(is(false)).toEqual(true)
    expect(is(1)).toEqual(false)
  })

  it("bigint", () => {
    const is = P.is(S.bigint)
    expect(is(0n)).toEqual(true)
    expect(is(1n)).toEqual(true)
    expect(is(BigInt("1"))).toEqual(true)
    expect(is(null)).toEqual(false)
    expect(is(1.2)).toEqual(false)
  })

  it("symbol", () => {
    const a = Symbol.for("@effect/schema/test/a")
    const is = P.is(S.symbol)
    expect(is(a)).toEqual(true)
    expect(is("@effect/schema/test/a")).toEqual(false)
  })

  it("object", () => {
    const is = P.is(S.object)
    expect(is({})).toEqual(true)
    expect(is([])).toEqual(true)
    expect(is(null)).toEqual(false)
    expect(is("a")).toEqual(false)
    expect(is(1)).toEqual(false)
    expect(is(true)).toEqual(false)
  })

  it("literal 1 member", () => {
    const schema = S.literal(1)
    const is = P.is(schema)
    expect(is(1)).toEqual(true)
    expect(is("a")).toEqual(false)
    expect(is(null)).toEqual(false)
  })

  it("literal 2 members", () => {
    const schema = S.literal(1, "a")
    const is = P.is(schema)
    expect(is(1)).toEqual(true)
    expect(is("a")).toEqual(true)
    expect(is(null)).toEqual(false)
  })

  it("uniqueSymbol", () => {
    const a = Symbol.for("@effect/schema/test/a")
    const schema = S.uniqueSymbol(a)
    const is = P.is(schema)
    expect(is(a)).toEqual(true)
    expect(is(Symbol.for("@effect/schema/test/a"))).toEqual(true)
    expect(is("Symbol(@effect/schema/test/a)")).toEqual(false)
  })

  it("Numeric enums", () => {
    enum Fruits {
      Apple,
      Banana
    }
    const schema = S.enums(Fruits)
    const is = P.is(schema)
    expect(is(Fruits.Apple)).toEqual(true)
    expect(is(Fruits.Banana)).toEqual(true)
    expect(is(0)).toEqual(true)
    expect(is(1)).toEqual(true)
    expect(is(3)).toEqual(false)
  })

  it("String enums", () => {
    enum Fruits {
      Apple = "apple",
      Banana = "banana",
      Cantaloupe = 0
    }
    const schema = S.enums(Fruits)
    const is = P.is(schema)
    expect(is(Fruits.Apple)).toEqual(true)
    expect(is(Fruits.Cantaloupe)).toEqual(true)
    expect(is("apple")).toEqual(true)
    expect(is("banana")).toEqual(true)
    expect(is(0)).toEqual(true)
    expect(is("Cantaloupe")).toEqual(false)
  })

  it("Const enums", () => {
    const Fruits = {
      Apple: "apple",
      Banana: "banana",
      Cantaloupe: 3
    } as const
    const schema = S.enums(Fruits)
    const is = P.is(schema)
    expect(is("apple")).toEqual(true)
    expect(is("banana")).toEqual(true)
    expect(is(3)).toEqual(true)
    expect(is("Cantaloupe")).toEqual(false)
  })

  it("tuple. empty", () => {
    const schema = S.tuple()
    const is = P.is(schema)
    expect(is([])).toEqual(true)

    expect(is(null)).toEqual(false)
    expect(is([undefined])).toEqual(false)
    expect(is([1])).toEqual(false)
    expect(is({})).toEqual(false)
  })

  it("tuple. required element", () => {
    const schema = S.tuple(S.number)
    const is = P.is(schema)
    expect(is([1])).toEqual(true)

    expect(is(null)).toEqual(false)
    expect(is([])).toEqual(false)
    expect(is([undefined])).toEqual(false)
    expect(is(["a"])).toEqual(false)
    expect(is([1, "b"])).toEqual(false)
  })

  it("tuple. required element with undefined", () => {
    const schema = S.tuple(S.union(S.number, S.undefined))
    const is = P.is(schema)
    expect(is([1])).toEqual(true)
    expect(is([undefined])).toEqual(true)

    expect(is(null)).toEqual(false)
    expect(is([])).toEqual(false)
    expect(is(["a"])).toEqual(false)
    expect(is([1, "b"])).toEqual(false)
  })

  it("tuple. optional element", () => {
    const schema = S.tuple().pipe(S.optionalElement(S.number))
    const is = P.is(schema)
    expect(is([])).toEqual(true)
    expect(is([1])).toEqual(true)

    expect(is(null)).toEqual(false)
    expect(is(["a"])).toEqual(false)
    expect(is([undefined])).toEqual(false)
    expect(is([1, "b"])).toEqual(false)
  })

  it("tuple. optional element with undefined", () => {
    const schema = S.tuple().pipe(S.optionalElement(S.union(S.number, S.undefined)))
    const is = P.is(schema)
    expect(is([])).toEqual(true)
    expect(is([1])).toEqual(true)
    expect(is([undefined])).toEqual(true)

    expect(is(null)).toEqual(false)
    expect(is(["a"])).toEqual(false)
    expect(is([1, "b"])).toEqual(false)
  })

  it("tuple. e + e?", () => {
    const schema = S.tuple(S.string).pipe(S.optionalElement(S.number))
    const is = P.is(schema)
    expect(is(["a"])).toEqual(true)
    expect(is(["a", 1])).toEqual(true)

    expect(is([1])).toEqual(false)
    expect(is(["a", "b"])).toEqual(false)
  })

  it("tuple. e + r", () => {
    const schema = S.tuple(S.string).pipe(S.rest(S.number))
    const is = P.is(schema)
    expect(is(["a"])).toEqual(true)
    expect(is(["a", 1])).toEqual(true)
    expect(is(["a", 1, 2])).toEqual(true)

    expect(is([])).toEqual(false)
  })

  it("tuple. e? + r", () => {
    const schema = S.tuple().pipe(S.optionalElement(S.string), S.rest(S.number))
    const is = P.is(schema)
    expect(is([])).toEqual(true)
    expect(is(["a"])).toEqual(true)
    expect(is(["a", 1])).toEqual(true)
    expect(is(["a", 1, 2])).toEqual(true)

    expect(is([1])).toEqual(false)
  })

  it("tuple. r", () => {
    const schema = S.array(S.number)
    const is = P.is(schema)
    expect(is([])).toEqual(true)
    expect(is([1])).toEqual(true)
    expect(is([1, 2])).toEqual(true)

    expect(is(["a"])).toEqual(false)
    expect(is([1, "a"])).toEqual(false)
  })

  it("tuple. r + e", () => {
    const schema = S.array(S.string).pipe(S.element(S.number))
    const is = P.is(schema)
    expect(is([1])).toEqual(true)
    expect(is(["a", 1])).toEqual(true)
    expect(is(["a", "b", 1])).toEqual(true)

    expect(is([])).toEqual(false)
    expect(is(["a"])).toEqual(false)
    expect(is([1, 2])).toEqual(false)
  })

  it("tuple. e + r + e", () => {
    const schema = S.tuple(S.string).pipe(S.rest(S.number), S.element(S.boolean))
    const is = P.is(schema)
    expect(is(["a", true])).toEqual(true)
    expect(is(["a", 1, true])).toEqual(true)
    expect(is(["a", 1, 2, true])).toEqual(true)

    expect(is([])).toEqual(false)
    expect(is(["a"])).toEqual(false)
    expect(is([true])).toEqual(false)
    expect(is(["a", 1])).toEqual(false)
    expect(is([1, true])).toEqual(false)
  })

  it("struct. empty", () => {
    const schema = S.struct({})
    const is = P.is(schema)
    expect(is({})).toEqual(true)
    expect(is({ a: 1 })).toEqual(true)
    expect(is([])).toEqual(true)

    expect(is(null)).toEqual(false)
    expect(is(undefined)).toEqual(false)
  })

  describe.concurrent("struct", () => {
    it("required property signature", () => {
      const schema = S.struct({ a: S.number })
      const is = P.is(schema)
      expect(is({ a: 1 })).toEqual(true)
      expect(is({ a: 1, b: "b" })).toEqual(true)

      expect(is(null)).toEqual(false)
      expect(is({})).toEqual(false)
      expect(is({ a: undefined })).toEqual(false)
      expect(is({ a: "a" })).toEqual(false)
    })

    it("required property signature with undefined", () => {
      const schema = S.struct({ a: S.union(S.number, S.undefined) })
      const is = P.is(schema)
      expect(is({ a: 1 })).toEqual(true)
      expect(is({ a: undefined })).toEqual(true)
      expect(is({ a: 1, b: "b" })).toEqual(true)

      expect(is(null)).toEqual(false)
      expect(is({})).toEqual(false)
      expect(is({ a: "a" })).toEqual(false)
    })

    it("optional property signature", () => {
      const schema = S.struct({ a: S.optional(S.number) })
      const is = P.is(schema)
      expect(is({})).toEqual(true)
      expect(is({ a: 1 })).toEqual(true)
      expect(is({ a: 1, b: "b" })).toEqual(true)

      expect(is(null)).toEqual(false)
      expect(is({ a: "a" })).toEqual(false)
      expect(is({ a: undefined })).toEqual(false)
    })

    it("optional property signature with undefined", () => {
      const schema = S.struct({ a: S.optional(S.union(S.number, S.undefined)) })
      const is = P.is(schema)
      expect(is({})).toEqual(true)
      expect(is({ a: 1 })).toEqual(true)
      expect(is({ a: undefined })).toEqual(true)
      expect(is({ a: 1, b: "b" })).toEqual(true)

      expect(is(null)).toEqual(false)
      expect(is({ a: "a" })).toEqual(false)
    })
  })

  it("record(string, string)", () => {
    const a = Symbol.for("@effect/schema/test/a")
    const schema = S.record(S.string, S.string)
    const is = P.is(schema)
    expect(is(null)).toEqual(false)
    expect(is({})).toEqual(true)
    expect(is({ a: "a" })).toEqual(true)
    expect(is({ a: 1 })).toEqual(false)
    expect(is({ [a]: 1 })).toEqual(true)
    expect(is({ a: "a", b: "b" })).toEqual(true)
    expect(is({ a: "a", b: 1 })).toEqual(false)
    expect(is({ [a]: 1, b: "b" })).toEqual(true)
  })

  it("record(symbol, string)", () => {
    const a = Symbol.for("@effect/schema/test/a")
    const b = Symbol.for("@effect/schema/test/b")
    const schema = S.record(S.symbol, S.string)
    const is = P.is(schema)
    expect(is(null)).toEqual(false)
    expect(is({})).toEqual(true)
    expect(is({ [a]: "a" })).toEqual(true)
    expect(is({ [a]: 1 })).toEqual(false)
    expect(is({ a: 1 })).toEqual(true)
    expect(is({ [a]: "a", [b]: "b" })).toEqual(true)
    expect(is({ [a]: "a", [b]: 1 })).toEqual(false)
    expect(is({ a: 1, [b]: "b" })).toEqual(true)
  })

  it("record(never, number)", () => {
    const schema = S.record(S.never, S.number)
    const is = P.is(schema)
    expect(is({})).toEqual(true)
    expect(is({ a: 1 })).toEqual(true)
  })

  it("record('a' | 'b', number)", () => {
    const schema = S.record(S.union(S.literal("a"), S.literal("b")), S.number)
    const is = P.is(schema)
    expect(is({ a: 1, b: 2 })).toEqual(true)

    expect(is({})).toEqual(false)
    expect(is({ a: 1 })).toEqual(false)
    expect(is({ b: 2 })).toEqual(false)
  })

  it("record(keyof struct({ a, b }), number)", () => {
    const schema = S.record(S.keyof(S.struct({ a: S.string, b: S.string })), S.number)
    const is = P.is(schema)
    expect(is({ a: 1, b: 2 })).toEqual(true)

    expect(is({})).toEqual(false)
    expect(is({ a: 1 })).toEqual(false)
    expect(is({ b: 2 })).toEqual(false)
    expect(is({ a: "a" })).toEqual(false)
  })

  it("record(keyof struct({ a, b } & Record<string, string>), number)", () => {
    const schema = S.record(
      S.keyof(S.struct({ a: S.string, b: S.string }).pipe(S.extend(S.record(S.string, S.string)))),
      S.number
    )
    const is = P.is(schema)
    expect(is({ a: 1, b: 2 })).toEqual(true)
    expect(is({})).toEqual(true)
    expect(is({ a: 1 })).toEqual(true)
    expect(is({ b: 2 })).toEqual(true)

    expect(is({ a: "a" })).toEqual(false)
  })

  it("record(keyof struct({ a, b } & Record<symbol, string>), number)", () => {
    const schema = S.record(
      S.keyof(S.struct({ a: S.string, b: S.string }).pipe(S.extend(S.record(S.symbol, S.string)))),
      S.number
    )
    const is = P.is(schema)
    expect(is({ a: 1, b: 2 })).toEqual(true)
    const c = Symbol.for("@effect/schema/test/c")
    expect(is({ a: 1, b: 2, [c]: 3 })).toEqual(true)

    expect(is({})).toEqual(false)
    expect(is({ a: 1 })).toEqual(false)
    expect(is({ b: 2 })).toEqual(false)
    expect(is({ a: "a" })).toEqual(false)
    expect(is({ a: 1, b: 2, [c]: "c" })).toEqual(false)
  })

  it("record(Symbol('a') | Symbol('b'), number)", () => {
    const a = Symbol.for("@effect/schema/test/a")
    const b = Symbol.for("@effect/schema/test/b")
    const schema = S.record(S.union(S.uniqueSymbol(a), S.uniqueSymbol(b)), S.number)
    const is = P.is(schema)
    expect(is({ [a]: 1, [b]: 2 })).toEqual(true)

    expect(is({})).toEqual(false)
    expect(is({ a: 1 })).toEqual(false)
    expect(is({ b: 2 })).toEqual(false)
  })

  it("record(${string}-${string}, number)", () => {
    const schema = S.record(S.templateLiteral(S.string, S.literal("-"), S.string), S.number)
    const is = P.is(schema)
    expect(is({})).toEqual(true)
    expect(is({ "-": 1 })).toEqual(true)
    expect(is({ "a-": 1 })).toEqual(true)
    expect(is({ "-b": 1 })).toEqual(true)
    expect(is({ "a-b": 1 })).toEqual(true)

    expect(is({ "": 1 })).toEqual(false)
    expect(is({ "-": "a" })).toEqual(false)
  })

  it("record(minLength(1), number)", () => {
    const schema = S.record(S.string.pipe(S.minLength(2)), S.number)
    const is = P.is(schema)
    expect(is({})).toEqual(true)
    expect(is({ "aa": 1 })).toEqual(true)
    expect(is({ "aaa": 1 })).toEqual(true)

    expect(is({ "": 1 })).toEqual(false)
    expect(is({ "a": 1 })).toEqual(false)
  })

  it("union", () => {
    const schema = S.union(S.string, S.number)
    const is = P.is(schema)
    expect(is(null)).toEqual(false)
    expect(is(1)).toEqual(true)
    expect(is("a")).toEqual(true)
  })

  describe.concurrent("lazy", () => {
    it("baseline", () => {
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
      const is = P.is(schema)
      expect(is({ name: "a", categories: [] })).toEqual(true)
      expect(
        is({
          name: "a",
          categories: [{
            name: "b",
            categories: [{ name: "c", categories: [] }]
          }]
        })
      ).toEqual(true)
      expect(is({ name: "a", categories: [1] })).toEqual(false)
    })

    it("mutually recursive", () => {
      interface A {
        readonly a: string
        readonly bs: ReadonlyArray<B>
      }
      interface B {
        readonly b: number
        readonly as: ReadonlyArray<A>
      }
      const schemaA: S.Schema<A> = S.lazy<A>(() =>
        S.struct({
          a: S.string,
          bs: S.array(schemaB)
        })
      )
      const schemaB: S.Schema<B> = S.lazy<B>(() =>
        S.struct({
          b: S.number,
          as: S.array(schemaA)
        })
      )
      const isA = P.is(schemaA)
      expect(isA({ a: "a1", bs: [] })).toEqual(true)
      expect(isA({ a: "a1", bs: [{ b: 1, as: [] }] })).toEqual(true)
      expect(
        isA({ a: "a1", bs: [{ b: 1, as: [{ a: "a2", bs: [] }] }] })
      ).toEqual(true)
      expect(
        isA({ a: "a1", bs: [{ b: 1, as: [{ a: "a2", bs: [null] }] }] })
      ).toEqual(false)
    })
  })

  it("union", () => {
    const schema = S.union(S.string, S.number)
    const is = P.is(schema)
    expect(is(null)).toEqual(false)
    expect(is(1)).toEqual(true)
    expect(is("a")).toEqual(true)
  })

  describe.concurrent("rest", () => {
    it("baseline", () => {
      const schema = S.tuple(S.string, S.number).pipe(S.rest(S.boolean))
      const is = P.is(schema)
      expect(is(["a", 1])).toEqual(true)
      expect(is(["a", 1, true])).toEqual(true)
      expect(is(["a", 1, true, false])).toEqual(true)
      expect(is(["a", 1, true, "a"])).toEqual(false)
      expect(is(["a", 1, true, "a", true])).toEqual(false)
    })
  })

  describe.concurrent("extend", () => {
    it("struct", () => {
      const schema = S.struct({ a: S.string }).pipe(
        S.extend(S.struct({ b: S.number }))
      )
      const is = P.is(schema)
      expect(is({ a: "a", b: 1 })).toEqual(true)

      expect(is({})).toEqual(false)
      expect(is({ a: "a" })).toEqual(false)
    })

    it("record(string, string)", () => {
      const schema = S.struct({ a: S.string }).pipe(
        S.extend(S.record(S.string, S.string))
      )
      const is = P.is(schema)
      expect(is({ a: "a" })).toEqual(true)
      expect(is({ a: "a", b: "b" })).toEqual(true)

      expect(is({})).toEqual(false)
      expect(is({ b: "b" })).toEqual(false)
      expect(is({ a: 1 })).toEqual(false)
      expect(is({ a: "a", b: 2 })).toEqual(false)
    })
  })

  it("nonEmpty", () => {
    const schema = S.string.pipe(S.nonEmpty())
    const is = P.is(schema)
    expect(is("a")).toEqual(true)
    expect(is("aa")).toEqual(true)

    expect(is("")).toEqual(false)
  })
})
