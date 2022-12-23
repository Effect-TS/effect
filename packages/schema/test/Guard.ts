import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import * as DataOption from "@fp-ts/schema/data/Option"
import * as DataReadonlySet from "@fp-ts/schema/data/ReadonlySet"
import * as G from "@fp-ts/schema/Guard"
import * as S from "@fp-ts/schema/Schema"

const guardFor = G.guardFor

describe.concurrent("Guard", () => {
  it("exports", () => {
    expect(G.make).exist
    expect(G.guardFor).exist
  })

  it("never", () => {
    const guard = G.guardFor(S.never)
    expect(guard.is(1)).toEqual(false)
  })

  it("string", () => {
    const guard = G.guardFor(S.string)
    expect(guard.is("a")).toEqual(true)
    expect(guard.is(1)).toEqual(false)
  })

  it("number", () => {
    const guard = G.guardFor(S.number)
    expect(guard.is(1)).toEqual(true)
    expect(guard.is(NaN)).toEqual(true)
    expect(guard.is(Infinity)).toEqual(true)
    expect(guard.is(-Infinity)).toEqual(true)
    expect(guard.is("a")).toEqual(false)
  })

  it("boolean", () => {
    const guard = G.guardFor(S.boolean)
    expect(guard.is(true)).toEqual(true)
    expect(guard.is(false)).toEqual(true)
    expect(guard.is(1)).toEqual(false)
  })

  it("bigint", () => {
    const guard = G.guardFor(S.bigint)
    expect(guard.is(0n)).toEqual(true)
    expect(guard.is(1n)).toEqual(true)
    expect(guard.is(BigInt("1"))).toEqual(true)
    expect(guard.is(null)).toEqual(false)
    expect(guard.is(1.2)).toEqual(false)
  })

  it("symbol", () => {
    const a = Symbol.for("@fp-ts/schema/test/a")
    const guard = G.guardFor(S.symbol)
    expect(guard.is(a)).toEqual(true)
    expect(guard.is("@fp-ts/schema/test/a")).toEqual(false)
  })

  it("object", () => {
    const guard = G.guardFor(S.object)
    expect(guard.is({})).toEqual(true)
    expect(guard.is([])).toEqual(true)
    expect(guard.is(null)).toEqual(false)
    expect(guard.is("a")).toEqual(false)
    expect(guard.is(1)).toEqual(false)
    expect(guard.is(true)).toEqual(false)
  })

  it("literal 1 member", () => {
    const schema = S.literal(1)
    const guard = G.guardFor(schema)
    expect(guard.is(1)).toEqual(true)
    expect(guard.is("a")).toEqual(false)
    expect(guard.is(null)).toEqual(false)
  })

  it("literal 2 members", () => {
    const schema = S.literal(1, "a")
    const guard = G.guardFor(schema)
    expect(guard.is(1)).toEqual(true)
    expect(guard.is("a")).toEqual(true)
    expect(guard.is(null)).toEqual(false)
  })

  it("uniqueSymbol", () => {
    const a = Symbol.for("@fp-ts/schema/test/a")
    const schema = S.uniqueSymbol(a)
    const guard = G.guardFor(schema)
    expect(guard.is(a)).toEqual(true)
    expect(guard.is(Symbol.for("@fp-ts/schema/test/a"))).toEqual(true)
    expect(guard.is("Symbol(@fp-ts/schema/test/a)")).toEqual(false)
  })

  it("Numeric enums", () => {
    enum Fruits {
      Apple,
      Banana
    }
    const schema = S.enums(Fruits)
    const guard = G.guardFor(schema)
    expect(guard.is(Fruits.Apple)).toEqual(true)
    expect(guard.is(Fruits.Banana)).toEqual(true)
    expect(guard.is(0)).toEqual(true)
    expect(guard.is(1)).toEqual(true)
    expect(guard.is(3)).toEqual(false)
  })

  it("String enums", () => {
    enum Fruits {
      Apple = "apple",
      Banana = "banana",
      Cantaloupe = 0
    }
    const schema = S.enums(Fruits)
    const guard = G.guardFor(schema)
    expect(guard.is(Fruits.Apple)).toEqual(true)
    expect(guard.is(Fruits.Cantaloupe)).toEqual(true)
    expect(guard.is("apple")).toEqual(true)
    expect(guard.is("banana")).toEqual(true)
    expect(guard.is(0)).toEqual(true)
    expect(guard.is("Cantaloupe")).toEqual(false)
  })

  it("Const enums", () => {
    const Fruits = {
      Apple: "apple",
      Banana: "banana",
      Cantaloupe: 3
    } as const
    const schema = S.enums(Fruits)
    const guard = G.guardFor(schema)
    expect(guard.is("apple")).toEqual(true)
    expect(guard.is("banana")).toEqual(true)
    expect(guard.is(3)).toEqual(true)
    expect(guard.is("Cantaloupe")).toEqual(false)
  })

  it("tuple. empty", () => {
    const schema = S.tuple()
    const guard = G.guardFor(schema)
    expect(guard.is([])).toEqual(true)
    expect(guard.is([undefined])).toEqual(true)
    expect(guard.is([1])).toEqual(true)

    expect(guard.is(null)).toEqual(false)
    expect(guard.is({})).toEqual(false)
  })

  it("tuple. required element", () => {
    const schema = S.tuple(S.number)
    const guard = G.guardFor(schema)
    expect(guard.is([1])).toEqual(true)
    expect(guard.is([1, "b"])).toEqual(true)

    expect(guard.is(null)).toEqual(false)
    expect(guard.is([])).toEqual(false)
    expect(guard.is([undefined])).toEqual(false)
    expect(guard.is(["a"])).toEqual(false)
  })

  it("tuple. required element with undefined", () => {
    const schema = S.tuple(S.union(S.number, S.undefined))
    const guard = G.guardFor(schema)
    expect(guard.is([1])).toEqual(true)
    expect(guard.is([1, "b"])).toEqual(true)
    expect(guard.is([undefined])).toEqual(true)

    expect(guard.is(null)).toEqual(false)
    expect(guard.is([])).toEqual(false)
    expect(guard.is(["a"])).toEqual(false)
  })

  it("tuple. optional element", () => {
    const schema = pipe(S.tuple(), S.optionalElement(S.number))
    const guard = G.guardFor(schema)
    expect(guard.is([])).toEqual(true)
    expect(guard.is([1])).toEqual(true)
    expect(guard.is([1, "b"])).toEqual(true)

    expect(guard.is(null)).toEqual(false)
    expect(guard.is(["a"])).toEqual(false)
    expect(guard.is([undefined])).toEqual(false)
  })

  it("tuple. optional element with undefined", () => {
    const schema = pipe(S.tuple(), S.optionalElement(S.union(S.number, S.undefined)))
    const guard = G.guardFor(schema)
    expect(guard.is([])).toEqual(true)
    expect(guard.is([1])).toEqual(true)
    expect(guard.is([1, "b"])).toEqual(true)
    expect(guard.is([undefined])).toEqual(true)

    expect(guard.is(null)).toEqual(false)
    expect(guard.is(["a"])).toEqual(false)
  })

  it("tuple. e + e?", () => {
    const schema = pipe(S.tuple(S.string), S.optionalElement(S.number))
    const guard = G.guardFor(schema)
    expect(guard.is(["a"])).toEqual(true)
    expect(guard.is(["a", 1])).toEqual(true)

    expect(guard.is([1])).toEqual(false)
    expect(guard.is(["a", "b"])).toEqual(false)
  })

  it("tuple. e + r", () => {
    const schema = pipe(S.tuple(S.string), S.rest(S.number))
    const guard = G.guardFor(schema)
    expect(guard.is(["a"])).toEqual(true)
    expect(guard.is(["a", 1])).toEqual(true)
    expect(guard.is(["a", 1, 2])).toEqual(true)

    expect(guard.is([])).toEqual(false)
  })

  it("tuple. e? + r", () => {
    const schema = pipe(S.tuple(), S.optionalElement(S.string), S.rest(S.number))
    const guard = G.guardFor(schema)
    expect(guard.is([])).toEqual(true)
    expect(guard.is(["a"])).toEqual(true)
    expect(guard.is(["a", 1])).toEqual(true)
    expect(guard.is(["a", 1, 2])).toEqual(true)

    expect(guard.is([1])).toEqual(false)
  })

  it("tuple. r", () => {
    const schema = S.array(S.number)
    const guard = G.guardFor(schema)
    expect(guard.is([])).toEqual(true)
    expect(guard.is([1])).toEqual(true)
    expect(guard.is([1, 2])).toEqual(true)

    expect(guard.is(["a"])).toEqual(false)
    expect(guard.is([1, "a"])).toEqual(false)
  })

  it("tuple. r + e", () => {
    const schema = pipe(S.array(S.string), S.element(S.number))
    const guard = G.guardFor(schema)
    expect(guard.is([1])).toEqual(true)
    expect(guard.is(["a", 1])).toEqual(true)
    expect(guard.is(["a", "b", 1])).toEqual(true)

    expect(guard.is([])).toEqual(false)
    expect(guard.is(["a"])).toEqual(false)
    expect(guard.is([1, 2])).toEqual(false)
  })

  it("tuple. e + r + e", () => {
    const schema = pipe(S.tuple(S.string), S.rest(S.number), S.element(S.boolean))
    const guard = G.guardFor(schema)
    expect(guard.is(["a", true])).toEqual(true)
    expect(guard.is(["a", 1, true])).toEqual(true)
    expect(guard.is(["a", 1, 2, true])).toEqual(true)

    expect(guard.is([])).toEqual(false)
    expect(guard.is(["a"])).toEqual(false)
    expect(guard.is([true])).toEqual(false)
    expect(guard.is(["a", 1])).toEqual(false)
    expect(guard.is([1, true])).toEqual(false)
  })

  describe.concurrent("struct", () => {
    it("required field", () => {
      const schema = S.struct({ a: S.number })
      const guard = G.guardFor(schema)
      expect(guard.is({ a: 1 })).toEqual(true)
      expect(guard.is({ a: 1, b: "b" })).toEqual(true)

      expect(guard.is(null)).toEqual(false)
      expect(guard.is({})).toEqual(false)
      expect(guard.is({ a: undefined })).toEqual(false)
      expect(guard.is({ a: "a" })).toEqual(false)
    })

    it("required field with undefined", () => {
      const schema = S.struct({ a: S.union(S.number, S.undefined) })
      const guard = G.guardFor(schema)
      expect(guard.is({ a: 1 })).toEqual(true)
      expect(guard.is({ a: 1, b: "b" })).toEqual(true)
      expect(guard.is({ a: undefined })).toEqual(true)

      expect(guard.is(null)).toEqual(false)
      expect(guard.is({})).toEqual(false)
      expect(guard.is({ a: "a" })).toEqual(false)
    })

    it("optional field", () => {
      const schema = S.struct({ a: S.optional(S.number) })
      const guard = G.guardFor(schema)
      expect(guard.is({})).toEqual(true)
      expect(guard.is({ a: 1 })).toEqual(true)
      expect(guard.is({ a: 1, b: "b" })).toEqual(true)

      expect(guard.is(null)).toEqual(false)
      expect(guard.is({ a: "a" })).toEqual(false)
      expect(guard.is({ a: undefined })).toEqual(false)
    })

    it("optional field with undefined", () => {
      const schema = S.struct({ a: S.optional(S.union(S.number, S.undefined)) })
      const guard = G.guardFor(schema)
      expect(guard.is({})).toEqual(true)
      expect(guard.is({ a: 1 })).toEqual(true)
      expect(guard.is({ a: 1, b: "b" })).toEqual(true)
      expect(guard.is({ a: undefined })).toEqual(true)

      expect(guard.is(null)).toEqual(false)
      expect(guard.is({ a: "a" })).toEqual(false)
    })

    it("record(string, string)", () => {
      const a = Symbol.for("@fp-ts/schema/test/a")
      const schema = S.record("string", S.string)
      const guard = G.guardFor(schema)
      expect(guard.is(null)).toEqual(false)
      expect(guard.is({})).toEqual(true)
      expect(guard.is({ a: "a" })).toEqual(true)
      expect(guard.is({ a: 1 })).toEqual(false)
      expect(guard.is({ [a]: 1 })).toEqual(true)
      expect(guard.is({ a: "a", b: "b" })).toEqual(true)
      expect(guard.is({ a: "a", b: 1 })).toEqual(false)
      expect(guard.is({ [a]: 1, b: "b" })).toEqual(true)
    })

    it("record(symbol, string)", () => {
      const a = Symbol.for("@fp-ts/schema/test/a")
      const b = Symbol.for("@fp-ts/schema/test/b")
      const schema = S.record("symbol", S.string)
      const guard = G.guardFor(schema)
      expect(guard.is(null)).toEqual(false)
      expect(guard.is({})).toEqual(true)
      expect(guard.is({ [a]: "a" })).toEqual(true)
      expect(guard.is({ [a]: 1 })).toEqual(false)
      expect(guard.is({ a: 1 })).toEqual(true)
      expect(guard.is({ [a]: "a", [b]: "b" })).toEqual(true)
      expect(guard.is({ [a]: "a", [b]: 1 })).toEqual(false)
      expect(guard.is({ a: 1, [b]: "b" })).toEqual(true)
    })
  })

  it("union", () => {
    const schema = S.union(S.string, S.number)
    const guard = G.guardFor(schema)
    expect(guard.is(null)).toEqual(false)
    expect(guard.is(1)).toEqual(true)
    expect(guard.is("a")).toEqual(true)
  })

  describe.concurrent("lazy", () => {
    it("baseline", () => {
      interface Category {
        readonly name: string
        readonly categories: ReadonlySet<Category>
      }
      const schema: S.Schema<Category> = S.lazy<Category>(() =>
        S.struct({
          name: S.string,
          categories: DataReadonlySet.schema(schema)
        })
      )
      const guard = G.guardFor(schema)
      expect(guard.is({ name: "a", categories: new Set([]) })).toEqual(true)
      expect(
        guard.is({
          name: "a",
          categories: new Set([{
            name: "b",
            categories: new Set([{ name: "c", categories: new Set([]) }])
          }])
        })
      ).toEqual(true)
      expect(guard.is({ name: "a", categories: new Set([1]) })).toEqual(false)
    })

    it("mutually recursive", () => {
      interface A {
        readonly a: string
        readonly bs: ReadonlySet<B>
      }
      interface B {
        readonly b: number
        readonly as: ReadonlySet<A>
      }
      const schemaA: S.Schema<A> = S.lazy<A>(() =>
        S.struct({
          a: S.string,
          bs: DataReadonlySet.schema(schemaB)
        })
      )
      const schemaB: S.Schema<B> = S.lazy<B>(() =>
        S.struct({
          b: S.number,
          as: DataReadonlySet.schema(schemaA)
        })
      )
      const A = G.guardFor(schemaA)
      const B = G.guardFor(schemaB)
      expect(A.is({ a: "a1", bs: new Set([]) })).toEqual(true)
      expect(A.is({ a: "a1", bs: new Set([{ b: 1, as: new Set([]) }]) })).toEqual(true)
      expect(
        A.is({ a: "a1", bs: new Set([{ b: 1, as: new Set([{ a: "a2", bs: new Set([]) }]) }]) })
      )
        .toEqual(true)
      expect(
        A.is({ a: "a1", bs: new Set([{ b: 1, as: new Set([{ a: "a2", bs: new Set([null]) }]) }]) })
      )
        .toEqual(false)
    })

    it("pick recursive", () => {
      interface A {
        readonly a: string
        readonly as: ReadonlySet<A>
      }
      const A: S.Schema<A> = S.lazy<A>(() =>
        S.struct({
          a: S.string,
          as: DataReadonlySet.schema(A)
        })
      )
      const schemaB = pipe(A, S.pick("as"))
      const B = G.guardFor(schemaB)
      expect(B.is({ as: new Set([]) })).toEqual(true)
      expect(B.is({ as: new Set([{ a: "a", as: new Set() }]) })).toEqual(true)
      expect(B.is({ as: new Set([{ as: new Set() }]) })).toEqual(false)
    })

    it("omit recursive", () => {
      interface A {
        readonly a: string
        readonly as: ReadonlySet<A>
      }
      const A: S.Schema<A> = S.lazy<A>(() =>
        S.struct({
          a: S.string,
          as: DataReadonlySet.schema(A)
        })
      )
      const schemaB = pipe(A, S.omit("a"))
      const B = G.guardFor(schemaB)
      expect(B.is({ as: new Set([]) })).toEqual(true)
      expect(B.is({ as: new Set([{ a: "a", as: new Set() }]) })).toEqual(true)
      expect(B.is({ as: new Set([{ as: new Set() }]) })).toEqual(false)
    })
  })

  it("pick", () => {
    const base = S.struct({ a: S.string, b: S.number, c: S.boolean })
    const schema = pipe(base, S.pick("a", "b"))
    const guard = guardFor(schema)
    expect(guard.is(null)).toEqual(false)
    expect(guard.is({ a: "a", b: 1 })).toEqual(true)
    expect(guard.is({ a: "a", b: 1, c: true })).toEqual(true)
    expect(guard.is({ a: "a", b: 1, c: "a" })).toEqual(true)
  })

  describe.concurrent("omit", () => {
    it("baseline", () => {
      const base = S.struct({ a: S.string, b: S.number, c: S.boolean })
      const schema = pipe(base, S.omit("c"))
      const guard = guardFor(schema)
      expect(guard.is({ a: "a", b: 1 })).toEqual(true)
      expect(guard.is({ a: "a", b: 1, c: true })).toEqual(true)
      expect(guard.is({ a: "a", b: 1, c: "a" })).toEqual(true)

      expect(guard.is(null)).toEqual(false)
      expect(guard.is({ a: "a" })).toEqual(false)
      expect(guard.is({ b: 1 })).toEqual(false)
    })

    it("involving a symbol", () => {
      const a = Symbol.for("@fp-ts/schema/test/a")
      const base = S.struct({ [a]: S.string, b: S.number, c: S.boolean })
      const schema = pipe(base, S.omit("c"))
      const guard = guardFor(schema)
      expect(guard.is({ [a]: "a", b: 1 })).toEqual(true)
      expect(guard.is({ [a]: "a", b: 1, c: true })).toEqual(true)
      expect(guard.is({ [a]: "a", b: 1, c: "a" })).toEqual(true)

      expect(guard.is(null)).toEqual(false)
      expect(guard.is({ [a]: "a" })).toEqual(false)
      expect(guard.is({ b: 1 })).toEqual(false)
    })
  })

  it("union", () => {
    const schema = S.union(S.string, S.number)
    const guard = guardFor(schema)
    expect(guard.is(null)).toEqual(false)
    expect(guard.is(1)).toEqual(true)
    expect(guard.is("a")).toEqual(true)
  })

  describe.concurrent("rest", () => {
    it("baseline", () => {
      const schema = pipe(S.tuple(S.string, S.number), S.rest(S.boolean))
      const guard = guardFor(schema)
      expect(guard.is(["a", 1])).toEqual(true)
      expect(guard.is(["a", 1, true])).toEqual(true)
      expect(guard.is(["a", 1, true, false])).toEqual(true)
      expect(guard.is(["a", 1, true, "a"])).toEqual(false)
      expect(guard.is(["a", 1, true, "a", true])).toEqual(false)
    })

    it("multiple `rest` calls must result in a union", () => {
      const schema = pipe(
        S.tuple(S.string, S.number),
        S.rest(S.boolean),
        S.rest(S.string)
      )
      const guard = guardFor(schema)
      expect(guard.is(["a", 1])).toEqual(true)
      expect(guard.is(["a", 1, true])).toEqual(true)
      expect(guard.is(["a", 1, true, false])).toEqual(true)
      expect(guard.is(["a", 1, true, "a"])).toEqual(true)
      expect(guard.is(["a", 1, true, "a", true])).toEqual(true)
      expect(guard.is(["a", 1, true, "a", true, 1])).toEqual(false)
    })
  })

  describe.concurrent("extend", () => {
    it("struct", () => {
      const schema = pipe(
        S.struct({ a: S.string }),
        S.extend(S.struct({ b: S.number }))
      )
      const guard = guardFor(schema)
      expect(guard.is({ a: "a", b: 1 })).toEqual(true)

      expect(guard.is({})).toEqual(false)
      expect(guard.is({ a: "a" })).toEqual(false)
    })

    it("record(string, string)", () => {
      const schema = pipe(
        S.struct({ a: S.string }),
        S.extend(S.record("string", S.string))
      )
      const guard = guardFor(schema)
      expect(guard.is({ a: "a" })).toEqual(true)
      expect(guard.is({ a: "a", b: "b" })).toEqual(true)

      expect(guard.is({})).toEqual(false)
      expect(guard.is({ b: "b" })).toEqual(false)
      expect(guard.is({ a: 1 })).toEqual(false)
      expect(guard.is({ a: "a", b: 2 })).toEqual(false)
    })
  })

  describe.concurrent("partial", () => {
    it("type alias", () => {
      const schema = S.partial(DataOption.schema(S.number))
      const guard = guardFor(schema)
      expect(guard.is(O.none)).toEqual(true)
      expect(guard.is(O.some(1))).toEqual(true)
      expect(guard.is({})).toEqual(true)
    })

    it("struct", () => {
      const schema = S.partial(S.struct({ a: S.number }))
      const guard = guardFor(schema)
      expect(guard.is({ a: 1 })).toEqual(true)
      expect(guard.is({})).toEqual(true)
      expect(guard.is({ a: undefined })).toEqual(false)
    })

    it("tuple", () => {
      const schema = S.partial(S.tuple(S.string, S.number))
      const guard = guardFor(schema)
      expect(guard.is([])).toEqual(true)
      expect(guard.is(["a"])).toEqual(true)
      expect(guard.is(["a", 1])).toEqual(true)
    })

    it("array", () => {
      const schema = S.partial(S.array(S.number))
      const guard = guardFor(schema)
      expect(guard.is([])).toEqual(true)
      expect(guard.is([1])).toEqual(true)
      expect(guard.is([undefined])).toEqual(true)
      expect(guard.is(["a"])).toEqual(false)
    })

    it("union", () => {
      const schema = S.partial(S.union(S.string, S.array(S.number)))
      const guard = guardFor(schema)
      expect(guard.is("a")).toEqual(true)
      expect(guard.is([])).toEqual(true)
      expect(guard.is([1])).toEqual(true)
      expect(guard.is([undefined])).toEqual(true)
      expect(guard.is(["a"])).toEqual(false)
    })
  })

  describe.concurrent("StringBuilder", () => {
    it("max", () => {
      const schema = S.string.max(1)
      const guard = G.guardFor(schema)
      expect(guard.is("")).toEqual(true)
      expect(guard.is("a")).toEqual(true)

      expect(guard.is("aa")).toEqual(false)
    })

    it("min", () => {
      const schema = S.string.nonEmpty()
      const guard = G.guardFor(schema)
      expect(guard.is("a")).toEqual(true)
      expect(guard.is("aa")).toEqual(true)

      expect(guard.is("")).toEqual(false)
    })

    it("length", () => {
      const schema = S.string.length(1)
      const guard = G.guardFor(schema)
      expect(guard.is("a")).toEqual(true)

      expect(guard.is("")).toEqual(false)
      expect(guard.is("aa")).toEqual(false)
    })

    it("startsWith", () => {
      const schema = S.string.startsWith("a")
      const guard = G.guardFor(schema)
      expect(guard.is("a")).toEqual(true)
      expect(guard.is("ab")).toEqual(true)

      expect(guard.is("")).toEqual(false)
      expect(guard.is("b")).toEqual(false)
    })

    it("endsWith", () => {
      const schema = S.string.endsWith("a")
      const guard = G.guardFor(schema)
      expect(guard.is("a")).toEqual(true)
      expect(guard.is("ba")).toEqual(true)

      expect(guard.is("")).toEqual(false)
      expect(guard.is("b")).toEqual(false)
    })

    it("regex", () => {
      const schema = S.string.regex(/^abb+$/)
      const guard = G.guardFor(schema)
      expect(guard.is("abb")).toEqual(true)
      expect(guard.is("abbb")).toEqual(true)

      expect(guard.is("ab")).toEqual(false)
      expect(guard.is("a")).toEqual(false)
    })

    it("filter", () => {
      const schema = S.string.filter((s): s is string => s.length === 1, { type: "Char" })
      const guard = G.guardFor(schema)
      expect(guard.is("a")).toEqual(true)

      expect(guard.is("")).toEqual(false)
      expect(guard.is("aa")).toEqual(false)
    })
  })

  describe.concurrent("NumberBuilder", () => {
    it("gt", () => {
      const schema = S.number.gt(0)
      const guard = G.guardFor(schema)
      expect(guard.is(-1)).toEqual(false)
      expect(guard.is(0)).toEqual(false)
      expect(guard.is(1)).toEqual(true)
    })

    it("gte", () => {
      const schema = S.number.gte(0)
      const guard = G.guardFor(schema)
      expect(guard.is(-1)).toEqual(false)
      expect(guard.is(0)).toEqual(true)
      expect(guard.is(1)).toEqual(true)
    })

    it("lt", () => {
      const schema = S.number.lt(0)
      const guard = G.guardFor(schema)
      expect(guard.is(-1)).toEqual(true)
      expect(guard.is(0)).toEqual(false)
      expect(guard.is(1)).toEqual(false)
    })

    it("lte", () => {
      const schema = S.number.lte(0)
      const guard = G.guardFor(schema)
      expect(guard.is(-1)).toEqual(true)
      expect(guard.is(0)).toEqual(true)
      expect(guard.is(1)).toEqual(false)
    })

    it("int", () => {
      const schema = S.number.int()
      const guard = G.guardFor(schema)
      expect(guard.is(0)).toEqual(true)
      expect(guard.is(1)).toEqual(true)
      expect(guard.is(1.2)).toEqual(false)
    })

    it("filter", () => {
      const schema = S.number.filter((n): n is number => n % 2 === 0, { type: "Even" })
      const guard = G.guardFor(schema)
      expect(guard.is(0)).toEqual(true)
      expect(guard.is(1)).toEqual(false)
      expect(guard.is(2)).toEqual(true)
      expect(guard.is(3)).toEqual(false)
      expect(guard.is(4)).toEqual(true)
    })
  })

  describe.concurrent("nullables", () => {
    it("nullable (1)", () => {
      /* Schema<{ readonly a: number | null; }> */
      const schema = S.struct({ a: S.union(S.number, S.literal(null)) })
      const guard = guardFor(schema)
      expect(guard.is({})).toBe(false)
      expect(guard.is({ a: null })).toBe(true)
      expect(guard.is({ a: undefined })).toBe(false)
      expect(guard.is({ a: 1 })).toBe(true)
    })

    it("nullable (2)", () => {
      /* Schema<{ readonly a: number | null | undefined; }> */
      const schema = S.struct({ a: S.union(S.number, S.literal(null), S.undefined) })
      const guard = guardFor(schema)
      expect(guard.is({})).toBe(false)
      expect(guard.is({ a: null })).toBe(true)
      expect(guard.is({ a: undefined })).toBe(true)
      expect(guard.is({ a: 1 })).toBe(true)
    })

    it("nullable (3)", () => {
      /* Schema<{ readonly a?: number | null; }> */
      const schema = S.struct({ a: S.optional(S.union(S.number, S.literal(null))) })
      const guard = guardFor(schema)
      expect(guard.is({})).toBe(true)
      expect(guard.is({ a: null })).toBe(true)
      expect(guard.is({ a: undefined })).toBe(false)
      expect(guard.is({ a: 1 })).toBe(true)
    })

    it("nullable (4)", () => {
      /* Schema<{ readonly a?: number | null | undefined; }> */
      const schema = S.struct({ a: S.optional(S.union(S.number, S.literal(null), S.undefined)) })
      const guard = guardFor(schema)
      expect(guard.is({})).toBe(true)
      expect(guard.is({ a: null })).toBe(true)
      expect(guard.is({ a: undefined })).toBe(true)
      expect(guard.is({ a: 1 })).toBe(true)
    })
  })
})
