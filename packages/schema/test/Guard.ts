import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import * as readonlySet from "@fp-ts/schema/data/ReadonlySet"
import * as G from "@fp-ts/schema/Guard"
import { empty } from "@fp-ts/schema/Provider"
import * as S from "@fp-ts/schema/Schema"

const guardFor = G.guardFor

describe("Guard", () => {
  it("GuardId", () => {
    expect(G.GuardId).exist
  })

  it("should throw on missing support", () => {
    const schema = S.declare(Symbol("@fp-ts/schema/test/missing"), O.none, empty)
    expect(() => G.guardFor(schema)).toThrowError(
      new Error("Missing support for Guard compiler, data type @fp-ts/schema/test/missing")
    )
  })

  it("string", () => {
    const guard = G.guardFor(S.string)
    expect(guard.is("a")).toEqual(true)
    expect(guard.is(1)).toEqual(false)
  })

  it("number", () => {
    const guard = G.guardFor(S.number)
    expect(guard.is(1)).toEqual(true)
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
    expect(guard.is(null)).toEqual(false)
    expect(guard.is(0n)).toEqual(true)
    expect(guard.is(BigInt("1"))).toEqual(true)
  })

  it("symbol", () => {
    const a = Symbol.for("@fp-ts/schema/test/a")
    const guard = G.guardFor(S.symbol)
    expect(guard.is(a)).toEqual(true)
    expect(guard.is("a")).toEqual(false)
  })

  it("literal", () => {
    const schema = S.literal(1, "a")
    const guard = G.guardFor(schema)
    expect(guard.is(1)).toEqual(true)
    expect(guard.is("a")).toEqual(true)
    expect(guard.is(null)).toEqual(false)
  })

  describe("enums", () => {
    it("Numeric enums", () => {
      enum Fruits {
        Apple,
        Banana
      }
      const schema = S.nativeEnum(Fruits)
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
      const schema = S.nativeEnum(Fruits)
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
      const schema = S.nativeEnum(Fruits)
      const guard = G.guardFor(schema)
      expect(guard.is("apple")).toEqual(true)
      expect(guard.is("banana")).toEqual(true)
      expect(guard.is(3)).toEqual(true)
      expect(guard.is("Cantaloupe")).toEqual(false)
    })
  })

  describe("tuple", () => {
    it("baseline", () => {
      const schema = S.tuple(S.string, S.number)
      const guard = G.guardFor(schema)
      expect(guard.is(["a", 1])).toEqual(true)
      expect(guard.is([1, 1])).toEqual(false)
      expect(guard.is(["a", "b"])).toEqual(false)
    })

    it("empty tuple", () => {
      const schema = S.tuple()
      const guard = G.guardFor(schema)
      expect(guard.is([])).toEqual(true)
    })

    it("array", () => {
      const schema = S.array(S.string)
      const guard = guardFor(schema)
      expect(guard.is([])).toEqual(true)
      expect(guard.is(["a"])).toEqual(true)
      expect(guard.is(["a", 1])).toEqual(false)
    })

    it("nonEmptyArray", () => {
      const schema = S.nonEmptyArray(S.number)
      const guard = guardFor(schema)
      expect(guard.is([1])).toEqual(true)
      expect(guard.is([1, 2])).toEqual(true)

      expect(guard.is([])).toEqual(false)
    })

    it("ReadonlyArray<unknown>", () => {
      const guard = guardFor(S.array(S.unknown))
      expect(guard.is([])).toEqual(true)
      expect(guard.is(["a", 1, true])).toEqual(true)
    })

    it("ReadonlyArray<any>", () => {
      const guard = guardFor(S.array(S.any))
      expect(guard.is([])).toEqual(true)
      expect(guard.is(["a", 1, true])).toEqual(true)
    })
  })

  describe("struct", () => {
    it("baseline", () => {
      const schema = S.struct({ a: S.string, b: S.number })
      const guard = G.guardFor(schema)
      expect(guard.is(null)).toEqual(false)
      expect(guard.is({ a: "a", b: 1 })).toEqual(true)
    })

    it("should not fail on optional fields", () => {
      const schema = S.partial(S.struct({ a: S.string, b: S.number }))
      const guard = G.guardFor(schema)
      expect(guard.is({})).toEqual(true)
      expect(guard.is({ a: undefined })).toEqual(true)
    })

    it("{ readonly [_: string]: unknown }", () => {
      const guard = guardFor(S.stringIndexSignature(S.unknown))
      expect(guard.is({})).toEqual(true)
      expect(guard.is({ a: "a", b: 1, c: true })).toEqual(true)
    })

    it("{ readonly [_: string]: any }", () => {
      const guard = guardFor(S.stringIndexSignature(S.any))
      expect(guard.is({})).toEqual(true)
      expect(guard.is({ a: "a", b: 1, c: true })).toEqual(true)
    })

    it("stringIndexSignature", () => {
      const a = Symbol.for("@fp-ts/schema/test/a")
      const schema = S.stringIndexSignature(S.string)
      const guard = G.guardFor(schema)
      expect(guard.is(null)).toEqual(false)
      expect(guard.is({})).toEqual(true)
      expect(guard.is({ a: "a" })).toEqual(true)
      expect(guard.is({ a: 1 })).toEqual(false)
      expect(guard.is({ [a]: 1 })).toEqual(false)
      expect(guard.is({ a: "a", b: "b" })).toEqual(true)
      expect(guard.is({ a: "a", b: 1 })).toEqual(false)
      expect(guard.is({ [a]: "a", b: "b" })).toEqual(false)
    })

    it("symbolIndexSignature", () => {
      const a = Symbol.for("@fp-ts/schema/test/a")
      const b = Symbol.for("@fp-ts/schema/test/b")
      const schema = S.symbolIndexSignature(S.string)
      const guard = G.guardFor(schema)
      expect(guard.is(null)).toEqual(false)
      expect(guard.is({})).toEqual(true)
      expect(guard.is({ [a]: "a" })).toEqual(true)
      expect(guard.is({ [a]: 1 })).toEqual(false)
      expect(guard.is({ a: 1 })).toEqual(false)
      expect(guard.is({ [a]: "a", [b]: "b" })).toEqual(true)
      expect(guard.is({ [a]: "a", [b]: 1 })).toEqual(false)
      expect(guard.is({ a: "a", [b]: "b" })).toEqual(false)
    })
  })

  it("union", () => {
    const schema = S.union(S.string, S.number)
    const guard = G.guardFor(schema)
    expect(guard.is(null)).toEqual(false)
    expect(guard.is(1)).toEqual(true)
    expect(guard.is("a")).toEqual(true)
  })

  describe("lazy", () => {
    it("baseline", () => {
      interface Category {
        readonly name: string
        readonly categories: ReadonlySet<Category>
      }
      const schema: S.Schema<Category> = S.lazy<Category>(() =>
        S.struct({
          name: S.string,
          categories: readonlySet.schema(schema)
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
          bs: readonlySet.schema(schemaB)
        })
      )
      const schemaB: S.Schema<B> = S.lazy<B>(() =>
        S.struct({
          b: S.number,
          as: readonlySet.schema(schemaA)
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
          as: readonlySet.schema(A)
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
          as: readonlySet.schema(A)
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

  it("omit", () => {
    const base = S.struct({ a: S.string, b: S.number, c: S.boolean })
    const schema = pipe(base, S.omit("c"))
    const guard = guardFor(schema)
    expect(guard.is(null)).toEqual(false)
    expect(guard.is({ a: "a", b: 1 })).toEqual(true)
    expect(guard.is({ a: "a", b: 1, c: true })).toEqual(true)
    expect(guard.is({ a: "a", b: 1, c: "a" })).toEqual(true)
  })

  it("union", () => {
    const schema = S.union(S.string, S.number)
    const guard = guardFor(schema)
    expect(guard.is(null)).toEqual(false)
    expect(guard.is(1)).toEqual(true)
    expect(guard.is("a")).toEqual(true)
  })

  describe("rest", () => {
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

  describe("extend", () => {
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

    it("stringIndexSignature", () => {
      const schema = pipe(
        S.struct({ a: S.string }),
        S.extend(S.stringIndexSignature(S.string))
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

  describe("partial", () => {
    it("struct", () => {
      const schema = pipe(S.struct({ a: S.number }), S.partial)
      const guard = guardFor(schema)
      expect(guard.is({ a: 1 })).toEqual(true)
      expect(guard.is({ a: undefined })).toEqual(true)
      expect(guard.is({})).toEqual(true)
    })

    it("tuple", () => {
      const schema = pipe(S.tuple(S.string, S.number), S.partial)
      const guard = guardFor(schema)
      expect(guard.is([])).toEqual(true)
      expect(guard.is(["a"])).toEqual(true)
      expect(guard.is(["a", 1])).toEqual(true)
    })

    it("array", () => {
      const schema = pipe(S.array(S.number), S.partial)
      const guard = guardFor(schema)
      expect(guard.is([])).toEqual(true)
      expect(guard.is([1])).toEqual(true)
      expect(guard.is([undefined])).toEqual(true)
      expect(guard.is(["a"])).toEqual(false)
    })

    it("union", () => {
      const schema = pipe(S.union(S.string, S.array(S.number)), S.partial)
      const guard = guardFor(schema)
      expect(guard.is("a")).toEqual(true)
      expect(guard.is([])).toEqual(true)
      expect(guard.is([1])).toEqual(true)
      expect(guard.is([undefined])).toEqual(true)
      expect(guard.is(["a"])).toEqual(false)
    })
  })

  it("maxLength", () => {
    const schema = pipe(S.string, S.maxLength(1))
    const guard = G.guardFor(schema)
    expect(guard.is("")).toEqual(true)
    expect(guard.is("a")).toEqual(true)

    expect(guard.is("aa")).toEqual(false)
  })

  it("minLength", () => {
    const schema = pipe(S.string, S.minLength(1))
    const guard = G.guardFor(schema)
    expect(guard.is("a")).toEqual(true)
    expect(guard.is("aa")).toEqual(true)

    expect(guard.is("")).toEqual(false)
  })
})
