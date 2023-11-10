import * as Util from "effect-test/util"
import * as Chunk from "effect/Chunk"
import * as E from "effect/Either"
import { pipe } from "effect/Function"
import * as N from "effect/Number"
import * as _ from "effect/Option"
import * as S from "effect/String"
import { inspect } from "node:util"
import { assert, assertType, describe, expect, it } from "vitest"

const p = (n: number): boolean => n > 2

describe.concurrent("Option", () => {
  it("gen", () => {
    const a = _.gen(function*($) {
      const x = yield* $(_.some(1))
      const y = yield* $(_.some(2))
      return x + y
    })
    // eslint-disable-next-line require-yield
    const b = _.gen(function*() {
      return 10
    })
    const c = _.gen(function*($) {
      yield* $(_.some(1))
      yield* $(_.some(2))
    })
    const d = _.gen(function*($) {
      yield* $(_.some(1))
      return yield* $(_.some(2))
    })
    const e = _.gen(function*($) {
      yield* $(_.some(1))
      yield* $(_.none())
      return yield* $(_.some(2))
    })
    const f = _.gen(function*($) {
      yield* $(_.none())
    })
    expect(a).toEqual(_.some(3))
    expect(b).toEqual(_.some(10))
    expect(c).toEqual(_.some(undefined))
    expect(d).toEqual(_.some(2))
    expect(e).toEqual(_.none())
    expect(f).toEqual(_.none())
  })

  it("toString", () => {
    expect(String(_.none())).toEqual(`{
  "_id": "Option",
  "_tag": "None"
}`)
    expect(String(_.some(1))).toEqual(`{
  "_id": "Option",
  "_tag": "Some",
  "value": 1
}`)
    expect(String(_.some(Chunk.make(1, 2, 3)))).toEqual(`{
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
    expect(_.none().toJSON()).toEqual(
      { _id: "Option", _tag: "None" }
    )
    expect(_.some(1).toJSON()).toEqual(
      { _id: "Option", _tag: "Some", value: 1 }
    )
  })

  it("inspect", () => {
    if (typeof window !== "undefined") {
      return
    }
    expect(inspect(_.none())).toEqual(inspect({ _id: "Option", _tag: "None" }))
    expect(inspect(_.some(1))).toEqual(inspect({ _id: "Option", _tag: "Some", value: 1 }))
  })

  it("getRight", () => {
    expect(_.getRight(E.right(1))).toEqual(_.some(1))
    expect(_.getRight(E.left("a"))).toEqual(_.none())
  })

  it("getLeft", () => {
    expect(_.getLeft(E.right(1))).toEqual(_.none())
    expect(_.getLeft(E.left("a"))).toEqual(_.some("a"))
  })

  it("toRefinement", () => {
    const f = (
      s: string | number
    ): _.Option<string> => (typeof s === "string" ? _.some(s) : _.none())
    const isString = _.toRefinement(f)
    Util.deepStrictEqual(isString("s"), true)
    Util.deepStrictEqual(isString(1), false)
    type A = { readonly type: "A" }
    type B = { readonly type: "B" }
    type C = A | B
    const isA = _.toRefinement<C, A>((c) => (c.type === "A" ? _.some(c) : _.none()))
    Util.deepStrictEqual(isA({ type: "A" }), true)
    Util.deepStrictEqual(isA({ type: "B" }), false)
  })

  it("isOption", () => {
    Util.deepStrictEqual(pipe(_.some(1), _.isOption), true)
    Util.deepStrictEqual(pipe(_.none(), _.isOption), true)
    Util.deepStrictEqual(pipe(E.right(1), _.isOption), false)
  })

  it("firstSomeOf", () => {
    Util.deepStrictEqual(_.firstSomeOf([]), _.none())
    Util.deepStrictEqual(_.firstSomeOf([_.some(1)]), _.some(1))
    Util.deepStrictEqual(_.firstSomeOf([_.none()]), _.none())
    Util.deepStrictEqual(
      _.firstSomeOf([_.none(), _.none(), _.none(), _.none(), _.some(1)]),
      _.some(1)
    )
    Util.deepStrictEqual(
      _.firstSomeOf([_.none(), _.none(), _.none(), _.none()]),
      _.none()
    )
  })

  it("orElseEither", () => {
    expect(pipe(_.some(1), _.orElseEither(() => _.some(2)))).toEqual(_.some(E.left(1)))
    expect(pipe(_.some(1), _.orElseEither(() => _.none()))).toEqual(_.some(E.left(1)))
    expect(pipe(_.none(), _.orElseEither(() => _.some(2)))).toEqual(_.some(E.right(2)))
    expect(pipe(_.none(), _.orElseEither(() => _.none()))).toEqual(_.none())
  })

  it("getOrThrow", () => {
    expect(pipe(_.some(1), _.getOrThrow)).toEqual(1)
    expect(() => pipe(_.none(), _.getOrThrow)).toThrowError(
      new Error("getOrThrow called on a None")
    )
  })

  it("getOrThrowWith", () => {
    expect(pipe(_.some(1), _.getOrThrowWith(() => new Error("Unexpected None")))).toEqual(1)
    expect(() => pipe(_.none(), _.getOrThrowWith(() => new Error("Unexpected None")))).toThrowError(
      new Error("Unexpected None")
    )
  })

  it("unit", () => {
    Util.deepStrictEqual(_.unit, _.some(undefined))
  })

  it("product", () => {
    const product = _.product
    Util.deepStrictEqual(product(_.none(), _.none()), _.none())
    Util.deepStrictEqual(product(_.some(1), _.none()), _.none())
    Util.deepStrictEqual(product(_.none(), _.some("a")), _.none())
    Util.deepStrictEqual(
      product(_.some(1), _.some("a")),
      _.some([1, "a"])
    )
  })

  it("productMany", () => {
    const productMany = _.productMany
    Util.deepStrictEqual(productMany(_.none(), []), _.none())
    Util.deepStrictEqual(productMany(_.some(1), []), _.some([1]))
    Util.deepStrictEqual(productMany(_.some(1), [_.none()]), _.none())
    Util.deepStrictEqual(productMany(_.some(1), [_.some(2)]), _.some([1, 2]))
  })

  it("fromIterable", () => {
    Util.deepStrictEqual(_.fromIterable([]), _.none())
    Util.deepStrictEqual(_.fromIterable(["a"]), _.some("a"))
  })

  it("map", () => {
    Util.deepStrictEqual(pipe(_.some(2), _.map(Util.double)), _.some(4))
    Util.deepStrictEqual(pipe(_.none(), _.map(Util.double)), _.none())
  })

  it("flatMap", () => {
    const f = (n: number) => _.some(n * 2)
    const g = () => _.none()
    Util.deepStrictEqual(pipe(_.some(1), _.flatMap(f)), _.some(2))
    Util.deepStrictEqual(pipe(_.none(), _.flatMap(f)), _.none())
    Util.deepStrictEqual(pipe(_.some(1), _.flatMap(g)), _.none())
    Util.deepStrictEqual(pipe(_.none(), _.flatMap(g)), _.none())
  })

  it("orElse", () => {
    const assertAlt = (
      a: _.Option<number>,
      b: _.Option<number>,
      expected: _.Option<number>
    ) => {
      Util.deepStrictEqual(pipe(a, _.orElse(() => b)), expected)
    }
    assertAlt(_.some(1), _.some(2), _.some(1))
    assertAlt(_.some(1), _.none(), _.some(1))
    assertAlt(_.none(), _.some(2), _.some(2))
    assertAlt(_.none(), _.none(), _.none())
  })

  it("partitionMap", () => {
    const f = (n: number) => (p(n) ? E.right(n + 1) : E.left(n - 1))
    assert.deepStrictEqual(pipe(_.none(), _.partitionMap(f)), [_.none(), _.none()])
    assert.deepStrictEqual(pipe(_.some(1), _.partitionMap(f)), [_.some(0), _.none()])
    assert.deepStrictEqual(pipe(_.some(3), _.partitionMap(f)), [_.none(), _.some(4)])
  })

  it("filterMap", () => {
    const f = (n: number) => (p(n) ? _.some(n + 1) : _.none())
    Util.deepStrictEqual(pipe(_.none(), _.filterMap(f)), _.none())
    Util.deepStrictEqual(pipe(_.some(1), _.filterMap(f)), _.none())
    Util.deepStrictEqual(pipe(_.some(3), _.filterMap(f)), _.some(4))
  })

  it("match", () => {
    const onNone = () => "none"
    const onSome = (s: string) => `some${s.length}`
    const match = _.match({ onNone, onSome })
    Util.deepStrictEqual(match(_.none()), "none")
    Util.deepStrictEqual(match(_.some("abc")), "some3")
  })

  it("getOrElse", () => {
    Util.deepStrictEqual(pipe(_.some(1), _.getOrElse(() => 0)), 1)
    Util.deepStrictEqual(pipe(_.none(), _.getOrElse(() => 0)), 0)
  })

  it("getOrNull", () => {
    Util.deepStrictEqual(_.getOrNull(_.none()), null)
    Util.deepStrictEqual(_.getOrNull(_.some(1)), 1)
  })

  it("getOrUndefined", () => {
    Util.deepStrictEqual(_.getOrUndefined(_.none()), undefined)
    Util.deepStrictEqual(_.getOrUndefined(_.some(1)), 1)
  })

  it("getOrder", () => {
    const OS = _.getOrder(S.Order)
    Util.deepStrictEqual(OS(_.none(), _.none()), 0)
    Util.deepStrictEqual(OS(_.some("a"), _.none()), 1)
    Util.deepStrictEqual(OS(_.none(), _.some("a")), -1)
    Util.deepStrictEqual(OS(_.some("a"), _.some("a")), 0)
    Util.deepStrictEqual(OS(_.some("a"), _.some("b")), -1)
    Util.deepStrictEqual(OS(_.some("b"), _.some("a")), 1)
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
        _.fromNullable(x1.a),
        _.flatMapNullable((x) => x.b),
        _.flatMapNullable((x) => x.c),
        _.flatMapNullable((x) => x.d)
      ),
      _.none()
    )
    Util.deepStrictEqual(
      pipe(
        _.fromNullable(x2.a),
        _.flatMapNullable((x) => x.b),
        _.flatMapNullable((x) => x.c),
        _.flatMapNullable((x) => x.d)
      ),
      _.none()
    )
    Util.deepStrictEqual(
      pipe(
        _.fromNullable(x3.a),
        _.flatMapNullable((x) => x.b),
        _.flatMapNullable((x) => x.c),
        _.flatMapNullable((x) => x.d)
      ),
      _.some(1)
    )
  })

  it("fromNullable", () => {
    Util.deepStrictEqual(_.fromNullable(2), _.some(2))
    Util.deepStrictEqual(_.fromNullable(null), _.none())
    Util.deepStrictEqual(_.fromNullable(undefined), _.none())
  })

  it("liftPredicate", () => {
    const f = _.liftPredicate(p)
    Util.deepStrictEqual(f(1), _.none())
    Util.deepStrictEqual(f(3), _.some(3))

    type Direction = "asc" | "desc"
    const parseDirection = _.liftPredicate((s: string): s is Direction => s === "asc" || s === "desc")
    Util.deepStrictEqual(parseDirection("asc"), _.some("asc"))
    Util.deepStrictEqual(parseDirection("foo"), _.none())
  })

  it("containsWith", () => {
    const containsWith = _.containsWith<number>((self, that) => self % 2 === that % 2)
    Util.deepStrictEqual(pipe(_.some(2), containsWith(2)), true)
    Util.deepStrictEqual(pipe(_.some(4), containsWith(4)), true)
    Util.deepStrictEqual(pipe(_.some(1), containsWith(3)), true)

    Util.deepStrictEqual(pipe(_.none(), containsWith(2)), false)
    Util.deepStrictEqual(pipe(_.some(2), containsWith(1)), false)
  })

  it("contains", () => {
    Util.deepStrictEqual(pipe(_.none(), _.contains(2)), false)
    Util.deepStrictEqual(pipe(_.some(2), _.contains(2)), true)
    Util.deepStrictEqual(pipe(_.some(2), _.contains(1)), false)
  })

  it("isNone", () => {
    Util.deepStrictEqual(_.isNone(_.none()), true)
    Util.deepStrictEqual(_.isNone(_.some(1)), false)
  })

  it("isSome", () => {
    Util.deepStrictEqual(_.isSome(_.none()), false)
    Util.deepStrictEqual(_.isSome(_.some(1)), true)
  })

  it("exists", () => {
    const predicate = (a: number) => a === 2
    Util.deepStrictEqual(pipe(_.none(), _.exists(predicate)), false)
    Util.deepStrictEqual(pipe(_.some(1), _.exists(predicate)), false)
    Util.deepStrictEqual(pipe(_.some(2), _.exists(predicate)), true)
  })

  it("do notation", () => {
    Util.deepStrictEqual(
      pipe(
        _.some(1),
        _.bindTo("a"),
        _.bind("b", () => _.some("b")),
        _.let("c", () => true)
      ),
      _.some({ a: 1, b: "b", c: true })
    )
  })

  it("liftNullable", () => {
    const f = _.liftNullable((n: number) => (n > 0 ? n : null))
    Util.deepStrictEqual(f(1), _.some(1))
    Util.deepStrictEqual(f(-1), _.none())
  })

  it("liftThrowable", () => {
    const parse = _.liftThrowable(JSON.parse)
    Util.deepStrictEqual(parse("1"), _.some(1))
    Util.deepStrictEqual(parse(""), _.none())
  })

  it("tap", () => {
    Util.deepStrictEqual(_.tap(_.none(), () => _.none()), _.none())
    Util.deepStrictEqual(_.tap(_.some(1), () => _.none()), _.none())
    Util.deepStrictEqual(_.tap(_.none(), (n) => _.some(n * 2)), _.none())
    Util.deepStrictEqual(_.tap(_.some(1), (n) => _.some(n * 2)), _.some(1))
  })

  it("guard", () => {
    Util.deepStrictEqual(
      pipe(
        _.Do,
        _.bind("x", () => _.some("a")),
        _.bind("y", () => _.some("a")),
        _.filter(({ x, y }) => x === y)
      ),
      _.some({ x: "a", y: "a" })
    )
    Util.deepStrictEqual(
      pipe(
        _.Do,
        _.bind("x", () => _.some("a")),
        _.bind("y", () => _.some("b")),
        _.filter(({ x, y }) => x === y)
      ),
      _.none()
    )
  })

  it("zipWith", () => {
    expect(pipe(_.none(), _.zipWith(_.some(2), (a, b) => a + b))).toEqual(_.none())
    expect(pipe(_.some(1), _.zipWith(_.none(), (a, b) => a + b))).toEqual(_.none())
    expect(pipe(_.some(1), _.zipWith(_.some(2), (a, b) => a + b))).toEqual(_.some(3))
  })

  it("ap", () => {
    expect(pipe(_.some((a: number) => (b: number) => a + b), _.ap(_.none()), _.ap(_.some(2)))).toEqual(_.none())
    expect(pipe(_.some((a: number) => (b: number) => a + b), _.ap(_.some(1)), _.ap(_.none()))).toEqual(_.none())
    expect(pipe(_.some((a: number) => (b: number) => a + b), _.ap(_.some(1)), _.ap(_.some(2)))).toEqual(_.some(3))
  })

  it("reduceCompact", () => {
    const sumCompact = _.reduceCompact(0, N.sum)
    expect(sumCompact([])).toEqual(0)
    expect(sumCompact([_.some(2), _.some(3)])).toEqual(5)
    expect(sumCompact([_.some(2), _.none(), _.some(3)])).toEqual(5)
  })

  it("getEquivalence", () => {
    const isEquivalent = _.getEquivalence(N.Equivalence)
    expect(isEquivalent(_.none(), _.none())).toEqual(true)
    expect(isEquivalent(_.none(), _.some(1))).toEqual(false)
    expect(isEquivalent(_.some(1), _.none())).toEqual(false)
    expect(isEquivalent(_.some(2), _.some(1))).toEqual(false)
    expect(isEquivalent(_.some(1), _.some(2))).toEqual(false)
    expect(isEquivalent(_.some(2), _.some(2))).toEqual(true)
  })

  it("all/ tuple", () => {
    assertType<_.Option<[number, string]>>(_.all([_.some(1), _.some("hello")]))
    assert.deepStrictEqual(_.all([]), _.some([]))
    assert.deepStrictEqual(_.all([_.some(1), _.some("hello")]), _.some([1, "hello"]))
    assert.deepStrictEqual(_.all([_.some(1), _.none()]), _.none())
  })

  it("all/ iterable", () => {
    assertType<_.Option<Array<number>>>(_.all([_.some(1), _.some(2)]))
    assertType<_.Option<Array<number>>>(_.all(new Set([_.some(1), _.some(2)])))

    Util.deepStrictEqual(_.all([]), _.some([]))
    Util.deepStrictEqual(_.all([_.none()]), _.none())
    Util.deepStrictEqual(_.all([_.some(1), _.some(2)]), _.some([1, 2]))
    Util.deepStrictEqual(_.all(new Set([_.some(1), _.some(2)])), _.some([1, 2]))
    Util.deepStrictEqual(_.all([_.some(1), _.none()]), _.none())
  })

  it("all/ struct", () => {
    assertType<_.Option<{ a: number; b: string }>>(_.all({ a: _.some(1), b: _.some("hello") }))
    assert.deepStrictEqual(_.all({ a: _.some(1), b: _.some("hello") }), _.some({ a: 1, b: "hello" }))
    assert.deepStrictEqual(_.all({ a: _.some(1), b: _.none() }), _.none())
  })

  it(".pipe()", () => {
    expect(_.some(1).pipe(_.map((n) => n + 1))).toEqual(_.some(2))
  })

  it("lift2", () => {
    const f = _.lift2((a: number, b: number): number => a + b)
    expect(f(_.none(), _.none())).toStrictEqual(_.none())
    expect(f(_.some(1), _.none())).toStrictEqual(_.none())
    expect(f(_.none(), _.some(2))).toStrictEqual(_.none())
    expect(f(_.some(1), _.some(2))).toStrictEqual(_.some(3))
  })
})
