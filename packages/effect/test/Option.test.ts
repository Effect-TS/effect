import * as Chunk from "effect/Chunk"
import * as E from "effect/Either"
import * as Equal from "effect/Equal"
import { pipe } from "effect/Function"
import * as Hash from "effect/Hash"
import * as N from "effect/Number"
import * as Option from "effect/Option"
import * as S from "effect/String"
import * as Util from "effect/test/util"
import { assert, assertType, describe, expect, it } from "vitest"

const p = (n: number): boolean => n > 2

const expectNone = <A>(o: Option.Option<A>) => {
  Util.deepStrictEqual(o, Option.none())
}

const expectSome = <A>(o: Option.Option<A>, expected: A) => {
  Util.deepStrictEqual(o, Option.some(expected))
}

describe("Option", () => {
  it("gen", () => {
    const a = Option.gen(function*() {
      const x = yield* Option.some(1)
      const y = yield* Option.some(2)
      return x + y
    })
    const b = Option.gen(function*() {
      return 10
    })
    const c = Option.gen(function*() {
      yield* Option.some(1)
      yield* Option.some(2)
    })
    const d = Option.gen(function*() {
      yield* Option.some(1)
      return yield* Option.some(2)
    })
    const e = Option.gen(function*() {
      yield* Option.some(1)
      yield* Option.none()
      return yield* Option.some(2)
    })
    const f = Option.gen(function*() {
      yield* Option.none()
    })
    const g = Option.gen({ ctx: "testContext" as const }, function*() {
      return yield* Option.some(this.ctx)
    })
    // test adapter
    const h = Option.gen(function*($) {
      const x = yield* $(Option.some(1))
      const y = yield* $(Option.some(2))
      return x + y
    })

    expect(a).toEqual(Option.some(3))
    expect(b).toEqual(Option.some(10))
    expect(c).toEqual(Option.some(undefined))
    expect(d).toEqual(Option.some(2))
    expect(e).toEqual(Option.none())
    expect(f).toEqual(Option.none())
    expect(g).toEqual(Option.some("testContext"))
    expect(h).toEqual(Option.some(3))
  })

  it("toString", () => {
    expect(String(Option.none())).toEqual(`{
  "_id": "Option",
  "_tag": "None"
}`)
    expect(String(Option.some(1))).toEqual(`{
  "_id": "Option",
  "_tag": "Some",
  "value": 1
}`)
    expect(String(Option.some(Chunk.make(1, 2, 3)))).toEqual(`{
  "_id": "Option",
  "_tag": "Some",
  "value": {
    "_id": "Chunk",
    "values": [
      1,
      2,
      3
    ]
  }
}`)
  })

  it("toJSON", () => {
    expect(Option.none().toJSON()).toEqual(
      { _id: "Option", _tag: "None" }
    )
    expect(Option.some(1).toJSON()).toEqual(
      { _id: "Option", _tag: "Some", value: 1 }
    )
  })

  it("inspect", () => {
    if (typeof window !== "undefined") {
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { inspect } = require("node:util")
    expect(inspect(Option.none())).toEqual(inspect({ _id: "Option", _tag: "None" }))
    expect(inspect(Option.some(1))).toEqual(inspect({ _id: "Option", _tag: "Some", value: 1 }))
  })

  it("Equal", () => {
    expect(Equal.equals(Option.some(1), Option.some(1))).toEqual(true)
    expect(Equal.equals(Option.some(1), Option.some(2))).toEqual(false)
    expect(Equal.equals(Option.none(), Option.none())).toEqual(true)
  })

  it("Hash", () => {
    expect(Hash.hash(Option.some(1))).toEqual(Hash.hash(Option.some(1)))
    expect(Hash.hash(Option.some(1)) === Hash.hash(Option.some(2))).toEqual(false)
    expect(Hash.hash(Option.none())).toEqual(Hash.hash(Option.none()))
  })

  it("getRight", () => {
    expect(Option.getRight(E.right(1))).toEqual(Option.some(1))
    expect(Option.getRight(E.left("a"))).toEqual(Option.none())
  })

  it("getLeft", () => {
    expect(Option.getLeft(E.right(1))).toEqual(Option.none())
    expect(Option.getLeft(E.left("a"))).toEqual(Option.some("a"))
  })

  it("toRefinement", () => {
    const f = (
      s: string | number
    ): Option.Option<string> => (typeof s === "string" ? Option.some(s) : Option.none())
    const isString = Option.toRefinement(f)
    Util.deepStrictEqual(isString("s"), true)
    Util.deepStrictEqual(isString(1), false)
    type A = { readonly type: "A" }
    type B = { readonly type: "B" }
    type C = A | B
    const isA = Option.toRefinement<C, A>((c) => (c.type === "A" ? Option.some(c) : Option.none()))
    Util.deepStrictEqual(isA({ type: "A" }), true)
    Util.deepStrictEqual(isA({ type: "B" }), false)
  })

  it("isOption", () => {
    Util.deepStrictEqual(pipe(Option.some(1), Option.isOption), true)
    Util.deepStrictEqual(pipe(Option.none(), Option.isOption), true)
    Util.deepStrictEqual(pipe(E.right(1), Option.isOption), false)
  })

  it("firstSomeOf", () => {
    Util.deepStrictEqual(Option.firstSomeOf([]), Option.none())
    Util.deepStrictEqual(Option.firstSomeOf([Option.some(1)]), Option.some(1))
    Util.deepStrictEqual(Option.firstSomeOf([Option.none()]), Option.none())
    Util.deepStrictEqual(
      Option.firstSomeOf([Option.none(), Option.none(), Option.none(), Option.none(), Option.some(1)]),
      Option.some(1)
    )
    Util.deepStrictEqual(
      Option.firstSomeOf([Option.none(), Option.none(), Option.none(), Option.none()]),
      Option.none()
    )
  })

  it("orElseEither", () => {
    expect(pipe(Option.some(1), Option.orElseEither(() => Option.some(2)))).toEqual(Option.some(E.left(1)))
    expect(pipe(Option.some(1), Option.orElseEither(() => Option.none()))).toEqual(Option.some(E.left(1)))
    expect(pipe(Option.none(), Option.orElseEither(() => Option.some(2)))).toEqual(Option.some(E.right(2)))
    expect(pipe(Option.none(), Option.orElseEither(() => Option.none()))).toEqual(Option.none())
  })

  it("orElseSome", () => {
    expect(pipe(Option.some(1), Option.orElseSome(() => 2))).toEqual(Option.some(1))
    expect(pipe(Option.none(), Option.orElseSome(() => 2))).toEqual(Option.some(2))
  })

  it("getOrThrow", () => {
    expect(pipe(Option.some(1), Option.getOrThrow)).toEqual(1)
    expect(() => pipe(Option.none(), Option.getOrThrow)).toThrowError(
      new Error("getOrThrow called on a None")
    )
  })

  it("getOrThrowWith", () => {
    expect(pipe(Option.some(1), Option.getOrThrowWith(() => new Error("Unexpected None")))).toEqual(1)
    expect(() => pipe(Option.none(), Option.getOrThrowWith(() => new Error("Unexpected None")))).toThrowError(
      new Error("Unexpected None")
    )
  })

  it("unit", () => {
    Util.deepStrictEqual(Option.void, Option.some(undefined))
  })

  it("product", () => {
    const product = Option.product
    Util.deepStrictEqual(product(Option.none(), Option.none()), Option.none())
    Util.deepStrictEqual(product(Option.some(1), Option.none()), Option.none())
    Util.deepStrictEqual(product(Option.none(), Option.some("a")), Option.none())
    Util.deepStrictEqual(
      product(Option.some(1), Option.some("a")),
      Option.some([1, "a"])
    )
  })

  it("productMany", () => {
    const productMany = Option.productMany
    Util.deepStrictEqual(productMany(Option.none(), []), Option.none())
    Util.deepStrictEqual(productMany(Option.some(1), []), Option.some([1]))
    Util.deepStrictEqual(productMany(Option.some(1), [Option.none()]), Option.none())
    Util.deepStrictEqual(productMany(Option.some(1), [Option.some(2)]), Option.some([1, 2]))
  })

  it("fromIterable", () => {
    Util.deepStrictEqual(Option.fromIterable([]), Option.none())
    Util.deepStrictEqual(Option.fromIterable(["a"]), Option.some("a"))
  })

  it("map", () => {
    Util.deepStrictEqual(pipe(Option.some(2), Option.map(Util.double)), Option.some(4))
    Util.deepStrictEqual(pipe(Option.none(), Option.map(Util.double)), Option.none())
  })

  it("flatMap", () => {
    const f = (n: number) => Option.some(n * 2)
    const g = () => Option.none()
    Util.deepStrictEqual(pipe(Option.some(1), Option.flatMap(f)), Option.some(2))
    Util.deepStrictEqual(pipe(Option.none(), Option.flatMap(f)), Option.none())
    Util.deepStrictEqual(pipe(Option.some(1), Option.flatMap(g)), Option.none())
    Util.deepStrictEqual(pipe(Option.none(), Option.flatMap(g)), Option.none())
  })

  it("andThen", () => {
    expect(pipe(Option.some(1), Option.andThen(() => Option.some(2)))).toStrictEqual(Option.some(2))
    expect(pipe(Option.some(1), Option.andThen(Option.some(2)))).toStrictEqual(Option.some(2))
    expect(pipe(Option.some(1), Option.andThen(2))).toStrictEqual(Option.some(2))
    expect(pipe(Option.some(1), Option.andThen(() => 2))).toStrictEqual(Option.some(2))
    expect(pipe(Option.some(1), Option.andThen((a) => a))).toStrictEqual(Option.some(1))
    expect(Option.andThen(Option.some(1), () => Option.some(2))).toStrictEqual(Option.some(2))
    expect(Option.andThen(Option.some(1), Option.some(2))).toStrictEqual(Option.some(2))
    expect(Option.andThen(Option.some(1), 2)).toStrictEqual(Option.some(2))
    expect(Option.andThen(Option.some(1), () => 2)).toStrictEqual(Option.some(2))
    expect(Option.andThen(Option.some(1), (a) => a)).toStrictEqual(Option.some(1))
  })

  it("orElse", () => {
    const assertAlt = (
      a: Option.Option<number>,
      b: Option.Option<number>,
      expected: Option.Option<number>
    ) => {
      Util.deepStrictEqual(pipe(a, Option.orElse(() => b)), expected)
    }
    assertAlt(Option.some(1), Option.some(2), Option.some(1))
    assertAlt(Option.some(1), Option.none(), Option.some(1))
    assertAlt(Option.none(), Option.some(2), Option.some(2))
    assertAlt(Option.none(), Option.none(), Option.none())
  })

  it("partitionMap", () => {
    const f = (n: number) => (p(n) ? E.right(n + 1) : E.left(n - 1))
    assert.deepStrictEqual(pipe(Option.none(), Option.partitionMap(f)), [Option.none(), Option.none()])
    assert.deepStrictEqual(pipe(Option.some(1), Option.partitionMap(f)), [Option.some(0), Option.none()])
    assert.deepStrictEqual(pipe(Option.some(3), Option.partitionMap(f)), [Option.none(), Option.some(4)])
  })

  it("filterMap", () => {
    const f = (n: number) => (p(n) ? Option.some(n + 1) : Option.none())
    Util.deepStrictEqual(pipe(Option.none(), Option.filterMap(f)), Option.none())
    Util.deepStrictEqual(pipe(Option.some(1), Option.filterMap(f)), Option.none())
    Util.deepStrictEqual(pipe(Option.some(3), Option.filterMap(f)), Option.some(4))
  })

  it("match", () => {
    const onNone = () => "none"
    const onSome = (s: string) => `some${s.length}`
    const match = Option.match({ onNone, onSome })
    Util.deepStrictEqual(match(Option.none()), "none")
    Util.deepStrictEqual(match(Option.some("abc")), "some3")
  })

  it("getOrElse", () => {
    Util.deepStrictEqual(pipe(Option.some(1), Option.getOrElse(() => 0)), 1)
    Util.deepStrictEqual(pipe(Option.none(), Option.getOrElse(() => 0)), 0)
  })

  it("getOrNull", () => {
    Util.deepStrictEqual(Option.getOrNull(Option.none()), null)
    Util.deepStrictEqual(Option.getOrNull(Option.some(1)), 1)
  })

  it("getOrUndefined", () => {
    Util.deepStrictEqual(Option.getOrUndefined(Option.none()), undefined)
    Util.deepStrictEqual(Option.getOrUndefined(Option.some(1)), 1)
  })

  it("getOrder", () => {
    const OS = Option.getOrder(S.Order)
    Util.deepStrictEqual(OS(Option.none(), Option.none()), 0)
    Util.deepStrictEqual(OS(Option.some("a"), Option.none()), 1)
    Util.deepStrictEqual(OS(Option.none(), Option.some("a")), -1)
    Util.deepStrictEqual(OS(Option.some("a"), Option.some("a")), 0)
    Util.deepStrictEqual(OS(Option.some("a"), Option.some("b")), -1)
    Util.deepStrictEqual(OS(Option.some("b"), Option.some("a")), 1)
  })

  it("flatMapNullable", () => {
    interface X {
      readonly a?: {
        readonly b?: {
          readonly c?: {
            readonly d: number
          }
        }
      }
    }
    const x1: X = { a: {} }
    const x2: X = { a: { b: {} } }
    const x3: X = { a: { b: { c: { d: 1 } } } }
    Util.deepStrictEqual(
      pipe(
        Option.fromNullable(x1.a),
        Option.flatMapNullable((x) => x.b),
        Option.flatMapNullable((x) => x.c),
        Option.flatMapNullable((x) => x.d)
      ),
      Option.none()
    )
    Util.deepStrictEqual(
      pipe(
        Option.fromNullable(x2.a),
        Option.flatMapNullable((x) => x.b),
        Option.flatMapNullable((x) => x.c),
        Option.flatMapNullable((x) => x.d)
      ),
      Option.none()
    )
    Util.deepStrictEqual(
      pipe(
        Option.fromNullable(x3.a),
        Option.flatMapNullable((x) => x.b),
        Option.flatMapNullable((x) => x.c),
        Option.flatMapNullable((x) => x.d)
      ),
      Option.some(1)
    )
  })

  it("fromNullable", () => {
    Util.deepStrictEqual(Option.fromNullable(2), Option.some(2))
    Util.deepStrictEqual(Option.fromNullable(null), Option.none())
    Util.deepStrictEqual(Option.fromNullable(undefined), Option.none())
  })

  it("liftPredicate", () => {
    Util.deepStrictEqual(pipe(1, Option.liftPredicate(p)), Option.none())
    Util.deepStrictEqual(pipe(3, Option.liftPredicate(p)), Option.some(3))
    Util.deepStrictEqual(Option.liftPredicate(1, p), Option.none())
    Util.deepStrictEqual(Option.liftPredicate(3, p), Option.some(3))

    type Direction = "asc" | "desc"
    const isDirection = (s: string): s is Direction => s === "asc" || s === "desc"
    Util.deepStrictEqual(pipe("asc", Option.liftPredicate(isDirection)), Option.some("asc"))
    Util.deepStrictEqual(pipe("foo", Option.liftPredicate(isDirection)), Option.none())
    Util.deepStrictEqual(Option.liftPredicate("asc", isDirection), Option.some("asc"))
    Util.deepStrictEqual(Option.liftPredicate("foo", isDirection), Option.none())
  })

  it("containsWith", () => {
    const containsWith = Option.containsWith<number>((self, that) => self % 2 === that % 2)
    Util.deepStrictEqual(pipe(Option.some(2), containsWith(2)), true)
    Util.deepStrictEqual(pipe(Option.some(4), containsWith(4)), true)
    Util.deepStrictEqual(pipe(Option.some(1), containsWith(3)), true)

    Util.deepStrictEqual(pipe(Option.none(), containsWith(2)), false)
    Util.deepStrictEqual(pipe(Option.some(2), containsWith(1)), false)
  })

  it("contains", () => {
    Util.deepStrictEqual(pipe(Option.none(), Option.contains(2)), false)
    Util.deepStrictEqual(pipe(Option.some(2), Option.contains(2)), true)
    Util.deepStrictEqual(pipe(Option.some(2), Option.contains(1)), false)
  })

  it("isNone", () => {
    Util.deepStrictEqual(Option.isNone(Option.none()), true)
    Util.deepStrictEqual(Option.isNone(Option.some(1)), false)
  })

  it("isSome", () => {
    Util.deepStrictEqual(Option.isSome(Option.none()), false)
    Util.deepStrictEqual(Option.isSome(Option.some(1)), true)
  })

  it("exists", () => {
    const predicate = (a: number) => a === 2
    Util.deepStrictEqual(pipe(Option.none(), Option.exists(predicate)), false)
    Util.deepStrictEqual(pipe(Option.some(1), Option.exists(predicate)), false)
    Util.deepStrictEqual(pipe(Option.some(2), Option.exists(predicate)), true)
  })

  it("liftNullable", () => {
    const f = Option.liftNullable((n: number) => (n > 0 ? n : null))
    Util.deepStrictEqual(f(1), Option.some(1))
    Util.deepStrictEqual(f(-1), Option.none())
  })

  it("liftThrowable", () => {
    const parse = Option.liftThrowable(JSON.parse)
    Util.deepStrictEqual(parse("1"), Option.some(1))
    Util.deepStrictEqual(parse(""), Option.none())
  })

  it("tap", () => {
    Util.deepStrictEqual(Option.tap(Option.none(), () => Option.none()), Option.none())
    Util.deepStrictEqual(Option.tap(Option.some(1), () => Option.none()), Option.none())
    Util.deepStrictEqual(Option.tap(Option.none(), (n) => Option.some(n * 2)), Option.none())
    Util.deepStrictEqual(Option.tap(Option.some(1), (n) => Option.some(n * 2)), Option.some(1))
  })

  it("guard", () => {
    Util.deepStrictEqual(
      pipe(
        Option.Do,
        Option.bind("x", () => Option.some("a")),
        Option.bind("y", () => Option.some("a")),
        Option.filter(({ x, y }) => x === y)
      ),
      Option.some({ x: "a", y: "a" })
    )
    Util.deepStrictEqual(
      pipe(
        Option.Do,
        Option.bind("x", () => Option.some("a")),
        Option.bind("y", () => Option.some("b")),
        Option.filter(({ x, y }) => x === y)
      ),
      Option.none()
    )
  })

  it("zipWith", () => {
    expect(pipe(Option.none(), Option.zipWith(Option.some(2), (a, b) => a + b))).toEqual(Option.none())
    expect(pipe(Option.some(1), Option.zipWith(Option.none(), (a, b) => a + b))).toEqual(Option.none())
    expect(pipe(Option.some(1), Option.zipWith(Option.some(2), (a, b) => a + b))).toEqual(Option.some(3))
  })

  it("ap", () => {
    expect(pipe(Option.some((a: number) => (b: number) => a + b), Option.ap(Option.none()), Option.ap(Option.some(2))))
      .toEqual(Option.none())
    expect(pipe(Option.some((a: number) => (b: number) => a + b), Option.ap(Option.some(1)), Option.ap(Option.none())))
      .toEqual(Option.none())
    expect(pipe(Option.some((a: number) => (b: number) => a + b), Option.ap(Option.some(1)), Option.ap(Option.some(2))))
      .toEqual(Option.some(3))
  })

  it("reduceCompact", () => {
    const sumCompact = Option.reduceCompact(0, N.sum)
    expect(sumCompact([])).toEqual(0)
    expect(sumCompact([Option.some(2), Option.some(3)])).toEqual(5)
    expect(sumCompact([Option.some(2), Option.none(), Option.some(3)])).toEqual(5)
  })

  it("getEquivalence", () => {
    const isEquivalent = Option.getEquivalence(N.Equivalence)
    expect(isEquivalent(Option.none(), Option.none())).toEqual(true)
    expect(isEquivalent(Option.none(), Option.some(1))).toEqual(false)
    expect(isEquivalent(Option.some(1), Option.none())).toEqual(false)
    expect(isEquivalent(Option.some(2), Option.some(1))).toEqual(false)
    expect(isEquivalent(Option.some(1), Option.some(2))).toEqual(false)
    expect(isEquivalent(Option.some(2), Option.some(2))).toEqual(true)
  })

  it("all/ tuple", () => {
    assertType<Option.Option<[number, string]>>(Option.all([Option.some(1), Option.some("hello")]))
    assert.deepStrictEqual(Option.all([]), Option.some([]))
    assert.deepStrictEqual(Option.all([Option.some(1), Option.some("hello")]), Option.some([1, "hello"]))
    assert.deepStrictEqual(Option.all([Option.some(1), Option.none()]), Option.none())
  })

  it("all/ iterable", () => {
    assertType<Option.Option<Array<number>>>(Option.all([Option.some(1), Option.some(2)]))
    assertType<Option.Option<Array<number>>>(Option.all(new Set([Option.some(1), Option.some(2)])))

    Util.deepStrictEqual(Option.all([]), Option.some([]))
    Util.deepStrictEqual(Option.all([Option.none()]), Option.none())
    Util.deepStrictEqual(Option.all([Option.some(1), Option.some(2)]), Option.some([1, 2]))
    Util.deepStrictEqual(Option.all(new Set([Option.some(1), Option.some(2)])), Option.some([1, 2]))
    Util.deepStrictEqual(Option.all([Option.some(1), Option.none()]), Option.none())
  })

  it("all/ struct", () => {
    assertType<Option.Option<{ a: number; b: string }>>(Option.all({ a: Option.some(1), b: Option.some("hello") }))
    assert.deepStrictEqual(
      Option.all({ a: Option.some(1), b: Option.some("hello") }),
      Option.some({ a: 1, b: "hello" })
    )
    assert.deepStrictEqual(Option.all({ a: Option.some(1), b: Option.none() }), Option.none())
  })

  it(".pipe()", () => {
    expect(Option.some(1).pipe(Option.map((n) => n + 1))).toEqual(Option.some(2))
  })

  it("lift2", () => {
    const f = Option.lift2((a: number, b: number): number => a + b)
    expect(f(Option.none(), Option.none())).toStrictEqual(Option.none())
    expect(f(Option.some(1), Option.none())).toStrictEqual(Option.none())
    expect(f(Option.none(), Option.some(2))).toStrictEqual(Option.none())
    expect(f(Option.some(1), Option.some(2))).toStrictEqual(Option.some(3))
  })

  describe("do notation", () => {
    it("Do", () => {
      expectSome(Option.Do, {})
    })

    it("bindTo", () => {
      expectSome(pipe(Option.some(1), Option.bindTo("a")), { a: 1 })
      expectNone(pipe(Option.none(), Option.bindTo("a")))
    })

    it("bind", () => {
      expectSome(pipe(Option.some(1), Option.bindTo("a"), Option.bind("b", ({ a }) => Option.some(a + 1))), {
        a: 1,
        b: 2
      })
      expectNone(
        pipe(Option.some(1), Option.bindTo("a"), Option.bind("b", () => Option.none()))
      )
      expectNone(
        pipe(Option.none(), Option.bindTo("a"), Option.bind("b", () => Option.some(2)))
      )
    })

    it("let", () => {
      expectSome(pipe(Option.some(1), Option.bindTo("a"), Option.let("b", ({ a }) => a + 1)), { a: 1, b: 2 })
      expectNone(
        pipe(Option.none(), Option.bindTo("a"), Option.let("b", () => 2))
      )
    })
  })
})
