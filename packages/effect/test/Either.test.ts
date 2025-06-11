import { describe, it } from "@effect/vitest"
import {
  assertFalse,
  assertLeft,
  assertNone,
  assertRight,
  assertSome,
  assertTrue,
  deepStrictEqual,
  strictEqual,
  throws
} from "@effect/vitest/utils"
import { Chunk, Either, flow, Number as Num, Option, pipe, String as Str } from "effect"

describe("Either", () => {
  it("void", () => {
    deepStrictEqual(Either.void, Either.right(undefined))
  })

  it("gen", () => {
    const a = Either.gen(function*() {
      const x = yield* Either.right(1)
      const y = yield* Either.right(2)
      return x + y
    })
    const b = Either.gen(function*() {
      return 10
    })
    const c = Either.gen(function*() {
      yield* Either.right(1)
      yield* Either.right(2)
    })
    const d = Either.gen(function*() {
      yield* Either.right(1)
      return yield* Either.right(2)
    })
    const e = Either.gen(function*() {
      yield* Either.right(1)
      yield* Either.left("err")
      return yield* Either.right(2)
    })
    const f = Either.gen(function*() {
      yield* Either.left("err")
    })
    const g = Either.gen({ context: "testContext" as const }, function*() {
      return yield* Either.right(this.context)
    })
    // TODO(4.0) remove this test
    // test adapter
    const h = Either.gen(function*($) {
      const x = yield* $(Either.right(1))
      const y = yield* $(Either.right(2))
      return x + y
    })

    assertRight(a, 3)
    assertRight(b, 10)
    assertRight(c, undefined)
    assertRight(d, 2)
    assertLeft(e, "err")
    assertLeft(f, "err")
    assertRight(g, "testContext")
    assertRight(h, 3)
  })

  it("toString", () => {
    strictEqual(
      String(Either.right(1)),
      `{
  "_id": "Either",
  "_tag": "Right",
  "right": 1
}`
    )
    strictEqual(
      String(Either.left("e")),
      `{
  "_id": "Either",
  "_tag": "Left",
  "left": "e"
}`
    )
    strictEqual(
      String(Either.right(Chunk.make(1, 2, 3))),
      `{
  "_id": "Either",
  "_tag": "Right",
  "right": {
    "_id": "Chunk",
    "values": [
      1,
      2,
      3
    ]
  }
}`
    )
    strictEqual(
      String(Either.left(Chunk.make(1, 2, 3))),
      `{
  "_id": "Either",
  "_tag": "Left",
  "left": {
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
    deepStrictEqual(Either.right(1).toJSON(), { _id: "Either", _tag: "Right", right: 1 })
    deepStrictEqual(Either.left("e").toJSON(), { _id: "Either", _tag: "Left", left: "e" })
  })

  it("inspect", () => {
    if (typeof window === "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { inspect } = require("node:util")
      deepStrictEqual(inspect(Either.right(1)), inspect({ _id: "Either", _tag: "Right", right: 1 }))
      deepStrictEqual(inspect(Either.left("e")), inspect({ _id: "Either", _tag: "Left", left: "e" }))
    }
  })

  it("isEither", () => {
    assertTrue(pipe(Either.right(1), Either.isEither))
    assertTrue(pipe(Either.left("e"), Either.isEither))
    assertFalse(pipe(Option.some(1), Either.isEither))
  })

  it("getRight", () => {
    assertSome(pipe(Either.right(1), Either.getRight), 1)
    assertNone(pipe(Either.left("a"), Either.getRight))
  })

  it("getLeft", () => {
    assertNone(pipe(Either.right(1), Either.getLeft))
    assertSome(pipe(Either.left("e"), Either.getLeft), "e")
  })

  it("map", () => {
    const f = Either.map(Str.length)
    assertRight(pipe(Either.right("abc"), f), 3)
    assertLeft(pipe(Either.left("s"), f), "s")
  })

  it("mapBoth", () => {
    const f = Either.mapBoth({
      onLeft: Str.length,
      onRight: (n: number) => n > 2
    })
    assertRight(pipe(Either.right(1), f), false)
    assertLeft(pipe(Either.left("a"), f), 1)
  })

  it("mapLeft", () => {
    const f = Either.mapLeft((n: number) => n * 2)
    assertRight(pipe(Either.right("a"), f), "a")
    assertLeft(pipe(Either.left(1), f), 2)
  })

  it("match", () => {
    const onLeft = (s: string) => `left${s.length}`
    const onRight = (s: string) => `right${s.length}`
    const match = Either.match({ onLeft, onRight })
    strictEqual(match(Either.left("abc")), "left3")
    strictEqual(match(Either.right("abc")), "right3")
  })

  it("isLeft", () => {
    assertFalse(Either.isLeft(Either.right(1)))
    assertTrue(Either.isLeft(Either.left(1)))
  })

  it("isRight", () => {
    assertTrue(Either.isRight(Either.right(1)))
    assertFalse(Either.isRight(Either.left(1)))
  })

  it("flip", () => {
    assertLeft(Either.flip(Either.right("a")), "a")
    assertRight(Either.flip(Either.left("b")), "b")
  })

  it("liftPredicate", () => {
    const isPositivePredicate = (n: number) => n > 0
    const onPositivePredicateError = (n: number) => `${n} is not positive`
    const isNumberRefinement = (n: string | number): n is number => typeof n === "number"
    const onNumberRefinementError = (n: string | number) => `${n} is not a number`

    assertRight(
      pipe(1, Either.liftPredicate(isPositivePredicate, onPositivePredicateError)),
      1
    )
    assertLeft(
      pipe(-1, Either.liftPredicate(isPositivePredicate, onPositivePredicateError)),
      "-1 is not positive"
    )
    assertRight(
      pipe(1, Either.liftPredicate(isNumberRefinement, onNumberRefinementError)),
      1
    )
    assertLeft(
      pipe("string", Either.liftPredicate(isNumberRefinement, onNumberRefinementError)),
      "string is not a number"
    )

    assertRight(
      Either.liftPredicate(1, isPositivePredicate, onPositivePredicateError),
      1
    )
    assertLeft(
      Either.liftPredicate(-1, isPositivePredicate, onPositivePredicateError),
      "-1 is not positive"
    )
    assertRight(
      Either.liftPredicate(1, isNumberRefinement, onNumberRefinementError),
      1
    )
    assertLeft(
      Either.liftPredicate("string", isNumberRefinement, onNumberRefinementError),
      "string is not a number"
    )
  })

  it("filterOrLeft", () => {
    deepStrictEqual(Either.filterOrLeft(Either.right(1), (n) => n > 0, () => "a"), Either.right(1))
    deepStrictEqual(Either.filterOrLeft(Either.right(1), (n) => n > 1, () => "a"), Either.left("a"))
    deepStrictEqual(Either.filterOrLeft(Either.left(1), (n) => n > 0, () => "a"), Either.left(1))

    deepStrictEqual(Either.right(1).pipe(Either.filterOrLeft((n) => n > 0, () => "a")), Either.right(1))
    deepStrictEqual(Either.right(1).pipe(Either.filterOrLeft((n) => n > 1, () => "a")), Either.left("a"))
    deepStrictEqual(Either.left(1).pipe(Either.filterOrLeft((n) => n > 0, () => "a")), Either.left(1))
  })

  it("merge", () => {
    deepStrictEqual(Either.merge(Either.right(1)), 1)
    deepStrictEqual(Either.merge(Either.left("a")), "a")
  })

  it("getEquivalence", () => {
    const isEquivalent = Either.getEquivalence({ right: Num.Equivalence, left: Str.Equivalence })
    deepStrictEqual(isEquivalent(Either.right(1), Either.right(1)), true)
    deepStrictEqual(isEquivalent(Either.right(1), Either.right(2)), false)
    deepStrictEqual(isEquivalent(Either.right(1), Either.left("foo")), false)
    deepStrictEqual(isEquivalent(Either.left("foo"), Either.left("foo")), true)
    deepStrictEqual(isEquivalent(Either.left("foo"), Either.left("bar")), false)
    deepStrictEqual(isEquivalent(Either.left("foo"), Either.right(1)), false)
  })

  it("pipe()", () => {
    assertRight(Either.right(1).pipe(Either.map((n) => n + 1)), 2)
  })

  it("fromNullable", () => {
    deepStrictEqual(Either.fromNullable(null, () => "fallback"), Either.left("fallback"))
    deepStrictEqual(Either.fromNullable(undefined, () => "fallback"), Either.left("fallback"))
    deepStrictEqual(Either.fromNullable(1, () => "fallback"), Either.right(1))
  })

  it("fromOption", () => {
    deepStrictEqual(Either.fromOption(Option.none(), () => "none"), Either.left("none"))
    deepStrictEqual(Either.fromOption(Option.some(1), () => "none"), Either.right(1))
  })

  it("try", () => {
    deepStrictEqual(Either.try(() => 1), Either.right(1))
    deepStrictEqual(
      Either.try(() => {
        throw "b"
      }),
      Either.left("b")
    )
    deepStrictEqual(Either.try({ try: () => 1, catch: (e) => new Error(String(e)) }), Either.right(1))
    deepStrictEqual(
      Either.try({
        try: () => {
          throw "b"
        },
        catch: (e) => new Error(String(e))
      }),
      Either.left(new Error("b"))
    )
  })

  it("getOrElse", () => {
    strictEqual(Either.getOrElse(Either.right(1), (error) => error + "!"), 1)
    strictEqual(Either.getOrElse(Either.left("not a number"), (error) => error + "!"), "not a number!")
  })

  it("getOrNull", () => {
    strictEqual(Either.getOrNull(Either.right(1)), 1)
    strictEqual(Either.getOrNull(Either.left("a")), null)
  })

  it("getOrUndefined", () => {
    strictEqual(Either.getOrUndefined(Either.right(1)), 1)
    strictEqual(Either.getOrUndefined(Either.left("a")), undefined)
  })

  it("getOrThrowWith", () => {
    strictEqual(pipe(Either.right(1), Either.getOrThrowWith((e) => new Error(`Unexpected Left: ${e}`))), 1)
    throws(() => pipe(Either.left("e"), Either.getOrThrowWith((e) => new Error(`Unexpected Left: ${e}`))))
  })

  it("getOrThrow", () => {
    strictEqual(pipe(Either.right(1), Either.getOrThrow), 1)
    throws(() => pipe(Either.left("e"), Either.getOrThrow), new Error("getOrThrow called on a Left"))
  })

  it("flatMap", () => {
    const f = Either.flatMap(flow(Str.length, Either.right))
    assertRight(pipe(Either.right("abc"), f), 3)
    assertLeft(pipe(Either.left("maError"), f), "maError")
  })

  it("andThen", () => {
    assertRight(pipe(Either.right(1), Either.andThen(() => Either.right(2))), 2)
    assertRight(pipe(Either.right(1), Either.andThen(Either.right(2))), 2)
    assertRight(pipe(Either.right(1), Either.andThen(2)), 2)
    assertRight(pipe(Either.right(1), Either.andThen(() => 2)), 2)
    assertRight(pipe(Either.right(1), Either.andThen((a) => a)), 1)
    assertRight(Either.andThen(Either.right(1), () => Either.right(2)), 2)
    assertRight(Either.andThen(Either.right(1), Either.right(2)), 2)
    assertRight(Either.andThen(Either.right(1), () => 2), 2)
    assertRight(Either.andThen(Either.right(1), 2), 2)
    assertRight(Either.andThen(Either.right(1), (a) => a), 1)
  })

  it("ap", () => {
    const add = (a: number) => (b: number) => a + b
    assertRight(Either.right(add).pipe(Either.ap(Either.right(1)), Either.ap(Either.right(2))), 3)
    assertLeft(Either.right(add).pipe(Either.ap(Either.left("b")), Either.ap(Either.right(2))), "b")
    assertLeft(Either.right(add).pipe(Either.ap(Either.right(1)), Either.ap(Either.left("c"))), "c")
    assertLeft(Either.right(add).pipe(Either.ap(Either.left("b")), Either.ap(Either.left("c"))), "b")
    assertLeft(
      (Either.left("a") as Either.Either<typeof add, string>).pipe(
        Either.ap(Either.right(1)),
        Either.ap(Either.right(2))
      ),
      "a"
    )
  })

  it("zipWith", () => {
    assertLeft(pipe(Either.left(0), Either.zipWith(Either.right(2), (a, b) => a + b)), 0)
    assertLeft(pipe(Either.right(1), Either.zipWith(Either.left(0), (a, b) => a + b)), 0)
    assertRight(pipe(Either.right(1), Either.zipWith(Either.right(2), (a, b) => a + b)), 3)
  })

  it("all", () => {
    // tuples and arrays
    assertRight(Either.all([]), [])
    assertRight(Either.all([Either.right(1)]), [1])
    assertRight(Either.all([Either.right(1), Either.right(true)]), [1, true])
    assertLeft(Either.all([Either.right(1), Either.left("e")]), "e")
    // structs and records
    assertRight(Either.all({}), {})
    assertRight(Either.all({ a: Either.right(1) }), { a: 1 })
    assertRight(Either.all({ a: Either.right(1), b: Either.right(true) }), { a: 1, b: true })
    assertLeft(Either.all({ a: Either.right(1), b: Either.left("e") }), "e")
  })

  it("orElse", () => {
    assertRight(pipe(Either.right(1), Either.orElse(() => Either.right(2))), 1)
    assertRight(pipe(Either.right(1), Either.orElse(() => Either.left("b"))), 1)
    assertRight(pipe(Either.left("a"), Either.orElse(() => Either.right(2))), 2)
    assertLeft(pipe(Either.left("a"), Either.orElse(() => Either.left("b"))), "b")
  })

  describe("do notation", () => {
    it("Do", () => {
      assertRight(Either.Do, {})
    })

    it("bindTo", () => {
      assertRight(pipe(Either.right(1), Either.bindTo("a")), { a: 1 })
      assertLeft(pipe(Either.left("left"), Either.bindTo("a")), "left")
      assertRight(
        pipe(
          Either.right(1),
          Either.bindTo("__proto__"),
          Either.bind("a", () => Either.right(1))
        ),
        { a: 1, ["__proto__"]: 1 }
      )
    })

    it("bind", () => {
      assertRight(pipe(Either.right(1), Either.bindTo("a"), Either.bind("b", ({ a }) => Either.right(a + 1))), {
        a: 1,
        b: 2
      })
      assertLeft(
        pipe(Either.right(1), Either.bindTo("a"), Either.bind("b", () => Either.left("left"))),
        "left"
      )
      assertLeft(
        pipe(Either.left("left"), Either.bindTo("a"), Either.bind("b", () => Either.right(2))),
        "left"
      )
      assertRight(
        pipe(
          Either.right(1),
          Either.bindTo("a"),
          Either.bind("__proto__", ({ a }) => Either.right(a + 1)),
          Either.bind("b", ({ a }) => Either.right(a + 1))
        ),
        { a: 1, b: 2, ["__proto__"]: 2 }
      )
    })

    it("let", () => {
      assertRight(pipe(Either.right(1), Either.bindTo("a"), Either.let("b", ({ a }) => a + 1)), { a: 1, b: 2 })
      assertLeft(
        pipe(Either.left("left"), Either.bindTo("a"), Either.let("b", () => 2)),
        "left"
      )
      assertRight(
        pipe(
          Either.right(1),
          Either.bindTo("a"),
          Either.let("__proto__", ({ a }) => a + 1),
          Either.let("b", ({ a }) => a + 1)
        ),
        { a: 1, b: 2, ["__proto__"]: 2 }
      )
    })
  })
})
