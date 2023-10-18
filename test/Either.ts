import * as Util from "effect-test/util"
import * as Chunk from "effect/Chunk"
import * as Either from "effect/Either"
import { flow, pipe } from "effect/Function"
import * as N from "effect/Number"
import * as O from "effect/Option"
import * as S from "effect/String"
import { inspect } from "node:util"

describe.concurrent("Either", () => {
  it("gen", () => {
    const a = Either.gen(function*($) {
      const x = yield* $(Either.right(1))
      const y = yield* $(Either.right(2))
      return x + y
    })
    // eslint-disable-next-line require-yield
    const b = Either.gen(function*() {
      return 10
    })
    const c = Either.gen(function*($) {
      yield* $(Either.right(1))
      yield* $(Either.right(2))
    })
    const d = Either.gen(function*($) {
      yield* $(Either.right(1))
      return yield* $(Either.right(2))
    })
    const e = Either.gen(function*($) {
      yield* $(Either.right(1))
      yield* $(Either.left("err"))
      return yield* $(Either.right(2))
    })
    expect(a).toEqual(Either.right(3))
    expect(b).toEqual(Either.right(10))
    expect(c).toEqual(Either.right(undefined))
    expect(d).toEqual(Either.right(2))
    expect(e).toEqual(Either.left("err"))
  })

  it("exports", () => {
    expect(Either.TypeId).exist
  })

  it("toString", () => {
    expect(String(Either.right(1))).toEqual(`{
  "_id": "Either",
  "_tag": "Right",
  "right": 1
}`)
    expect(String(Either.left("e"))).toEqual(`{
  "_id": "Either",
  "_tag": "Left",
  "left": "e"
}`)
    expect(String(Either.right(Chunk.make(1, 2, 3)))).toEqual(`{
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
}`)
    expect(String(Either.left(Chunk.make(1, 2, 3)))).toEqual(`{
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
}`)
  })

  it("toJSON", () => {
    expect(Either.right(1).toJSON()).toEqual(
      { _id: "Either", _tag: "Right", right: 1 }
    )
    expect(Either.left("e").toJSON()).toEqual(
      { _id: "Either", _tag: "Left", left: "e" }
    )
  })

  it("inspect", () => {
    expect(inspect(Either.right(1))).toEqual(inspect({ _id: "Either", _tag: "Right", right: 1 }))
    expect(inspect(Either.left("e"))).toEqual(inspect({ _id: "Either", _tag: "Left", left: "e" }))
  })

  it("isEither", () => {
    Util.deepStrictEqual(pipe(Either.right(1), Either.isEither), true)
    Util.deepStrictEqual(pipe(Either.left("e"), Either.isEither), true)
    Util.deepStrictEqual(pipe(O.some(1), Either.isEither), false)
  })

  it("getRight", () => {
    Util.deepStrictEqual(pipe(Either.right(1), Either.getRight), O.some(1))
    Util.deepStrictEqual(pipe(Either.left("a"), Either.getRight), O.none())
  })

  it("getLeft", () => {
    Util.deepStrictEqual(pipe(Either.right(1), Either.getLeft), O.none())
    Util.deepStrictEqual(pipe(Either.left("e"), Either.getLeft), O.some("e"))
  })

  it("map", () => {
    const f = Either.map(S.length)
    Util.deepStrictEqual(pipe(Either.right("abc"), f), Either.right(3))
    Util.deepStrictEqual(pipe(Either.left("s"), f), Either.left("s"))
  })

  it("mapBoth", () => {
    const f = Either.mapBoth({
      onLeft: S.length,
      onRight: (n: number) => n > 2
    })
    Util.deepStrictEqual(pipe(Either.right(1), f), Either.right(false))
    Util.deepStrictEqual(pipe(Either.left("a"), f), Either.left(1))
  })

  it("mapLeft", () => {
    const f = Either.mapLeft(Util.double)
    Util.deepStrictEqual(pipe(Either.right("a"), f), Either.right("a"))
    Util.deepStrictEqual(pipe(Either.left(1), f), Either.left(2))
  })

  it("match", () => {
    const onLeft = (s: string) => `left${s.length}`
    const onRight = (s: string) => `right${s.length}`
    const match = Either.match({ onLeft, onRight })
    Util.deepStrictEqual(match(Either.left("abc")), "left3")
    Util.deepStrictEqual(match(Either.right("abc")), "right3")
  })

  it("isLeft", () => {
    Util.deepStrictEqual(Either.isLeft(Either.right(1)), false)
    Util.deepStrictEqual(Either.isLeft(Either.left(1)), true)
  })

  it("isRight", () => {
    Util.deepStrictEqual(Either.isRight(Either.right(1)), true)
    Util.deepStrictEqual(Either.isRight(Either.left(1)), false)
  })

  it("swap", () => {
    Util.deepStrictEqual(Either.reverse(Either.right("a")), Either.left("a"))
    Util.deepStrictEqual(Either.reverse(Either.left("b")), Either.right("b"))
  })

  it("merge", () => {
    Util.deepStrictEqual(Either.merge(Either.right(1)), 1)
    Util.deepStrictEqual(Either.merge(Either.left("a")), "a")
  })

  it("getEquivalence", () => {
    const isEquivalent = Either.getEquivalence(S.Equivalence, N.Equivalence)
    Util.deepStrictEqual(isEquivalent(Either.right(1), Either.right(1)), true)
    Util.deepStrictEqual(isEquivalent(Either.right(1), Either.right(2)), false)
    Util.deepStrictEqual(isEquivalent(Either.right(1), Either.left("foo")), false)
    Util.deepStrictEqual(isEquivalent(Either.left("foo"), Either.left("foo")), true)
    Util.deepStrictEqual(isEquivalent(Either.left("foo"), Either.left("bar")), false)
    Util.deepStrictEqual(isEquivalent(Either.left("foo"), Either.right(1)), false)
  })

  it("pipe", () => {
    expect(Either.right(1).pipe(Either.map((n) => n + 1))).toEqual(Either.right(2))
  })

  it("fromNullable", () => {
    Util.deepStrictEqual(Either.fromNullable(null, () => "fallback"), Either.left("fallback"))
    Util.deepStrictEqual(Either.fromNullable(undefined, () => "fallback"), Either.left("fallback"))
    Util.deepStrictEqual(Either.fromNullable(1, () => "fallback"), Either.right(1))
  })

  it("fromOption", () => {
    Util.deepStrictEqual(Either.fromOption(O.none(), () => "none"), Either.left("none"))
    Util.deepStrictEqual(Either.fromOption(O.some(1), () => "none"), Either.right(1))
  })

  it("try", () => {
    Util.deepStrictEqual(Either.try(() => 1), Either.right(1))
    Util.deepStrictEqual(
      Either.try(() => {
        throw "b"
      }),
      Either.left("b")
    )
    Util.deepStrictEqual(Either.try({ try: () => 1, catch: (e) => new Error(String(e)) }), Either.right(1))
    Util.deepStrictEqual(
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
    Util.deepStrictEqual(Either.getOrElse(Either.right(1), (error) => error + "!"), 1)
    Util.deepStrictEqual(Either.getOrElse(Either.left("not a number"), (error) => error + "!"), "not a number!")
  })

  it("getOrNull", () => {
    Util.deepStrictEqual(Either.getOrNull(Either.right(1)), 1)
    Util.deepStrictEqual(Either.getOrNull(Either.left("a")), null)
  })

  it("getOrUndefined", () => {
    Util.deepStrictEqual(Either.getOrUndefined(Either.right(1)), 1)
    Util.deepStrictEqual(Either.getOrUndefined(Either.left("a")), undefined)
  })

  it("getOrThrowWith", () => {
    expect(pipe(Either.right(1), Either.getOrThrowWith((e) => new Error(`Unexpected Left: ${e}`)))).toEqual(1)
    expect(() => pipe(Either.left("e"), Either.getOrThrowWith((e) => new Error(`Unexpected Left: ${e}`))))
      .toThrowError(
        new Error("Unexpected Left: e")
      )
  })

  it("getOrThrow", () => {
    expect(pipe(Either.right(1), Either.getOrThrow)).toEqual(1)
    expect(() => pipe(Either.left("e"), Either.getOrThrow)).toThrowError(
      new Error("getOrThrow called on a Left")
    )
  })

  it("flatMap", () => {
    const f = Either.flatMap<string, string, number>(flow(S.length, Either.right))
    Util.deepStrictEqual(pipe(Either.right("abc"), f), Either.right(3))
    Util.deepStrictEqual(pipe(Either.left("maError"), f), Either.left("maError"))
  })

  it("ap", () => {
    const add = (a: number) => (b: number) => a + b
    expect(Either.right(add).pipe(Either.ap(Either.right(1)), Either.ap(Either.right(2)))).toStrictEqual(
      Either.right(3)
    )
    expect(Either.right(add).pipe(Either.ap(Either.left("b")), Either.ap(Either.right(2)))).toStrictEqual(
      Either.left("b")
    )
    expect(Either.right(add).pipe(Either.ap(Either.right(1)), Either.ap(Either.left("c")))).toStrictEqual(
      Either.left("c")
    )
    expect(Either.right(add).pipe(Either.ap(Either.left("b")), Either.ap(Either.left("c")))).toStrictEqual(
      Either.left("b")
    )
    expect(
      (Either.left("a") as Either.Either<string, typeof add>).pipe(
        Either.ap(Either.right(1)),
        Either.ap(Either.right(2))
      )
    ).toStrictEqual(Either.left("a"))
  })

  it("zipWith", () => {
    expect(pipe(Either.left(0), Either.zipWith(Either.right(2), (a, b) => a + b))).toEqual(Either.left(0))
    expect(pipe(Either.right(1), Either.zipWith(Either.left(0), (a, b) => a + b))).toEqual(Either.left(0))
    expect(pipe(Either.right(1), Either.zipWith(Either.right(2), (a, b) => a + b))).toEqual(Either.right(3))
  })

  it("all", () => {
    // tuples and arrays
    Util.deepStrictEqual(Either.all([]), Either.right([]))
    Util.deepStrictEqual(Either.all([Either.right(1)]), Either.right([1]))
    Util.deepStrictEqual(Either.all([Either.right(1), Either.right(true)]), Either.right([1, true]))
    Util.deepStrictEqual(Either.all([Either.right(1), Either.left("e")]), Either.left("e"))
    // structs and records
    Util.deepStrictEqual(Either.all({}), Either.right({}))
    Util.deepStrictEqual(Either.all({ a: Either.right(1) }), Either.right({ a: 1 }))
    Util.deepStrictEqual(Either.all({ a: Either.right(1), b: Either.right(true) }), Either.right({ a: 1, b: true }))
    Util.deepStrictEqual(Either.all({ a: Either.right(1), b: Either.left("e") }), Either.left("e"))
  })

  it("orElse", () => {
    Util.deepStrictEqual(pipe(Either.right(1), Either.orElse(() => Either.right(2))), Either.right(1))
    Util.deepStrictEqual(pipe(Either.right(1), Either.orElse(() => Either.left("b"))), Either.right(1))
    Util.deepStrictEqual(pipe(Either.left("a"), Either.orElse(() => Either.right(2))), Either.right(2))
    Util.deepStrictEqual(pipe(Either.left("a"), Either.orElse(() => Either.left("b"))), Either.left("b"))
  })
})
