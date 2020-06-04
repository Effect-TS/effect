import * as assert from "assert"

import { array } from "../../src/Array"
import { left, right } from "../../src/Either"
import { eqNumber } from "../../src/Eq"
import { identity } from "../../src/Function"
import { pipe } from "../../src/Function"
import * as I from "../../src/Identity"
import { monoidString, monoidSum } from "../../src/Monoid"
import * as O from "../../src/Option"
import { ordString } from "../../src/Ord"
import { semigroupString, semigroupSum } from "../../src/Semigroup"
import { showString } from "../../src/Show"

const p = (n: number): boolean => n > 2

describe("Option", () => {
  it("zero", () => {
    assert.deepStrictEqual(O.option.zero(), O.none)
  })

  it("fold", () => {
    const f = () => "none"
    const g = (s: string) => `some${s.length}`
    const fold = O.fold(f, g)
    assert.deepStrictEqual(fold(O.none), "none")
    assert.deepStrictEqual(fold(O.some("abc")), "some3")
  })

  it("toNullable", () => {
    assert.deepStrictEqual(O.toNullable(O.none), null)
    assert.deepStrictEqual(O.toNullable(O.some(1)), 1)
  })

  it("toUndefined", () => {
    assert.deepStrictEqual(O.toUndefined(O.none), undefined)
    assert.deepStrictEqual(O.toUndefined(O.some(1)), 1)
  })

  it("getOrElse", () => {
    assert.deepStrictEqual(
      pipe(
        O.some(1),
        O.getOrElse(() => 0)
      ),
      1
    )
    assert.deepStrictEqual(
      pipe(
        O.none,
        O.getOrElse(() => 0)
      ),
      0
    )
  })

  it("equals", () => {
    const { equals } = O.getEq(eqNumber)
    assert.deepStrictEqual(equals(O.none, O.none), true)
    assert.deepStrictEqual(equals(O.none, O.some(1)), false)
    assert.deepStrictEqual(equals(O.some(1), O.none), false)
    assert.deepStrictEqual(equals(O.some(2), O.some(1)), false)
    assert.deepStrictEqual(equals(O.some(1), O.some(2)), false)
    assert.deepStrictEqual(equals(O.some(2), O.some(2)), true)
  })

  it("map", () => {
    const f = (n: number) => n * 2
    assert.deepStrictEqual(O.option.map(f)(O.some(2)), O.some(4))
    assert.deepStrictEqual(O.option.map(f)(O.none), O.none)
  })

  it("getEq", () => {
    const S = O.getEq(ordString)
    assert.deepStrictEqual(S.equals(O.none, O.none), true)
    assert.deepStrictEqual(S.equals(O.some("a"), O.none), false)
    assert.deepStrictEqual(S.equals(O.none, O.some("a")), false)
    assert.deepStrictEqual(S.equals(O.some("a"), O.some("a")), true)
    assert.deepStrictEqual(S.equals(O.some("a"), O.some("b")), false)
  })

  it("getOrd", () => {
    const OS = O.getOrd(ordString)
    assert.deepStrictEqual(OS.compare(O.none, O.none), 0)
    assert.deepStrictEqual(OS.compare(O.some("a"), O.none), 1)
    assert.deepStrictEqual(OS.compare(O.none, O.some("a")), -1)
    assert.deepStrictEqual(OS.compare(O.some("a"), O.some("a")), 0)
    assert.deepStrictEqual(OS.compare(O.some("a"), O.some("b")), -1)
    assert.deepStrictEqual(OS.compare(O.some("b"), O.some("a")), 1)
  })

  it("mapNullable", () => {
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
    assert.deepStrictEqual(
      pipe(
        O.fromNullable(x1.a),
        O.mapNullable((x) => x.b),
        O.mapNullable((x) => x.c),
        O.mapNullable((x) => x.d)
      ),
      O.none
    )
    assert.deepStrictEqual(
      pipe(
        O.fromNullable(x2.a),
        O.mapNullable((x) => x.b),
        O.mapNullable((x) => x.c),
        O.mapNullable((x) => x.d)
      ),
      O.none
    )
    assert.deepStrictEqual(
      pipe(
        O.fromNullable(x3.a),
        O.mapNullable((x) => x.b),
        O.mapNullable((x) => x.c),
        O.mapNullable((x) => x.d)
      ),
      O.some(1)
    )
  })

  it("ap", () => {
    const f = (n: number) => n * 2
    assert.deepStrictEqual(O.option.ap(O.some(2))(O.some(f)), O.some(4))
    assert.deepStrictEqual(O.option.ap(O.none)(O.some(f)), O.none)
    assert.deepStrictEqual(O.option.ap(O.some(2))(O.none), O.none)
    assert.deepStrictEqual(O.option.ap(O.none)(O.none), O.none)
  })

  it("chain", () => {
    const f = (n: number) => O.some(n * 2)
    const g = () => O.none
    assert.deepStrictEqual(O.option.chain(f)(O.some(1)), O.some(2))
    assert.deepStrictEqual(O.option.chain(f)(O.none), O.none)
    assert.deepStrictEqual(O.option.chain(g)(O.some(1)), O.none)
    assert.deepStrictEqual(O.option.chain(g)(O.none), O.none)
  })

  it("getMonoid", () => {
    const { concat } = O.getMonoid(semigroupString)
    assert.deepStrictEqual(concat(O.none, O.none), O.none)
    assert.deepStrictEqual(concat(O.none, O.some("a")), O.some("a"))
    assert.deepStrictEqual(concat(O.some("a"), O.none), O.some("a"))
    assert.deepStrictEqual(concat(O.some("b"), O.some("a")), O.some("ba"))
    assert.deepStrictEqual(concat(O.some("a"), O.some("b")), O.some("ab"))
  })

  it("alt", () => {
    assert.deepStrictEqual(O.option.alt(() => O.some(2))(O.some(1)), O.some(1))
    assert.deepStrictEqual(
      pipe(
        O.some(2),
        O.option.alt((): O.Option<number> => O.none)
      ),
      O.some(2)
    )
    assert.deepStrictEqual(O.option.alt(() => O.some(1))(O.none), O.some(1))
    assert.deepStrictEqual(O.option.alt(() => O.none)(O.none), O.none)
  })

  it("extend", () => {
    const f = O.getOrElse(() => 0)
    assert.deepStrictEqual(O.option.extend(f)(O.some(2)), O.some(2))
    assert.deepStrictEqual(O.option.extend(f)(O.none), O.none)
  })

  it("fromNullable", () => {
    assert.deepStrictEqual(O.fromNullable(2), O.some(2))
    assert.deepStrictEqual(O.fromNullable(null), O.none)
    assert.deepStrictEqual(O.fromNullable(undefined), O.none)
  })

  it("fromPredicate", () => {
    const f = O.fromPredicate(p)
    assert.deepStrictEqual(f(1), O.none)
    assert.deepStrictEqual(f(3), O.some(3))

    type Direction = "asc" | "desc"
    const parseDirection = O.fromPredicate(
      (s: string): s is Direction => s === "asc" || s === "desc"
    )
    assert.deepStrictEqual(parseDirection("asc"), O.some("asc"))
    assert.deepStrictEqual(parseDirection("foo"), O.none)
  })

  it("traverse", () => {
    assert.deepStrictEqual(O.option.traverse(array)(() => [])(O.some("hello")), [])
    assert.deepStrictEqual(
      pipe(
        O.some("hello"),
        O.option.traverse(array)((s) => [s.length])
      ),
      [O.some(5)]
    )
    assert.deepStrictEqual(
      pipe(
        O.none,
        O.option.traverse(array)((s) => [s])
      ),
      [O.none]
    )
  })

  it("sequence", () => {
    assert.deepStrictEqual(O.option.sequence(array)(O.some([1, 2])), [
      O.some(1),
      O.some(2)
    ])
    assert.deepStrictEqual(O.option.sequence(array)(O.none), [O.none])
  })

  it("reduce", () => {
    assert.deepStrictEqual(
      pipe(
        O.none,
        O.option.reduce(2, (b, a) => b + a)
      ),
      2
    )
    assert.deepStrictEqual(
      pipe(
        O.some(3),
        O.option.reduce(2, (b, a) => b + a)
      ),
      5
    )
  })

  it("foldMap", () => {
    const foldMap = O.option.foldMap(monoidString)
    const x1 = O.some("a")
    const f1 = identity
    assert.deepStrictEqual(pipe(x1, foldMap(f1)), "a")
    const x2: O.Option<string> = O.none
    assert.deepStrictEqual(pipe(x2, foldMap(f1)), "")
  })

  it("reduceRight", () => {
    const reduceRight = O.option.reduceRight
    const x1 = O.some("a")
    const init1 = ""
    const f1 = (a: string, acc: string) => acc + a
    assert.deepStrictEqual(pipe(x1, reduceRight(init1, f1)), "a")
    const x2: O.Option<string> = O.none
    assert.deepStrictEqual(pipe(x2, reduceRight(init1, f1)), "")
  })

  it("getApplySemigroup", () => {
    const S = O.getApplySemigroup(semigroupSum)
    assert.deepStrictEqual(S.concat(O.none, O.none), O.none)
    assert.deepStrictEqual(S.concat(O.some(1), O.none), O.none)
    assert.deepStrictEqual(S.concat(O.none, O.some(1)), O.none)
    assert.deepStrictEqual(S.concat(O.some(1), O.some(2)), O.some(3))
  })

  it("getApplyMonoid", () => {
    const M = O.getApplyMonoid(monoidSum)
    assert.deepStrictEqual(M.concat(M.empty, O.none), O.none)
    assert.deepStrictEqual(M.concat(O.none, M.empty), O.none)
    assert.deepStrictEqual(M.concat(M.empty, O.some(1)), O.some(1))
    assert.deepStrictEqual(M.concat(O.some(1), M.empty), O.some(1))
  })

  it("getFirstMonoid", () => {
    const M = O.getFirstMonoid<number>()
    assert.deepStrictEqual(M.concat(O.none, O.none), O.none)
    assert.deepStrictEqual(M.concat(O.some(1), O.none), O.some(1))
    assert.deepStrictEqual(M.concat(O.none, O.some(1)), O.some(1))
    assert.deepStrictEqual(M.concat(O.some(1), O.some(2)), O.some(1))
  })

  it("getLastMonoid", () => {
    const M = O.getLastMonoid<number>()
    assert.deepStrictEqual(M.concat(O.none, O.none), O.none)
    assert.deepStrictEqual(M.concat(O.some(1), O.none), O.some(1))
    assert.deepStrictEqual(M.concat(O.none, O.some(1)), O.some(1))
    assert.deepStrictEqual(M.concat(O.some(1), O.some(2)), O.some(2))
  })

  it("elem", () => {
    assert.deepStrictEqual(O.elem(eqNumber)(2, O.none), false)
    assert.deepStrictEqual(O.elem(eqNumber)(2, O.some(2)), true)
    assert.deepStrictEqual(O.elem(eqNumber)(1, O.some(2)), false)
  })

  it("isNone", () => {
    assert.deepStrictEqual(O.isNone(O.none), true)
    assert.deepStrictEqual(O.isNone(O.some(1)), false)
  })

  it("isSome", () => {
    assert.deepStrictEqual(O.isSome(O.none), false)
    assert.deepStrictEqual(O.isSome(O.some(1)), true)
  })

  it("exists", () => {
    const predicate = (a: number) => a === 2
    assert.deepStrictEqual(pipe(O.none, O.exists(predicate)), false)
    assert.deepStrictEqual(pipe(O.some(1), O.exists(predicate)), false)
    assert.deepStrictEqual(pipe(O.some(2), O.exists(predicate)), true)
  })

  it("tryCatch", () => {
    assert.deepStrictEqual(
      O.tryCatch(() => JSON.parse("2")),
      O.some(2)
    )
    assert.deepStrictEqual(
      O.tryCatch(() => JSON.parse("(")),
      O.none
    )
  })

  it("compact", () => {
    assert.deepStrictEqual(O.option.compact(O.none), O.none)
    assert.deepStrictEqual(O.option.compact(O.some(O.none)), O.none)
    assert.deepStrictEqual(O.option.compact(O.some(O.some("123"))), O.some("123"))
  })

  it("separate", () => {
    assert.deepStrictEqual(O.option.separate(O.none), { left: O.none, right: O.none })
    assert.deepStrictEqual(O.option.separate(O.some(left("123"))), {
      left: O.some("123"),
      right: O.none
    })
    assert.deepStrictEqual(O.option.separate(O.some(right("123"))), {
      left: O.none,
      right: O.some("123")
    })
  })

  it("filter", () => {
    const predicate = (a: number) => a === 2
    assert.deepStrictEqual(O.option.filter(predicate)(O.none), O.none)
    assert.deepStrictEqual(O.option.filter(predicate)(O.some(1)), O.none)
    assert.deepStrictEqual(O.option.filter(predicate)(O.some(2)), O.some(2))
  })

  it("filterMap", () => {
    const f = (n: number) => (p(n) ? O.some(n + 1) : O.none)
    assert.deepStrictEqual(O.option.filterMap(f)(O.none), O.none)
    assert.deepStrictEqual(O.option.filterMap(f)(O.some(1)), O.none)
    assert.deepStrictEqual(O.option.filterMap(f)(O.some(3)), O.some(4))
  })

  it("partition", () => {
    assert.deepStrictEqual(O.option.partition(p)(O.none), {
      left: O.none,
      right: O.none
    })
    assert.deepStrictEqual(O.option.partition(p)(O.some(1)), {
      left: O.some(1),
      right: O.none
    })
    assert.deepStrictEqual(O.option.partition(p)(O.some(3)), {
      left: O.none,
      right: O.some(3)
    })
  })

  it("partitionMap", () => {
    const f = (n: number) => (p(n) ? right(n + 1) : left(n - 1))
    assert.deepStrictEqual(O.option.partitionMap(f)(O.none), {
      left: O.none,
      right: O.none
    })
    assert.deepStrictEqual(O.option.partitionMap(f)(O.some(1)), {
      left: O.some(0),
      right: O.none
    })
    assert.deepStrictEqual(O.option.partitionMap(f)(O.some(3)), {
      left: O.none,
      right: O.some(4)
    })
  })

  it("wither", () => {
    const witherIdentity = O.option.wither(I.identity)
    const f = (n: number) => I.identity.of(p(n) ? O.some(n + 1) : O.none)
    assert.deepStrictEqual(witherIdentity(f)(O.none), I.identity.of(O.none))
    assert.deepStrictEqual(witherIdentity(f)(O.some(1)), I.identity.of(O.none))
    assert.deepStrictEqual(witherIdentity(f)(O.some(3)), I.identity.of(O.some(4)))
  })

  it("wilt", () => {
    const wiltIdentity = O.option.wilt(I.identity)
    const f = (n: number) => I.identity.of(p(n) ? right(n + 1) : left(n - 1))
    assert.deepStrictEqual(
      wiltIdentity(f)(O.none),
      I.identity.of({ left: O.none, right: O.none })
    )
    assert.deepStrictEqual(
      wiltIdentity(f)(O.some(1)),
      I.identity.of({ left: O.some(0), right: O.none })
    )
    assert.deepStrictEqual(
      wiltIdentity(f)(O.some(3)),
      I.identity.of({ left: O.none, right: O.some(4) })
    )
  })

  it("getRefinement", () => {
    const f = (s: string | number): O.Option<string> =>
      typeof s === "string" ? O.some(s) : O.none
    const isString = O.getRefinement(f)
    assert.deepStrictEqual(isString("s"), true)
    assert.deepStrictEqual(isString(1), false)
    type A = { readonly type: "A" }
    type B = { readonly type: "B" }
    type C = A | B
    const isA = O.getRefinement<C, A>((c) => (c.type === "A" ? O.some(c) : O.none))
    assert.deepStrictEqual(isA({ type: "A" }), true)
    assert.deepStrictEqual(isA({ type: "B" }), false)
  })

  it("getShow", () => {
    const S = O.getShow(showString)
    assert.deepStrictEqual(S.show(O.some("a")), `some("a")`)
    assert.deepStrictEqual(S.show(O.none), `none`)
  })

  it("getLeft", () => {
    assert.deepStrictEqual(O.getLeft(right(1)), O.none)
    assert.deepStrictEqual(O.getLeft(left("err")), O.some("err"))
  })

  it("getRight", () => {
    assert.deepStrictEqual(O.getRight(right(1)), O.some(1))
    assert.deepStrictEqual(O.getRight(left("err")), O.none)
  })

  it("fromEither", () => {
    assert.deepStrictEqual(O.fromEither(left("a")), O.none)
    assert.deepStrictEqual(O.fromEither(right(1)), O.some(1))
  })
})
