import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import * as bigint from "@fp-ts/schema/data/Bigint"
import * as json from "@fp-ts/schema/data/Json"
import * as set from "@fp-ts/schema/data/Set"
import * as G from "@fp-ts/schema/Guard"
import { Monoid } from "@fp-ts/schema/Provider"
import * as S from "@fp-ts/schema/Schema"

const support = Monoid.combineAll([json.Provider, set.Provider, bigint.Provider])
const guardFor = G.provideGuardFor(support)

describe("Guard", () => {
  it("bigint", () => {
    const schema = bigint.Schema
    const guard = G.guardFor(schema)
    expect(guard.is(null)).toEqual(false)
    expect(guard.is(BigInt("1"))).toEqual(true)
  })

  it("literal", () => {
    const schema = S.literal(1, "a")
    const guard = G.guardFor(schema)
    expect(guard.is(1)).toEqual(true)
    expect(guard.is("a")).toEqual(true)
    expect(guard.is(null)).toEqual(false)
  })

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
  })

  it("union", () => {
    const schema = S.union(S.string, S.number)
    const guard = G.guardFor(schema)
    expect(guard.is(null)).toEqual(false)
    expect(guard.is(1)).toEqual(true)
    expect(guard.is("a")).toEqual(true)
  })

  it("struct", () => {
    const schema = S.struct({ a: S.string, b: S.number })
    const guard = G.guardFor(schema)
    expect(guard.is(null)).toEqual(false)
    expect(guard.is({ a: "a", b: 1 })).toEqual(true)
  })

  it("indexSignature", () => {
    const schema = S.indexSignature(S.string)
    const guard = G.guardFor(schema)
    expect(guard.is(null)).toEqual(false)
    expect(guard.is({})).toEqual(true)
    expect(guard.is({ a: "a" })).toEqual(true)
    expect(guard.is({ a: 1 })).toEqual(false)
    expect(guard.is({ a: "a", b: 1 })).toEqual(false)
  })

  it("array", () => {
    const schema = S.array(S.string)
    const guard = G.guardFor(schema)
    expect(guard.is([])).toEqual(true)
    expect(guard.is(["a"])).toEqual(true)
    expect(guard.is(["a", 1])).toEqual(false)
  })

  it("recursive", () => {
    interface Category {
      readonly name: string
      readonly categories: Set<Category>
    }
    const schema: S.Schema<Category> = S.lazy<Category>(() =>
      S.struct({
        name: S.string,
        categories: set.schema(schema)
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
      readonly bs: Set<B>
    }
    interface B {
      readonly b: number
      readonly as: Set<A>
    }
    const schemaA: S.Schema<A> = S.lazy<A>(() =>
      S.struct({
        a: S.string,
        bs: set.schema(schemaB)
      })
    )
    const schemaB: S.Schema<B> = S.lazy<B>(() =>
      S.struct({
        b: S.number,
        as: set.schema(schemaA)
      })
    )
    const A = G.guardFor(schemaA)
    const B = G.guardFor(schemaB)
    expect(A.is({ a: "a1", bs: new Set([]) })).toEqual(true)
    expect(A.is({ a: "a1", bs: new Set([{ b: 1, as: new Set([]) }]) })).toEqual(true)
    expect(A.is({ a: "a1", bs: new Set([{ b: 1, as: new Set([{ a: "a2", bs: new Set([]) }]) }]) }))
      .toEqual(true)
    expect(
      A.is({ a: "a1", bs: new Set([{ b: 1, as: new Set([{ a: "a2", bs: new Set([null]) }]) }]) })
    )
      .toEqual(false)
  })

  it("pick recursive", () => {
    interface A {
      readonly a: string
      readonly as: Set<A>
    }
    const A: S.Schema<A> = S.lazy<A>(() =>
      S.struct({
        a: S.string,
        as: set.schema(A)
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
      readonly as: Set<A>
    }
    const A: S.Schema<A> = S.lazy<A>(() =>
      S.struct({
        a: S.string,
        as: set.schema(A)
      })
    )
    const schemaB = pipe(A, S.omit("a"))
    const B = G.guardFor(schemaB)
    expect(B.is({ as: new Set([]) })).toEqual(true)
    expect(B.is({ as: new Set([{ a: "a", as: new Set() }]) })).toEqual(true)
    expect(B.is({ as: new Set([{ as: new Set() }]) })).toEqual(false)
  })

  it("pick", () => {
    const baseSchema = S.struct({ a: S.string, b: bigint.Schema, c: S.boolean })
    const baseGuard = G.guardFor(baseSchema)
    expect(baseGuard.is(null)).toEqual(false)
    const schema = pipe(baseSchema, S.pick("a", "b"))
    const guard = G.guardFor(schema)
    expect(guard.is(null)).toEqual(false)
    expect(guard.is({ a: "a", b: BigInt("1") })).toEqual(true)
    expect(guard.is({ a: "a", b: BigInt("1"), c: true })).toEqual(true)
    expect(guard.is({ a: "a", b: BigInt("1"), c: "a" })).toEqual(true)
  })

  it("UnknownArray", () => {
    const guard = guardFor(S.array(S.unknown))
    expect(guard.is([])).toEqual(true)
    expect(guard.is(["a", 1, true])).toEqual(true)
  })

  it("UnknownIndexSignature", () => {
    const guard = guardFor(S.indexSignature(S.unknown))
    expect(guard.is({})).toEqual(true)
    expect(guard.is({ a: "a", b: 1, c: true })).toEqual(true)
  })

  it("bigint", () => {
    const schema = bigint.Schema
    const guard = guardFor(schema)
    expect(guard.is(null)).toEqual(false)
    expect(guard.is(BigInt("1"))).toEqual(true)
  })

  it("Set", () => {
    const schema = set.schema(S.number)
    const guard = guardFor(schema)
    expect(guard.is(null)).toEqual(false)
    expect(guard.is(new Set([1, 2, 3]))).toEqual(true)
  })

  it("Set & bigint", () => {
    const schema = set.schema(bigint.Schema)
    const guard = guardFor(schema)
    expect(guard.is(null)).toEqual(false)
    expect(guard.is(new Set())).toEqual(true)
    expect(guard.is(new Set([BigInt("1"), BigInt("2")]))).toEqual(true)
    expect(guard.is(new Set([BigInt("1"), 1]))).toEqual(false)
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

  it.skip("partial", () => {
    const base = S.struct({ a: S.string, b: S.number, c: S.boolean })
    const schema = S.partial(base)
    const guard = guardFor(schema)
    expect(guard.is(null)).toEqual(false)
    expect(guard.is({})).toEqual(true)
    expect(guard.is({ a: "a" })).toEqual(true)
    expect(guard.is({ a: "a", b: 1 })).toEqual(true)
    expect(guard.is({ a: "a", b: 1, c: true })).toEqual(true)
    expect(guard.is({ a: "a", b: 1, c: "a" })).toEqual(false)
  })

  it("optional", () => {
    const schema = S.struct({ a: S.optional(S.string) })
    const guard = guardFor(schema)
    expect(guard.is(null)).toEqual(false)
    expect(guard.is({})).toEqual(true)
    expect(guard.is({ a: undefined })).toEqual(true)
    expect(guard.is({ a: "a" })).toEqual(true)
    expect(guard.is({ a: 1 })).toEqual(false)
  })

  it("nullable", () => {
    const schema = S.struct({ a: S.nullable(S.string) })
    const guard = guardFor(schema)
    expect(guard.is(null)).toEqual(false)
    expect(guard.is({})).toEqual(false)
    expect(guard.is({ a: undefined })).toEqual(false)
    expect(guard.is({ a: null })).toEqual(true)
    expect(guard.is({ a: "a" })).toEqual(true)
    expect(guard.is({ a: 1 })).toEqual(false)
  })

  it("nullish", () => {
    const schema = S.struct({ a: S.nullish(S.string) })
    const guard = guardFor(schema)
    expect(guard.is(null)).toEqual(false)
    expect(guard.is({})).toEqual(true)
    expect(guard.is({ a: undefined })).toEqual(true)
    expect(guard.is({ a: null })).toEqual(true)
    expect(guard.is({ a: "a" })).toEqual(true)
    expect(guard.is({ a: 1 })).toEqual(false)
  })

  it.skip("required", () => {
    const base = S.struct({
      a: S.optional(S.string),
      b: S.optional(S.number),
      c: S.optional(S.boolean)
    })
    const baseGuard = guardFor(base)
    expect(baseGuard.is(null)).toEqual(false)
    expect(baseGuard.is({})).toEqual(true)
    expect(baseGuard.is({ a: "a" })).toEqual(true)
    expect(baseGuard.is({ a: "a", b: 1 })).toEqual(true)
    expect(baseGuard.is({ a: "a", b: 1, c: true })).toEqual(true)
    expect(baseGuard.is({ a: "a", b: 1, c: "a" })).toEqual(false)

    const schema = S.required(base)
    const guard = guardFor(schema)
    expect(guard.is(null)).toEqual(false)
    expect(guard.is({})).toEqual(false)
    expect(guard.is({ a: "a" })).toEqual(false)
    expect(guard.is({ a: "a", b: 1 })).toEqual(false)
    expect(guard.is({ a: "a", b: 1, c: true })).toEqual(true)
    expect(guard.is({ a: "a", b: 1, c: "a" })).toEqual(false)
  })

  it("string", () => {
    const schema = S.string
    const guard = guardFor(schema)
    expect(guard.is("a")).toEqual(true)
    expect(guard.is(1)).toEqual(false)
  })

  it("number", () => {
    const schema = S.number
    const guard = guardFor(schema)
    expect(guard.is(1)).toEqual(true)
    expect(guard.is("a")).toEqual(false)
  })

  it("boolean", () => {
    const schema = S.boolean
    const guard = guardFor(schema)
    expect(guard.is(true)).toEqual(true)
    expect(guard.is(false)).toEqual(true)
    expect(guard.is(1)).toEqual(false)
  })

  it("of", () => {
    const schema = S.of(1)
    const guard = guardFor(schema)
    expect(guard.is(1)).toEqual(true)
    expect(guard.is(2)).toEqual(false)
  })

  it("tuple", () => {
    const schema = S.tuple(S.string, S.number)
    const guard = guardFor(schema)
    expect(guard.is(["a", 1])).toEqual(true)
    expect(guard.is([1, 1])).toEqual(false)
    expect(guard.is(["a", "b"])).toEqual(false)
  })

  it("union", () => {
    const schema = S.union(S.string, S.number)
    const guard = guardFor(schema)
    expect(guard.is(null)).toEqual(false)
    expect(guard.is(1)).toEqual(true)
    expect(guard.is("a")).toEqual(true)
  })

  it("struct", () => {
    const schema = S.struct({ a: S.string, b: S.number })
    const guard = guardFor(schema)
    expect(guard.is(null)).toEqual(false)
    expect(guard.is({ a: "a", b: 1 })).toEqual(true)
  })

  it("indexSignature", () => {
    const schema = S.indexSignature(S.string)
    const guard = guardFor(schema)
    expect(guard.is(null)).toEqual(false)
    expect(guard.is({})).toEqual(true)
    expect(guard.is({ a: "a" })).toEqual(true)
    expect(guard.is({ a: 1 })).toEqual(false)
    expect(guard.is({ a: "a", b: 1 })).toEqual(false)
  })

  it("array", () => {
    const schema = S.array(S.string)
    const guard = guardFor(schema)
    expect(guard.is([])).toEqual(true)
    expect(guard.is(["a"])).toEqual(true)
    expect(guard.is(["a", 1])).toEqual(false)
  })

  it("nonEmptyArray", () => {
    const schema = S.nonEmptyArray(S.string, S.number)
    const guard = guardFor(schema)
    expect(guard.is(["a"])).toEqual(true)
    expect(guard.is(["a", 1])).toEqual(true)

    expect(guard.is([])).toEqual(false)
  })

  it("option (as structure)", () => {
    const schema = S.option(S.number)
    const guard = guardFor(schema)
    expect(guard.is(O.none)).toEqual(true)
    expect(guard.is(O.some(1))).toEqual(true)
    expect(guard.is(O.some("a"))).toEqual(false)
  })

  it("minLength", () => {
    const schema = pipe(S.string, S.minLength(1))
    const guard = guardFor(schema)
    expect(guard.is("a")).toEqual(true)
    expect(guard.is("aa")).toEqual(true)

    expect(guard.is("")).toEqual(false)
  })

  it("maxLength", () => {
    const schema = pipe(S.string, S.maxLength(1))
    const guard = guardFor(schema)
    expect(guard.is("")).toEqual(true)
    expect(guard.is("a")).toEqual(true)

    expect(guard.is("aa")).toEqual(false)
  })

  it("min", () => {
    const schema = pipe(S.number, S.min(1))
    const guard = guardFor(schema)
    expect(guard.is(1)).toEqual(true)
    expect(guard.is(2)).toEqual(true)

    expect(guard.is(0)).toEqual(false)
  })

  it("max", () => {
    const schema = pipe(S.number, S.max(1))
    const guard = guardFor(schema)
    expect(guard.is(0)).toEqual(true)
    expect(guard.is(1)).toEqual(true)

    expect(guard.is(2)).toEqual(false)
  })

  describe("withRest", () => {
    it("baseline", () => {
      const schema = pipe(S.tuple(S.string, S.number), S.withRest(S.boolean))
      const guard = guardFor(schema)
      expect(guard.is(["a", 1])).toEqual(true)
      expect(guard.is(["a", 1, true])).toEqual(true)
      expect(guard.is(["a", 1, true, false])).toEqual(true)
      expect(guard.is(["a", 1, true, "a"])).toEqual(false)
      expect(guard.is(["a", 1, true, "a", true])).toEqual(false)
    })

    it("multiple withRest calls must result in a union", () => {
      const schema = pipe(S.tuple(S.string, S.number), S.withRest(S.boolean), S.withRest(S.string))
      const guard = guardFor(schema)
      expect(guard.is(["a", 1])).toEqual(true)
      expect(guard.is(["a", 1, true])).toEqual(true)
      expect(guard.is(["a", 1, true, false])).toEqual(true)
      expect(guard.is(["a", 1, true, "a"])).toEqual(true)
      expect(guard.is(["a", 1, true, "a", true])).toEqual(true)
      expect(guard.is(["a", 1, true, "a", true, 1])).toEqual(false)
    })
  })
})
