import { Chunk, Either, flow, Number as Num, Option, pipe, String as Str } from "effect"
import { assertLeft, assertRight, deepStrictEqual, strictEqual, throws } from "effect/test/util"
import { describe, it } from "vitest"

describe("Either", () => {
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
    const g = Either.gen({ context: "testContext" as const }, function*($) {
      return yield* $(Either.right(this.context))
    })
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
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { inspect } = require("node:util")
      deepStrictEqual(inspect(Either.right(1)), inspect({ _id: "Either", _tag: "Right", right: 1 }))
      deepStrictEqual(inspect(Either.left("e")), inspect({ _id: "Either", _tag: "Left", left: "e" }))
    }
  })

  it("isEither", () => {
    deepStrictEqual(pipe(Either.right(1), Either.isEither), true)
    deepStrictEqual(pipe(Either.left("e"), Either.isEither), true)
    deepStrictEqual(pipe(Option.some(1), Either.isEither), false)
  })

  it("getRight", () => {
    deepStrictEqual(pipe(Either.right(1), Either.getRight), Option.some(1))
    deepStrictEqual(pipe(Either.left("a"), Either.getRight), Option.none())
  })

  it("getLeft", () => {
    deepStrictEqual(pipe(Either.right(1), Either.getLeft), Option.none())
    deepStrictEqual(pipe(Either.left("e"), Either.getLeft), Option.some("e"))
  })

  it("map", () => {
    const f = Either.map(Str.length)
    deepStrictEqual(pipe(Either.right("abc"), f), Either.right(3))
    deepStrictEqual(pipe(Either.left("s"), f), Either.left("s"))
  })

  it("mapBoth", () => {
    const f = Either.mapBoth({
      onLeft: Str.length,
      onRight: (n: number) => n > 2
    })
    deepStrictEqual(pipe(Either.right(1), f), Either.right(false))
    deepStrictEqual(pipe(Either.left("a"), f), Either.left(1))
  })

  it("mapLeft", () => {
    const f = Either.mapLeft((n: number) => n * 2)
    deepStrictEqual(pipe(Either.right("a"), f), Either.right("a"))
    deepStrictEqual(pipe(Either.left(1), f), Either.left(2))
  })

  it("match", () => {
    const onLeft = (s: string) => `left${s.length}`
    const onRight = (s: string) => `right${s.length}`
    const match = Either.match({ onLeft, onRight })
    deepStrictEqual(match(Either.left("abc")), "left3")
    deepStrictEqual(match(Either.right("abc")), "right3")
  })

  it("isLeft", () => {
    deepStrictEqual(Either.isLeft(Either.right(1)), false)
    deepStrictEqual(Either.isLeft(Either.left(1)), true)
  })

  it("isRight", () => {
    deepStrictEqual(Either.isRight(Either.right(1)), true)
    deepStrictEqual(Either.isRight(Either.left(1)), false)
  })

  it("flip", () => {
    deepStrictEqual(Either.flip(Either.right("a")), Either.left("a"))
    deepStrictEqual(Either.flip(Either.left("b")), Either.right("b"))
  })

  it("liftPredicate", () => {
    const isPositivePredicate = (n: number) => n > 0
    const onPositivePredicateError = (n: number) => `${n} is not positive`
    const isNumberRefinement = (n: string | number): n is number => typeof n === "number"
    const onNumberRefinementError = (n: string | number) => `${n} is not a number`

    deepStrictEqual(
      pipe(1, Either.liftPredicate(isPositivePredicate, onPositivePredicateError)),
      Either.right(1)
    )
    deepStrictEqual(
      pipe(-1, Either.liftPredicate(isPositivePredicate, onPositivePredicateError)),
      Either.left(`-1 is not positive`)
    )
    deepStrictEqual(
      pipe(1, Either.liftPredicate(isNumberRefinement, onNumberRefinementError)),
      Either.right(1)
    )
    deepStrictEqual(
      pipe("string", Either.liftPredicate(isNumberRefinement, onNumberRefinementError)),
      Either.left(`string is not a number`)
    )

    deepStrictEqual(
      Either.liftPredicate(1, isPositivePredicate, onPositivePredicateError),
      Either.right(1)
    )
    deepStrictEqual(
      Either.liftPredicate(-1, isPositivePredicate, onPositivePredicateError),
      Either.left(`-1 is not positive`)
    )
    deepStrictEqual(
      Either.liftPredicate(1, isNumberRefinement, onNumberRefinementError),
      Either.right(1)
    )
    deepStrictEqual(
      Either.liftPredicate("string", isNumberRefinement, onNumberRefinementError),
      Either.left(`string is not a number`)
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
    deepStrictEqual(Either.getOrElse(Either.right(1), (error) => error + "!"), 1)
    deepStrictEqual(Either.getOrElse(Either.left("not a number"), (error) => error + "!"), "not a number!")
  })

  it("getOrNull", () => {
    deepStrictEqual(Either.getOrNull(Either.right(1)), 1)
    deepStrictEqual(Either.getOrNull(Either.left("a")), null)
  })

  it("getOrUndefined", () => {
    deepStrictEqual(Either.getOrUndefined(Either.right(1)), 1)
    deepStrictEqual(Either.getOrUndefined(Either.left("a")), undefined)
  })

  it("getOrThrowWith", () => {
    strictEqual(pipe(Either.right(1), Either.getOrThrowWith((e) => new Error(`Unexpected Left: ${e}`))), 1)
    throws(() => pipe(Either.left("e"), Either.getOrThrowWith((e) => new Error(`Unexpected Left: ${e}`)))),
      new Error("Unexpected Left: e")
  })

  it("getOrThrow", () => {
    strictEqual(pipe(Either.right(1), Either.getOrThrow), 1)
    throws(() => pipe(Either.left("e"), Either.getOrThrow), new Error("getOrThrow called on a Left"))
  })

  it("flatMap", () => {
    const f = Either.flatMap(flow(Str.length, Either.right))
    deepStrictEqual(pipe(Either.right("abc"), f), Either.right(3))
    deepStrictEqual(pipe(Either.left("maError"), f), Either.left("maError"))
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
    deepStrictEqual(Either.all([]), Either.right([]))
    deepStrictEqual(Either.all([Either.right(1)]), Either.right([1]))
    deepStrictEqual(Either.all([Either.right(1), Either.right(true)]), Either.right([1, true]))
    deepStrictEqual(Either.all([Either.right(1), Either.left("e")]), Either.left("e"))
    // structs and records
    deepStrictEqual(Either.all({}), Either.right({}))
    deepStrictEqual(Either.all({ a: Either.right(1) }), Either.right({ a: 1 }))
    deepStrictEqual(Either.all({ a: Either.right(1), b: Either.right(true) }), Either.right({ a: 1, b: true }))
    deepStrictEqual(Either.all({ a: Either.right(1), b: Either.left("e") }), Either.left("e"))
  })

  it("orElse", () => {
    deepStrictEqual(pipe(Either.right(1), Either.orElse(() => Either.right(2))), Either.right(1))
    deepStrictEqual(pipe(Either.right(1), Either.orElse(() => Either.left("b"))), Either.right(1))
    deepStrictEqual(pipe(Either.left("a"), Either.orElse(() => Either.right(2))), Either.right(2))
    deepStrictEqual(pipe(Either.left("a"), Either.orElse(() => Either.left("b"))), Either.left("b"))
  })

  describe("do notation", () => {
    it("Do", () => {
      assertRight(Either.Do, {})
    })

    it("bindTo", () => {
      assertRight(pipe(Either.right(1), Either.bindTo("a")), { a: 1 })
      assertLeft(pipe(Either.left("left"), Either.bindTo("a")), "left")
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
    })

    it("let", () => {
      assertRight(pipe(Either.right(1), Either.bindTo("a"), Either.let("b", ({ a }) => a + 1)), { a: 1, b: 2 })
      assertLeft(
        pipe(Either.left("left"), Either.bindTo("a"), Either.let("b", () => 2)),
        "left"
      )
    })
  })
})
