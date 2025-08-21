import { describe, it } from "@effect/vitest"
import {
  assertFalse,
  assertNone,
  assertSome,
  assertTrue,
  deepStrictEqual,
  strictEqual,
  throws
} from "@effect/vitest/utils"
import { Chunk, Either, Equal, Hash, Number as N, Option, pipe, String as S } from "effect"

const gt2 = (n: number): boolean => n > 2

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
    // TODO(4.0) remove this test
    // test adapter
    const h = Option.gen(function*($) {
      const x = yield* $(Option.some(1))
      const y = yield* $(Option.some(2))
      return x + y
    })

    assertSome(a, 3)
    assertSome(b, 10)
    assertSome(c, undefined)
    assertSome(d, 2)
    assertNone(e)
    assertNone(f)
    assertSome(g, "testContext")
    assertSome(h, 3)
  })

  it("toString", () => {
    strictEqual(
      String(Option.none()),
      `{
  "_id": "Option",
  "_tag": "None"
}`
    )
    strictEqual(
      String(Option.some(1)),
      `{
  "_id": "Option",
  "_tag": "Some",
  "value": 1
}`
    )
    strictEqual(
      String(Option.some(Chunk.make(1, 2, 3))),
      `{
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
}`
    )
  })

  it("toJSON", () => {
    deepStrictEqual(Option.none().toJSON(), { _id: "Option", _tag: "None" })
    deepStrictEqual(Option.some(1).toJSON(), { _id: "Option", _tag: "Some", value: 1 })
  })

  it("inspect", () => {
    if (typeof window !== "undefined") {
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { inspect } = require("node:util")
    deepStrictEqual(inspect(Option.none()), inspect({ _id: "Option", _tag: "None" }))
    deepStrictEqual(inspect(Option.some(1)), inspect({ _id: "Option", _tag: "Some", value: 1 }))
  })

  it("Equal", () => {
    assertTrue(Equal.equals(Option.some(1), Option.some(1)))
    assertFalse(Equal.equals(Option.some(1), Option.some(2)))
    assertTrue(Equal.equals(Option.none(), Option.none()))
  })

  it("Hash", () => {
    strictEqual(Hash.hash(Option.some(1)), Hash.hash(Option.some(1)))
    strictEqual(Hash.hash(Option.some(1)) === Hash.hash(Option.some(2)), false)
    strictEqual(Hash.hash(Option.none()), Hash.hash(Option.none()))
  })

  it("getRight", () => {
    assertSome(Option.getRight(Either.right(1)), 1)
    assertNone(Option.getRight(Either.left("a")))
  })

  it("getLeft", () => {
    assertNone(Option.getLeft(Either.right(1)))
    assertSome(Option.getLeft(Either.left("a")), "a")
  })

  it("toRefinement", () => {
    const f = (
      s: string | number
    ): Option.Option<string> => (typeof s === "string" ? Option.some(s) : Option.none())
    const isString = Option.toRefinement(f)

    assertTrue(isString("s"))
    assertFalse(isString(1))

    type A = { readonly type: "A" }
    type B = { readonly type: "B" }
    type C = A | B
    const isA = Option.toRefinement<C, A>((c) => (c.type === "A" ? Option.some(c) : Option.none()))

    assertTrue(isA({ type: "A" }))
    assertFalse(isA({ type: "B" }))
  })

  it("isOption", () => {
    assertTrue(pipe(Option.some(1), Option.isOption))
    assertTrue(pipe(Option.none(), Option.isOption))
    assertFalse(pipe(Either.right(1), Option.isOption))
  })

  it("firstSomeOf", () => {
    assertNone(Option.firstSomeOf([]))
    assertSome(Option.firstSomeOf([Option.some(1)]), 1)
    assertNone(Option.firstSomeOf([Option.none()]))
    assertSome(
      Option.firstSomeOf([Option.none(), Option.none(), Option.none(), Option.none(), Option.some(1)]),
      1
    )
    assertNone(
      Option.firstSomeOf([Option.none(), Option.none(), Option.none(), Option.none()])
    )
  })

  it("orElseEither", () => {
    assertSome(pipe(Option.some(1), Option.orElseEither(() => Option.some(2))), Either.left(1))
    assertSome(pipe(Option.some(1), Option.orElseEither(() => Option.none())), Either.left(1))
    assertSome(pipe(Option.none(), Option.orElseEither(() => Option.some(2))), Either.right(2))
    assertNone(pipe(Option.none(), Option.orElseEither(() => Option.none())))
  })

  it("orElseSome", () => {
    assertSome(pipe(Option.some(1), Option.orElseSome(() => 2)), 1)
    assertSome(pipe(Option.none(), Option.orElseSome(() => 2)), 2)
  })

  it("getOrThrow", () => {
    strictEqual(pipe(Option.some(1), Option.getOrThrow), 1)
    throws(() => pipe(Option.none(), Option.getOrThrow), new Error("getOrThrow called on a None"))
  })

  it("getOrThrowWith", () => {
    strictEqual(pipe(Option.some(1), Option.getOrThrowWith(() => new Error("Unexpected None"))), 1)
    throws(
      () => pipe(Option.none(), Option.getOrThrowWith(() => new Error("Unexpected None"))),
      new Error("Unexpected None")
    )
  })

  it("unit", () => {
    assertSome(Option.void, undefined)
  })

  it("product", () => {
    const product = Option.product
    assertNone(product(Option.none(), Option.none()))
    assertNone(product(Option.some(1), Option.none()))
    assertNone(product(Option.none(), Option.some("a")))
    assertSome(product(Option.some(1), Option.some("a")), [1, "a"])
  })

  it("productMany", () => {
    const productMany = Option.productMany
    assertNone(productMany(Option.none(), []))
    assertSome(productMany(Option.some(1), []), [1])
    assertNone(productMany(Option.some(1), [Option.none()]))
    assertSome(productMany(Option.some(1), [Option.some(2)]), [1, 2])
  })

  it("fromIterable", () => {
    assertNone(Option.fromIterable([]))
    assertSome(Option.fromIterable(["a"]), "a")
  })

  it("map", () => {
    assertSome(pipe(Option.some(2), Option.map((n) => n * 2)), 4)
    assertNone(pipe(Option.none(), Option.map((n) => n * 2)))
  })

  it("flatMap", () => {
    const f = (n: number) => Option.some(n * 2)
    const g = () => Option.none()
    assertSome(pipe(Option.some(1), Option.flatMap(f)), 2)
    assertNone(pipe(Option.none(), Option.flatMap(f)))
    assertNone(pipe(Option.some(1), Option.flatMap(g)))
    assertNone(pipe(Option.none(), Option.flatMap(g)))
  })

  it("andThen", () => {
    assertSome(pipe(Option.some(1), Option.andThen(() => Option.some(2))), 2)
    assertSome(pipe(Option.some(1), Option.andThen(Option.some(2))), 2)
    assertSome(pipe(Option.some(1), Option.andThen(2)), 2)
    assertSome(pipe(Option.some(1), Option.andThen(() => 2)), 2)
    assertSome(pipe(Option.some(1), Option.andThen((a) => a)), 1)
    assertSome(Option.andThen(Option.some(1), () => Option.some(2)), 2)
    assertSome(Option.andThen(Option.some(1), Option.some(2)), 2)
    assertSome(Option.andThen(Option.some(1), 2), 2)
    assertSome(Option.andThen(Option.some(1), () => 2), 2)
    assertSome(Option.andThen(Option.some(1), (a) => a), 1)
  })

  it("orElse", () => {
    const assertOrElse = (
      a: Option.Option<number>,
      b: Option.Option<number>,
      expected: Option.Option<number>
    ) => {
      deepStrictEqual(pipe(a, Option.orElse(() => b)), expected)
    }
    assertOrElse(Option.some(1), Option.some(2), Option.some(1))
    assertOrElse(Option.some(1), Option.none(), Option.some(1))
    assertOrElse(Option.none(), Option.some(2), Option.some(2))
    assertOrElse(Option.none(), Option.none(), Option.none())
  })

  it("partitionMap", () => {
    const f = (n: number) => (gt2(n) ? Either.right(n + 1) : Either.left(n - 1))
    deepStrictEqual(pipe(Option.none(), Option.partitionMap(f)), [Option.none(), Option.none()])
    deepStrictEqual(pipe(Option.some(1), Option.partitionMap(f)), [Option.some(0), Option.none()])
    deepStrictEqual(pipe(Option.some(3), Option.partitionMap(f)), [Option.none(), Option.some(4)])
  })

  it("filterMap", () => {
    const f = (n: number) => (gt2(n) ? Option.some(n + 1) : Option.none())
    assertNone(pipe(Option.none(), Option.filterMap(f)))
    assertNone(pipe(Option.some(1), Option.filterMap(f)))
    assertSome(pipe(Option.some(3), Option.filterMap(f)), 4)
  })

  it("match", () => {
    const onNone = () => "none"
    const onSome = (s: string) => `some${s.length}`
    const match = Option.match({ onNone, onSome })
    strictEqual(match(Option.none()), "none")
    strictEqual(match(Option.some("abc")), "some3")
  })

  it("getOrElse", () => {
    strictEqual(pipe(Option.some(1), Option.getOrElse(() => 0)), 1)
    strictEqual(pipe(Option.none(), Option.getOrElse(() => 0)), 0)
  })

  it("getOrNull", () => {
    strictEqual(Option.getOrNull(Option.none()), null)
    strictEqual(Option.getOrNull(Option.some(1)), 1)
  })

  it("getOrUndefined", () => {
    strictEqual(Option.getOrUndefined(Option.none()), undefined)
    strictEqual(Option.getOrUndefined(Option.some(1)), 1)
  })

  it("getOrder", () => {
    const OS = Option.getOrder(S.Order)
    strictEqual(OS(Option.none(), Option.none()), 0)
    strictEqual(OS(Option.some("a"), Option.none()), 1)
    strictEqual(OS(Option.none(), Option.some("a")), -1)
    strictEqual(OS(Option.some("a"), Option.some("a")), 0)
    strictEqual(OS(Option.some("a"), Option.some("b")), -1)
    strictEqual(OS(Option.some("b"), Option.some("a")), 1)
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
    assertNone(
      pipe(
        Option.fromNullable(x1.a),
        Option.flatMapNullable((x) => x.b),
        Option.flatMapNullable((x) => x.c),
        Option.flatMapNullable((x) => x.d)
      )
    )
    assertNone(
      pipe(
        Option.fromNullable(x2.a),
        Option.flatMapNullable((x) => x.b),
        Option.flatMapNullable((x) => x.c),
        Option.flatMapNullable((x) => x.d)
      )
    )
    assertSome(
      pipe(
        Option.fromNullable(x3.a),
        Option.flatMapNullable((x) => x.b),
        Option.flatMapNullable((x) => x.c),
        Option.flatMapNullable((x) => x.d)
      ),
      1
    )
  })

  it("fromNullable", () => {
    assertSome(Option.fromNullable(2), 2)
    assertNone(Option.fromNullable(null))
    assertNone(Option.fromNullable(undefined))
  })

  it("liftPredicate", () => {
    assertNone(pipe(1, Option.liftPredicate(gt2)))
    assertSome(pipe(3, Option.liftPredicate(gt2)), 3)
    assertNone(Option.liftPredicate(1, gt2))
    assertSome(Option.liftPredicate(3, gt2), 3)

    type Direction = "asc" | "desc"
    const isDirection = (s: string): s is Direction => s === "asc" || s === "desc"
    assertSome(pipe("asc", Option.liftPredicate(isDirection)), "asc")
    assertNone(pipe("foo", Option.liftPredicate(isDirection)))
    assertSome(Option.liftPredicate("asc", isDirection), "asc")
    assertNone(Option.liftPredicate("foo", isDirection))
  })

  it("containsWith", () => {
    const containsWith = Option.containsWith<number>((self, that) => self % 2 === that % 2)
    assertTrue(pipe(Option.some(2), containsWith(2)))
    assertTrue(pipe(Option.some(4), containsWith(4)))
    assertTrue(pipe(Option.some(1), containsWith(3)))

    assertFalse(pipe(Option.none(), containsWith(2)))
    assertFalse(pipe(Option.some(2), containsWith(1)))
  })

  it("contains", () => {
    assertFalse(pipe(Option.none(), Option.contains(2)))
    assertTrue(pipe(Option.some(2), Option.contains(2)))
    assertFalse(pipe(Option.some(2), Option.contains(1)))
  })

  it("isNone", () => {
    assertTrue(Option.isNone(Option.none()))
    assertFalse(Option.isNone(Option.some(1)))
  })

  it("isSome", () => {
    assertFalse(Option.isSome(Option.none()))
    assertTrue(Option.isSome(Option.some(1)))
  })

  it("exists", () => {
    const predicate = (a: number) => a === 2
    assertFalse(pipe(Option.none(), Option.exists(predicate)))
    assertFalse(pipe(Option.some(1), Option.exists(predicate)))
    assertTrue(pipe(Option.some(2), Option.exists(predicate)))
  })

  it("liftNullable", () => {
    const f = Option.liftNullable((n: number) => (n > 0 ? n : null))
    assertSome(f(1), 1)
    assertNone(f(-1))
  })

  it("liftThrowable", () => {
    const parse = Option.liftThrowable(JSON.parse)
    assertSome(parse("1"), 1)
    assertNone(parse(""))
  })

  it("tap", () => {
    assertNone(Option.tap(Option.none(), () => Option.none()))
    assertNone(Option.tap(Option.some(1), () => Option.none()))
    assertNone(Option.tap(Option.none(), (n) => Option.some(n * 2)))
    assertSome(Option.tap(Option.some(1), (n) => Option.some(n * 2)), 1)
  })

  it("guard", () => {
    assertSome(
      pipe(
        Option.Do,
        Option.bind("x", () => Option.some("a")),
        Option.bind("y", () => Option.some("a")),
        Option.filter(({ x, y }) => x === y)
      ),
      { x: "a", y: "a" }
    )
    assertNone(
      pipe(
        Option.Do,
        Option.bind("x", () => Option.some("a")),
        Option.bind("y", () => Option.some("b")),
        Option.filter(({ x, y }) => x === y)
      )
    )
  })

  it("zipWith", () => {
    assertNone(pipe(Option.none(), Option.zipWith(Option.some(2), (a, b) => a + b)))
    assertNone(pipe(Option.some(1), Option.zipWith(Option.none(), (a, b) => a + b)))
    assertSome(pipe(Option.some(1), Option.zipWith(Option.some(2), (a, b) => a + b)), 3)
  })

  it("ap", () => {
    assertNone(
      pipe(Option.some((a: number) => (b: number) => a + b), Option.ap(Option.none()), Option.ap(Option.some(2)))
    )
    assertNone(
      pipe(Option.some((a: number) => (b: number) => a + b), Option.ap(Option.some(1)), Option.ap(Option.none()))
    )
    assertSome(
      pipe(Option.some((a: number) => (b: number) => a + b), Option.ap(Option.some(1)), Option.ap(Option.some(2))),
      3
    )
  })

  it("reduceCompact", () => {
    const sumCompact = Option.reduceCompact(0, N.sum)
    strictEqual(sumCompact([]), 0)
    strictEqual(sumCompact([Option.some(2), Option.some(3)]), 5)
    strictEqual(sumCompact([Option.some(2), Option.none(), Option.some(3)]), 5)
  })

  it("getEquivalence", () => {
    const isEquivalent = Option.getEquivalence(N.Equivalence)
    assertTrue(isEquivalent(Option.none(), Option.none()))
    assertFalse(isEquivalent(Option.none(), Option.some(1)))
    assertFalse(isEquivalent(Option.some(1), Option.none()))
    assertFalse(isEquivalent(Option.some(2), Option.some(1)))
    assertFalse(isEquivalent(Option.some(1), Option.some(2)))
    assertTrue(isEquivalent(Option.some(2), Option.some(2)))
  })

  it("all/ tuple", () => {
    assertSome(Option.all([]), [])
    assertSome(Option.all([Option.some(1), Option.some("hello")]), [1, "hello"])
    assertNone(Option.all([Option.some(1), Option.none()]))
  })

  it("all/ iterable", () => {
    assertSome(Option.all([]), [])
    assertNone(Option.all([Option.none()]))
    assertSome(Option.all([Option.some(1), Option.some(2)]), [1, 2])
    assertSome(Option.all(new Set([Option.some(1), Option.some(2)])), [1, 2])
    assertNone(Option.all([Option.some(1), Option.none()]))
  })

  it("all/ struct", () => {
    assertSome(
      Option.all({ a: Option.some(1), b: Option.some("hello") }),
      { a: 1, b: "hello" }
    )
    assertNone(Option.all({ a: Option.some(1), b: Option.none() }))
  })

  it(".pipe()", () => {
    assertSome(Option.some(1).pipe(Option.map((n) => n + 1)), 2)
  })

  it("lift2", () => {
    const f = Option.lift2((a: number, b: number): number => a + b)
    assertNone(f(Option.none(), Option.none()))
    assertNone(f(Option.some(1), Option.none()))
    assertNone(f(Option.none(), Option.some(2)))
    assertSome(f(Option.some(1), Option.some(2)), 3)
  })

  describe("do notation", () => {
    it("Do", () => {
      assertSome(Option.Do, {})
    })

    it("bindTo", () => {
      assertSome(pipe(Option.some(1), Option.bindTo("a")), { a: 1 })
      assertNone(pipe(Option.none(), Option.bindTo("a")))
      assertSome(
        pipe(
          Option.some(1),
          Option.bindTo("__proto__"),
          Option.bind("x", () => Option.some(2))
        ),
        { x: 2, ["__proto__"]: 1 }
      )
    })

    it("bind", () => {
      assertSome(pipe(Option.some(1), Option.bindTo("a"), Option.bind("b", ({ a }) => Option.some(a + 1))), {
        a: 1,
        b: 2
      })
      assertNone(
        pipe(Option.some(1), Option.bindTo("a"), Option.bind("b", () => Option.none()))
      )
      assertNone(
        pipe(Option.none(), Option.bindTo("a"), Option.bind("b", () => Option.some(2)))
      )
      assertSome(
        pipe(
          Option.some(1),
          Option.bindTo("a"),
          Option.bind("__proto__", ({ a }) => Option.some(a + 1)),
          Option.bind("b", ({ a }) => Option.some(a + 1))
        ),
        { a: 1, b: 2, ["__proto__"]: 2 }
      )
    })

    it("let", () => {
      assertSome(pipe(Option.some(1), Option.bindTo("a"), Option.let("b", ({ a }) => a + 1)), { a: 1, b: 2 })
      assertNone(
        pipe(Option.none(), Option.bindTo("a"), Option.let("b", () => 2))
      )
      assertSome(
        pipe(
          Option.some(1),
          Option.bindTo("a"),
          Option.let("__proto__", ({ a }) => a + 1),
          Option.let("b", ({ a }) => a + 1)
        ),
        { a: 1, b: 2, ["__proto__"]: 2 }
      )
    })
  })

  it("as", () => {
    assertNone(Option.none().pipe(Option.as("a")))
    assertSome(Option.some(1).pipe(Option.as("a")), "a")

    assertNone(Option.as(Option.none(), "a"))
    assertSome(Option.as(Option.some(1), "a"), "a")
  })

  it("asVoid", () => {
    assertNone(Option.none().pipe(Option.asVoid))
    assertSome(Option.some(1).pipe(Option.asVoid), undefined)
  })

  it("[internal] mergeWith", () => {
    const mergeWith = Option.mergeWith(N.sum)
    assertNone(mergeWith(Option.none(), Option.none()))
    assertSome(mergeWith(Option.some(1), Option.none()), 1)
    assertSome(mergeWith(Option.none(), Option.some(2)), 2)
    assertSome(mergeWith(Option.some(1), Option.some(2)), 3)
  })
})
