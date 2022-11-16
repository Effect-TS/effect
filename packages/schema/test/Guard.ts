import * as G from "@fp-ts/codec/Guard"
import type { Annotations } from "@fp-ts/codec/Meta"
import * as S from "@fp-ts/codec/Schema"
import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"

const SetSym = Symbol("Set")

const setS = <A>(item: S.Schema<A>): S.Schema<Set<A>> =>
  S.apply(
    SetSym,
    O.none,
    {
      guardFor: <A>(item: G.Guard<A>): G.Guard<Set<A>> => set(item)
    },
    [
      {
        _tag: "GuardAnnotation",
        guardFor: <A>(_: Annotations, item: G.Guard<A>): G.Guard<Set<A>> => set(item)
      }
    ],
    item
  )

const set = <A>(item: G.Guard<A>): G.Guard<Set<A>> =>
  G.make(
    setS(item),
    (input): input is Set<A> => input instanceof Set && Array.from(input.values()).every(item.is)
  )

const bigintSym = Symbol.for("bigint")

const bigintS: S.Schema<bigint> = S.apply(bigintSym, O.none, {}, [{
  _tag: "GuardAnnotation",
  guardFor: (): G.Guard<bigint> => bigint
}])

const bigint = G.make(
  bigintS,
  (input): input is bigint => typeof input === "bigint"
)

describe("Guard", () => {
  // it("alias", () => {
  //   const Name = pipe(G.string, G.alias(Symbol.for("Name")))
  //   expect(Name.is(null)).toEqual(false)
  //   expect(Name.is("a")).toEqual(true)
  //   const ReName = G.unsafeGuardFor(Name)
  //   expect(ReName.is(null)).toEqual(false)
  //   expect(ReName.is("a")).toEqual(true)
  // })

  it("bigint", () => {
    const guard = bigint
    expect(guard.is(null)).toEqual(false)
    expect(guard.is(BigInt("1"))).toEqual(true)
  })

  describe("tuple", () => {
    it("tuple", () => {
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

  it("readonlyArray", () => {
    const guard = G.readonlyArray(G.string)
    expect(guard.is([])).toEqual(true)
    expect(guard.is(["a"])).toEqual(true)
    expect(guard.is(["a", 1])).toEqual(false)
  })

  it("recursive", () => {
    interface Category {
      readonly name: string
      readonly categories: Set<Category>
    }
    const guard: G.Guard<Category> = G.lazy<Category>(Symbol.for("Category"), () =>
      G.struct({
        name: G.string,
        categories: set(guard)
      }))
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
    const A: G.Guard<A> = G.lazy<A>(Symbol.for("A"), () =>
      G.struct({
        a: G.string,
        bs: set(B)
      }))
    const B: G.Guard<B> = G.lazy<B>(Symbol.for("B"), () =>
      G.struct({
        b: G.number,
        as: set(A)
      }))
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
    const A: G.Guard<A> = G.lazy<A>(Symbol.for("A"), () =>
      G.struct({
        a: G.string,
        as: set(A)
      }))
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
    const A: G.Guard<A> = G.lazy<A>(Symbol.for("A"), () =>
      G.struct({
        a: G.string,
        as: set(A)
      }))
    const B = pipe(A, G.omit("a"))
    expect(B.is({ as: new Set([]) })).toEqual(true)
    expect(B.is({ as: new Set([{ a: "a", as: new Set() }]) })).toEqual(true)
    expect(B.is({ as: new Set([{ as: new Set() }]) })).toEqual(false)
  })

  it("pick", () => {
    const baseGuard = G.struct({ a: G.string, b: bigint, c: G.boolean })
    expect(baseGuard.is(null)).toEqual(false)
    const guard = pipe(baseGuard, G.pick("a", "b"))
    expect(guard.is(null)).toEqual(false)
    expect(guard.is({ a: "a", b: BigInt("1") })).toEqual(true)
    expect(guard.is({ a: "a", b: BigInt("1"), c: true })).toEqual(true)
    expect(guard.is({ a: "a", b: BigInt("1"), c: "a" })).toEqual(true)
  })

  describe("unsafeGuardFor", () => {
    const unsafeGuardFor = G.unsafeGuardFor

    it("recursive", () => {
      interface Category {
        readonly name: string
        readonly categories: Set<Category>
      }
      const CategoryS: S.Schema<Category> = S.lazy<Category>(
        Symbol.for("Category"),
        () =>
          S.struct({
            name: S.string,
            categories: setS(CategoryS)
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
      const AS: S.Schema<A> = S.lazy<A>(Symbol.for("A"), () =>
        S.struct({
          a: S.string,
          bs: setS(BS)
        }))
      const BS: S.Schema<B> = S.lazy<B>(Symbol.for("B"), () =>
        S.struct({
          b: S.number,
          as: setS(AS)
        }))
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
      const schema = bigintS
      const guard = unsafeGuardFor(schema)
      expect(guard.is(null)).toEqual(false)
      expect(guard.is(BigInt("1"))).toEqual(true)
    })

    it("Set", () => {
      const schema = setS(S.number)
      const guard = unsafeGuardFor(schema)
      expect(guard.is(null)).toEqual(false)
      expect(guard.is(new Set([1, 2, 3]))).toEqual(true)
    })

    it("Set & bigint", () => {
      const schema = setS(bigintS)
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
      const schema = S.tuple(true, S.string, S.number)
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
      const schema = S.array(true, S.string)
      const guard = unsafeGuardFor(schema)
      expect(guard.is([])).toEqual(true)
      expect(guard.is(["a"])).toEqual(true)
      expect(guard.is(["a", 1])).toEqual(false)
    })

    it("nonEmptyArray", () => {
      const schema = S.nonEmptyArray(true, S.string, S.number)
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
      const schema = pipe(S.number, S.minimum(1))
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
