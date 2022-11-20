import * as bigint from "@fp-ts/codec/data/bigint"
import * as json from "@fp-ts/codec/data/Json"
import * as set from "@fp-ts/codec/data/Set"
import * as G from "@fp-ts/codec/Guard"
import { Monoid } from "@fp-ts/codec/Provider"
import * as S from "@fp-ts/codec/Schema"
import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"

const support = Monoid.combineAll([json.Provider, set.Provider, bigint.Provider])
const unsafeGuardFor = G.provideUnsafeGuardFor(support)

describe("Guard", () => {
  it("bigint", () => {
    const guard = bigint.Guard
    expect(guard.is(null)).toEqual(false)
    expect(guard.is(BigInt("1"))).toEqual(true)
  })

  it("Numeric enums", () => {
    enum Fruits {
      Apple,
      Banana
    }
    const guard = G.nativeEnum(Fruits)
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
    const guard = G.nativeEnum(Fruits)
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
    const guard = G.nativeEnum(Fruits)
    expect(guard.is("apple")).toEqual(true)
    expect(guard.is("banana")).toEqual(true)
    expect(guard.is(3)).toEqual(true)
    expect(guard.is("Cantaloupe")).toEqual(false)
  })

  it("maxLength", () => {
    const guard = pipe(G.string, G.maxLength(1))
    expect(guard.is("")).toEqual(true)
    expect(guard.is("a")).toEqual(true)

    expect(guard.is("aa")).toEqual(false)
  })

  it("minLength", () => {
    const guard = pipe(G.string, G.minLength(1))
    expect(guard.is("a")).toEqual(true)
    expect(guard.is("aa")).toEqual(true)

    expect(guard.is("")).toEqual(false)
  })

  describe("tuple", () => {
    it("baseline", () => {
      const guard = G.tuple(G.string, G.number)
      expect(guard.is(["a", 1])).toEqual(true)
      expect(guard.is([1, 1])).toEqual(false)
      expect(guard.is(["a", "b"])).toEqual(false)
    })

    it("empty tuple", () => {
      const guard = G.tuple()
      expect(guard.is([])).toEqual(true)
    })
  })

  it("union", () => {
    const guard = G.union(G.string, G.number)
    expect(guard.is(null)).toEqual(false)
    expect(guard.is(1)).toEqual(true)
    expect(guard.is("a")).toEqual(true)
  })

  it("struct", () => {
    const guard = G.struct({ a: G.string, b: G.number })
    expect(guard.is(null)).toEqual(false)
    expect(guard.is({ a: "a", b: 1 })).toEqual(true)
  })

  it("indexSignature", () => {
    const guard = G.indexSignature(G.string)
    expect(guard.is(null)).toEqual(false)
    expect(guard.is({})).toEqual(true)
    expect(guard.is({ a: "a" })).toEqual(true)
    expect(guard.is({ a: 1 })).toEqual(false)
    expect(guard.is({ a: "a", b: 1 })).toEqual(false)
  })

  it("array", () => {
    const guard = G.array(G.string)
    expect(guard.is([])).toEqual(true)
    expect(guard.is(["a"])).toEqual(true)
    expect(guard.is(["a", 1])).toEqual(false)
  })

  it("recursive", () => {
    interface Category {
      readonly name: string
      readonly categories: Set<Category>
    }
    const guard: G.Guard<Category> = G.lazy<Category>(() =>
      G.struct({
        name: G.string,
        categories: set.guard(guard)
      })
    )
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
    const A: G.Guard<A> = G.lazy<A>(() =>
      G.struct({
        a: G.string,
        bs: set.guard(B)
      })
    )
    const B: G.Guard<B> = G.lazy<B>(() =>
      G.struct({
        b: G.number,
        as: set.guard(A)
      })
    )
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
    const A: G.Guard<A> = G.lazy<A>(() =>
      G.struct({
        a: G.string,
        as: set.guard(A)
      })
    )
    const B = pipe(A, G.pick("as"))
    expect(B.is({ as: new Set([]) })).toEqual(true)
    expect(B.is({ as: new Set([{ a: "a", as: new Set() }]) })).toEqual(true)
    expect(B.is({ as: new Set([{ as: new Set() }]) })).toEqual(false)
  })

  it("omit recursive", () => {
    interface A {
      readonly a: string
      readonly as: Set<A>
    }
    const A: G.Guard<A> = G.lazy<A>(() =>
      G.struct({
        a: G.string,
        as: set.guard(A)
      })
    )
    const B = pipe(A, G.omit("a"))
    expect(B.is({ as: new Set([]) })).toEqual(true)
    expect(B.is({ as: new Set([{ a: "a", as: new Set() }]) })).toEqual(true)
    expect(B.is({ as: new Set([{ as: new Set() }]) })).toEqual(false)
  })

  it("pick", () => {
    const baseGuard = G.struct({ a: G.string, b: bigint.Guard, c: G.boolean })
    expect(baseGuard.is(null)).toEqual(false)
    const guard = pipe(baseGuard, G.pick("a", "b"))
    expect(guard.is(null)).toEqual(false)
    expect(guard.is({ a: "a", b: BigInt("1") })).toEqual(true)
    expect(guard.is({ a: "a", b: BigInt("1"), c: true })).toEqual(true)
    expect(guard.is({ a: "a", b: BigInt("1"), c: "a" })).toEqual(true)
  })

  describe("unsafeGuardFor", () => {
    it("UnknownArray", () => {
      const guard = unsafeGuardFor(S.array(S.unknown))
      expect(guard.is([])).toEqual(true)
      expect(guard.is(["a", 1, true])).toEqual(true)
    })

    it("UnknownIndexSignature", () => {
      const guard = unsafeGuardFor(S.indexSignature(S.unknown))
      expect(guard.is({})).toEqual(true)
      expect(guard.is({ a: "a", b: 1, c: true })).toEqual(true)
    })

    it("recursive", () => {
      interface Category {
        readonly name: string
        readonly categories: Set<Category>
      }
      const CategoryS: S.Schema<Category> = S.lazy<Category>(
        () =>
          S.struct({
            name: S.string,
            categories: set.schema(CategoryS)
          })
      )
      const guard = unsafeGuardFor(CategoryS)
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
      const AS: S.Schema<A> = S.lazy<A>(() =>
        S.struct({
          a: S.string,
          bs: set.schema(BS)
        })
      )
      const BS: S.Schema<B> = S.lazy<B>(() =>
        S.struct({
          b: S.number,
          as: set.schema(AS)
        })
      )
      const A = unsafeGuardFor(AS)
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

    it("bigint", () => {
      const schema = bigint.Schema
      const guard = unsafeGuardFor(schema)
      expect(guard.is(null)).toEqual(false)
      expect(guard.is(BigInt("1"))).toEqual(true)
    })

    it("Set", () => {
      const schema = set.schema(S.number)
      const guard = unsafeGuardFor(schema)
      expect(guard.is(null)).toEqual(false)
      expect(guard.is(new Set([1, 2, 3]))).toEqual(true)
    })

    it("Set & bigint", () => {
      const schema = set.schema(bigint.Schema)
      const guard = unsafeGuardFor(schema)
      expect(guard.is(null)).toEqual(false)
      expect(guard.is(new Set())).toEqual(true)
      expect(guard.is(new Set([BigInt("1"), BigInt("2")]))).toEqual(true)
      expect(guard.is(new Set([BigInt("1"), 1]))).toEqual(false)
    })

    it("pick", () => {
      const base = S.struct({ a: S.string, b: S.number, c: S.boolean })
      const schema = pipe(base, S.pick("a", "b"))
      const guard = unsafeGuardFor(schema)
      expect(guard.is(null)).toEqual(false)
      expect(guard.is({ a: "a", b: 1 })).toEqual(true)
      expect(guard.is({ a: "a", b: 1, c: true })).toEqual(true)
      expect(guard.is({ a: "a", b: 1, c: "a" })).toEqual(true)
    })

    it("omit", () => {
      const base = S.struct({ a: S.string, b: S.number, c: S.boolean })
      const schema = pipe(base, S.omit("c"))
      const guard = unsafeGuardFor(schema)
      expect(guard.is(null)).toEqual(false)
      expect(guard.is({ a: "a", b: 1 })).toEqual(true)
      expect(guard.is({ a: "a", b: 1, c: true })).toEqual(true)
      expect(guard.is({ a: "a", b: 1, c: "a" })).toEqual(true)
    })

    it.skip("partial", () => {
      const base = S.struct({ a: S.string, b: S.number, c: S.boolean })
      const schema = S.partial(base)
      const guard = unsafeGuardFor(schema)
      expect(guard.is(null)).toEqual(false)
      expect(guard.is({})).toEqual(true)
      expect(guard.is({ a: "a" })).toEqual(true)
      expect(guard.is({ a: "a", b: 1 })).toEqual(true)
      expect(guard.is({ a: "a", b: 1, c: true })).toEqual(true)
      expect(guard.is({ a: "a", b: 1, c: "a" })).toEqual(false)
    })

    it("optional", () => {
      const schema = S.struct({ a: S.optional(S.string) })
      const guard = unsafeGuardFor(schema)
      expect(guard.is(null)).toEqual(false)
      expect(guard.is({})).toEqual(true)
      expect(guard.is({ a: undefined })).toEqual(true)
      expect(guard.is({ a: "a" })).toEqual(true)
      expect(guard.is({ a: 1 })).toEqual(false)
    })

    it("nullable", () => {
      const schema = S.struct({ a: S.nullable(S.string) })
      const guard = unsafeGuardFor(schema)
      expect(guard.is(null)).toEqual(false)
      expect(guard.is({})).toEqual(false)
      expect(guard.is({ a: undefined })).toEqual(false)
      expect(guard.is({ a: null })).toEqual(true)
      expect(guard.is({ a: "a" })).toEqual(true)
      expect(guard.is({ a: 1 })).toEqual(false)
    })

    it("nullish", () => {
      const schema = S.struct({ a: S.nullish(S.string) })
      const guard = unsafeGuardFor(schema)
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
      const baseGuard = unsafeGuardFor(base)
      expect(baseGuard.is(null)).toEqual(false)
      expect(baseGuard.is({})).toEqual(true)
      expect(baseGuard.is({ a: "a" })).toEqual(true)
      expect(baseGuard.is({ a: "a", b: 1 })).toEqual(true)
      expect(baseGuard.is({ a: "a", b: 1, c: true })).toEqual(true)
      expect(baseGuard.is({ a: "a", b: 1, c: "a" })).toEqual(false)

      const schema = S.required(base)
      const guard = unsafeGuardFor(schema)
      expect(guard.is(null)).toEqual(false)
      expect(guard.is({})).toEqual(false)
      expect(guard.is({ a: "a" })).toEqual(false)
      expect(guard.is({ a: "a", b: 1 })).toEqual(false)
      expect(guard.is({ a: "a", b: 1, c: true })).toEqual(true)
      expect(guard.is({ a: "a", b: 1, c: "a" })).toEqual(false)
    })

    it("string", () => {
      const schema = S.string
      const guard = unsafeGuardFor(schema)
      expect(guard.is("a")).toEqual(true)
      expect(guard.is(1)).toEqual(false)
    })

    it("number", () => {
      const schema = S.number
      const guard = unsafeGuardFor(schema)
      expect(guard.is(1)).toEqual(true)
      expect(guard.is("a")).toEqual(false)
    })

    it("boolean", () => {
      const schema = S.boolean
      const guard = unsafeGuardFor(schema)
      expect(guard.is(true)).toEqual(true)
      expect(guard.is(false)).toEqual(true)
      expect(guard.is(1)).toEqual(false)
    })

    it("of", () => {
      const schema = S.of(1)
      const guard = unsafeGuardFor(schema)
      expect(guard.is(1)).toEqual(true)
      expect(guard.is(2)).toEqual(false)
    })

    it("tuple", () => {
      const schema = S.tuple(S.string, S.number)
      const guard = unsafeGuardFor(schema)
      expect(guard.is(["a", 1])).toEqual(true)
      expect(guard.is([1, 1])).toEqual(false)
      expect(guard.is(["a", "b"])).toEqual(false)
    })

    it("union", () => {
      const schema = S.union(S.string, S.number)
      const guard = unsafeGuardFor(schema)
      expect(guard.is(null)).toEqual(false)
      expect(guard.is(1)).toEqual(true)
      expect(guard.is("a")).toEqual(true)
    })

    it("struct", () => {
      const schema = S.struct({ a: S.string, b: S.number })
      const guard = unsafeGuardFor(schema)
      expect(guard.is(null)).toEqual(false)
      expect(guard.is({ a: "a", b: 1 })).toEqual(true)
    })

    it("indexSignature", () => {
      const schema = S.indexSignature(S.string)
      const guard = unsafeGuardFor(schema)
      expect(guard.is(null)).toEqual(false)
      expect(guard.is({})).toEqual(true)
      expect(guard.is({ a: "a" })).toEqual(true)
      expect(guard.is({ a: 1 })).toEqual(false)
      expect(guard.is({ a: "a", b: 1 })).toEqual(false)
    })

    it("array", () => {
      const schema = S.array(S.string)
      const guard = unsafeGuardFor(schema)
      expect(guard.is([])).toEqual(true)
      expect(guard.is(["a"])).toEqual(true)
      expect(guard.is(["a", 1])).toEqual(false)
    })

    it("nonEmptyArray", () => {
      const schema = S.nonEmptyArray(S.string, S.number)
      const guard = unsafeGuardFor(schema)
      expect(guard.is(["a"])).toEqual(true)
      expect(guard.is(["a", 1])).toEqual(true)

      expect(guard.is([])).toEqual(false)
    })

    it("option (as structure)", () => {
      const schema = S.option(S.number)
      const guard = unsafeGuardFor(schema)
      expect(guard.is(O.none)).toEqual(true)
      expect(guard.is(O.some(1))).toEqual(true)
      expect(guard.is(O.some("a"))).toEqual(false)
    })

    it("minLength", () => {
      const schema = pipe(S.string, S.minLength(1))
      const guard = unsafeGuardFor(schema)
      expect(guard.is("a")).toEqual(true)
      expect(guard.is("aa")).toEqual(true)

      expect(guard.is("")).toEqual(false)
    })

    it("maxLength", () => {
      const schema = pipe(S.string, S.maxLength(1))
      const guard = unsafeGuardFor(schema)
      expect(guard.is("")).toEqual(true)
      expect(guard.is("a")).toEqual(true)

      expect(guard.is("aa")).toEqual(false)
    })

    it("minimum", () => {
      const schema = pipe(S.number, S.min(1))
      const guard = unsafeGuardFor(schema)
      expect(guard.is(1)).toEqual(true)
      expect(guard.is(2)).toEqual(true)

      expect(guard.is(0)).toEqual(false)
    })

    it("maximum", () => {
      const schema = pipe(S.number, S.maximum(1))
      const guard = unsafeGuardFor(schema)
      expect(guard.is(0)).toEqual(true)
      expect(guard.is(1)).toEqual(true)

      expect(guard.is(2)).toEqual(false)
    })
  })
})
