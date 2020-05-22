/* eslint-disable no-prototype-builtins */
import * as assert from "assert"

import { left, right } from "../../src/Either"
import { eqNumber } from "../../src/Eq"
import { identity } from "../../src/Function"
import * as I from "../../src/Identity"
import { monoidString } from "../../src/Monoid"
import { getOrElse, isSome, none, option, Option, some } from "../../src/Option"
import { pipe } from "../../src/Pipe"
import { readonlyArray, zip_ } from "../../src/Readonly/Array"
import * as R from "../../src/Record"
import { getFirstSemigroup, getLastSemigroup, semigroupSum } from "../../src/Semigroup"
import { showString } from "../../src/Show"

const p = (n: number) => n > 2

const noPrototype = Object.create(null)

describe("Record", () => {
  it("getMonoid", () => {
    const d1 = { k1: 1, k2: 3 }
    const d2 = { k2: 2, k3: 4 }
    const M = R.getMonoid(semigroupSum)
    assert.deepStrictEqual(M.concat(d1, d2), { k1: 1, k2: 5, k3: 4 })
    assert.deepStrictEqual(M.concat(d1, M.empty), d1)
    assert.deepStrictEqual(M.concat(M.empty, d2), d2)
    assert.deepStrictEqual(M.concat(d1, {}), d1)
  })

  it("map", () => {
    const d1 = { k1: 1, k2: 2 }
    const double = (n: number): number => n * 2
    assert.deepStrictEqual(R.map(double)(d1), { k1: 2, k2: 4 })
  })

  it("record.map", () => {
    const double = (n: number): number => n * 2
    assert.deepStrictEqual(R.record.map(double)({ a: 1, b: 2 }), { a: 2, b: 4 })
  })

  it("reduce", () => {
    const d1 = { k1: "a", k2: "b" }
    assert.deepStrictEqual(R.record.reduce("", (b, a) => b + a)(d1), "ab")
    const d2 = { k2: "b", k1: "a" }
    assert.deepStrictEqual(R.record.reduce("", (b, a) => b + a)(d2), "ab")
  })

  it("foldMap", () => {
    const foldMap = R.record.foldMap(monoidString)
    const x1 = { a: "a", b: "b" }
    const f1 = identity
    assert.deepStrictEqual(pipe(x1, foldMap(f1)), "ab")
  })

  it("reduceRight", () => {
    const reduceRight = R.record.reduceRight
    const x1 = { a: "a", b: "b" }
    const init1 = ""
    const f1 = (a: string, acc: string) => acc + a
    assert.deepStrictEqual(pipe(x1, reduceRight(init1, f1)), "ba")
  })

  it("traverse", () => {
    assert.deepStrictEqual(
      R.traverse(option)((n: number) => (n <= 2 ? some(n) : none))({ k1: 1, k2: 2 }),
      some({ k1: 1, k2: 2 })
    )
    assert.deepStrictEqual(
      R.traverse(option)((n: number) => (n >= 2 ? some(n) : none))({ k1: 1, k2: 2 }),
      none
    )
  })

  it("sequence", () => {
    const sequence = R.sequence(option)
    const x1 = { k1: some(1), k2: some(2) }
    assert.deepStrictEqual(sequence(x1), some({ k1: 1, k2: 2 }))
    const x2 = { k1: none, k2: some(2) }
    assert.deepStrictEqual(sequence(x2), none)
  })

  it("getEq", () => {
    assert.deepStrictEqual(R.getEq(eqNumber).equals({ a: 1 }, { a: 1 }), true)
    assert.deepStrictEqual(R.getEq(eqNumber).equals({ a: 1 }, { a: 2 }), false)
    assert.deepStrictEqual(R.getEq(eqNumber).equals({ a: 1 }, { b: 1 }), false)
    assert.deepStrictEqual(R.getEq(eqNumber).equals(noPrototype, { b: 1 }), false)
  })

  it("lookup", () => {
    assert.deepStrictEqual(R.lookup("a", { a: 1 }), some(1))
    assert.deepStrictEqual(R.lookup("b", { a: 1 }), none)
    assert.deepStrictEqual(R.lookup("b", noPrototype), none)
  })

  it("fromFoldable", () => {
    const First = getFirstSemigroup<number>()
    assert.deepStrictEqual(R.fromFoldable(First, readonlyArray)([["a", 1]]), { a: 1 })
    assert.deepStrictEqual(
      R.fromFoldable(
        First,
        readonlyArray
      )([
        ["a", 1],
        ["a", 2]
      ]),
      {
        a: 1
      }
    )
    const Last = getLastSemigroup<number>()
    assert.deepStrictEqual(
      R.fromFoldable(
        Last,
        readonlyArray
      )([
        ["a", 1],
        ["a", 2]
      ]),
      {
        a: 2
      }
    )
  })

  it("toArray", () => {
    assert.deepStrictEqual(R.toArray({ a: 1, b: 2 }), [
      ["a", 1],
      ["b", 2]
    ])
    assert.deepStrictEqual(R.toArray({ b: 2, a: 1 }), [
      ["a", 1],
      ["b", 2]
    ])
  })

  it("toUnfoldable", () => {
    assert.deepStrictEqual(R.toUnfoldable(readonlyArray)({ a: 1 }), [["a", 1]])
  })

  it("traverseWithIndex", () => {
    const d1 = { k1: 1, k2: 2 }
    const t1 = R.traverseWithIndex(option)(
      (k, n: number): Option<number> => (k !== "k1" ? some(n) : none)
    )(d1)
    assert.deepStrictEqual(t1, none)
    const t2 = R.traverseWithIndex(option)((): Option<number> => none)(R.empty)
    assert.deepStrictEqual(
      getOrElse((): Record<string, number> => R.empty)(t2),
      R.empty
    )
  })

  it("size", () => {
    assert.deepStrictEqual(R.size({}), 0)
    assert.deepStrictEqual(R.size({ a: 1 }), 1)
  })

  it("isEmpty", () => {
    assert.deepStrictEqual(R.isEmpty({}), true)
    assert.deepStrictEqual(R.isEmpty({ a: 1 }), false)
  })

  it("insertAt", () => {
    assert.deepStrictEqual(R.insertAt("a", 1)({}), { a: 1 })
    assert.deepStrictEqual(R.insertAt("c", 3)({ a: 1, b: 2 }), { a: 1, b: 2, c: 3 })
    // should return the same reference if the value is already there
    const x = { a: 1 }
    assert.deepStrictEqual(R.insertAt("a", 1)(x), x)
  })

  it("deleteAt", () => {
    assert.deepStrictEqual(R.deleteAt("a")({ a: 1, b: 2 }), { b: 2 })
    // should return the same reference if the key is missing
    const x = { a: 1 }
    assert.deepStrictEqual(R.deleteAt("b")(x), x)
    assert.deepStrictEqual(R.deleteAt("b")(noPrototype), noPrototype)
  })

  it("pop", () => {
    assert.deepStrictEqual(R.pop("a")({ a: 1, b: 2 }), some([1, { b: 2 }]))
    assert.deepStrictEqual(R.pop("c")({ a: 1, b: 2 }), none)
  })

  it("compact", () => {
    assert.deepStrictEqual(R.record.compact({ foo: none, bar: some(123) }), {
      bar: 123
    })
  })

  it("separate", () => {
    assert.deepStrictEqual(R.record.separate({ foo: left(123), bar: right(123) }), {
      left: { foo: 123 },
      right: { bar: 123 }
    })
  })

  it("filter", () => {
    const d = { a: 1, b: 3 }
    assert.deepStrictEqual(R.record.filter(p)(d), { b: 3 })

    // refinements
    const isNumber = (u: string | number): u is number => typeof u === "number"
    const y: Record<string, string | number> = { a: 1, b: "foo" }
    const actual = R.record.filter(isNumber)(y)
    assert.deepStrictEqual(actual, { a: 1 })

    assert.deepStrictEqual(R.record.filter((_) => true)(y), y)

    const x = Object.assign(Object.create({ c: true }), { a: 1, b: "foo" })
    assert.deepStrictEqual(R.record.filter(isNumber)(x), { a: 1 })

    assert.deepStrictEqual(R.record.filter(isNumber)(noPrototype), noPrototype)
  })

  it("filterMap", () => {
    const f = (n: number) => (p(n) ? some(n + 1) : none)
    assert.deepStrictEqual(R.record.filterMap(f)({}), {})
    assert.deepStrictEqual(R.record.filterMap(f)({ a: 1, b: 3 }), { b: 4 })
  })

  it("partition", () => {
    assert.deepStrictEqual(R.record.partition(p)({}), { left: {}, right: {} })
    assert.deepStrictEqual(R.record.partition(p)({ a: 1, b: 3 }), {
      left: { a: 1 },
      right: { b: 3 }
    })
  })

  it("partitionMap", () => {
    const f = (n: number) => (p(n) ? right(n + 1) : left(n - 1))
    assert.deepStrictEqual(R.record.partitionMap(f)({}), { left: {}, right: {} })
    assert.deepStrictEqual(R.record.partitionMap(f)({ a: 1, b: 3 }), {
      left: { a: 0 },
      right: { b: 4 }
    })
  })

  it("wither", () => {
    const witherIdentity = R.record.wither(I.identity)
    const f = (n: number) => I.identity.of(p(n) ? some(n + 1) : none)
    assert.deepStrictEqual(
      witherIdentity(f)({}),
      I.identity.of<Record<string, number>>({})
    )
    assert.deepStrictEqual(witherIdentity(f)({ a: 1, b: 3 }), I.identity.of({ b: 4 }))
  })

  it("wilt", () => {
    const wiltIdentity = R.record.wilt(I.identity)
    const f = (n: number) => I.identity.of(p(n) ? right(n + 1) : left(n - 1))
    assert.deepStrictEqual(wiltIdentity(f)({}), I.identity.of({ left: {}, right: {} }))
    assert.deepStrictEqual(
      wiltIdentity(f)({ a: 1, b: 3 }),
      I.identity.of({ left: { a: 0 }, right: { b: 4 } })
    )
  })

  it("reduceWithIndex", () => {
    const d1 = { k1: "a", k2: "b" }
    assert.deepStrictEqual(R.reduceWithIndex("", (k, b, a) => b + k + a)(d1), "k1ak2b")
    const d2 = { k2: "b", k1: "a" }
    assert.deepStrictEqual(R.reduceWithIndex("", (k, b, a) => b + k + a)(d2), "k1ak2b")
  })

  it("foldMapWithIndex", () => {
    const x1 = { k1: "a", k2: "b" }
    assert.deepStrictEqual(
      R.foldMapWithIndex(monoidString)((k, a) => k + a)(x1),
      "k1ak2b"
    )
  })

  it("reduceRightWithIndex", () => {
    const x1 = { k1: "a", k2: "b" }
    assert.deepStrictEqual(
      R.reduceRightWithIndex("", (k, a, b) => b + k + a)(x1),
      "k2bk1a"
    )
  })

  it("every", () => {
    const x: Record<string, number> = { a: 1, b: 2 }
    const y: Record<string, number> = { a: 1, b: 2 }
    assert.deepStrictEqual(R.every((n: number) => n <= 2)(x), true)
    assert.deepStrictEqual(R.every((n: number) => n <= 1)(y), false)
  })

  it("some", () => {
    const x: Record<string, number> = { a: 1, b: 2 }
    const y: Record<string, number> = { a: 1, b: 2 }
    assert.deepStrictEqual(R.some((n: number) => n <= 1)(x), true)
    assert.deepStrictEqual(R.some((n: number) => n <= 0)(y), false)
  })

  it("elem", () => {
    assert.deepStrictEqual(R.elem(eqNumber)(1, { a: 1, b: 2 }), true)
    assert.deepStrictEqual(R.elem(eqNumber)(3, { a: 1, b: 2 }), false)
  })

  it("fromFoldableMap", () => {
    const zipObject = <K extends string, A>(
      keys: ReadonlyArray<K>,
      values: ReadonlyArray<A>
    ): Record<K, A> =>
      pipe(
        zip_(keys, values),
        R.fromFoldableMap(getLastSemigroup<A>(), readonlyArray)(([k, a]) => [k, a])
      )

    assert.deepStrictEqual(zipObject(["a", "b"], [1, 2, 3]), { a: 1, b: 2 })

    interface User {
      readonly id: string
      readonly name: string
    }

    const users: ReadonlyArray<User> = [
      { id: "id1", name: "name1" },
      { id: "id2", name: "name2" },
      { id: "id1", name: "name3" }
    ]

    assert.deepStrictEqual(
      pipe(
        users,
        R.fromFoldableMap(
          getLastSemigroup<User>(),
          readonlyArray
        )((user) => [user.id, user])
      ),
      {
        id1: { id: "id1", name: "name3" },
        id2: { id: "id2", name: "name2" }
      }
    )
  })

  it("getShow", () => {
    const S = R.getShow(showString)
    assert.deepStrictEqual(S.show({}), `{}`)
    assert.deepStrictEqual(S.show({ a: "a" }), `{ "a": "a" }`)
    assert.deepStrictEqual(S.show({ a: "a", b: "b" }), `{ "a": "a", "b": "b" }`)
  })

  it("singleton", () => {
    assert.deepStrictEqual(R.singleton("a", 1), { a: 1 })
  })

  it("hasOwnProperty", () => {
    const x: Record<string, number> = { a: 1 }
    assert.deepStrictEqual(R.hasOwnProperty("a", x), true)
    assert.deepStrictEqual(R.hasOwnProperty("b", x), false)
  })

  it("partitionMapWithIndex", () => {
    assert.deepStrictEqual(
      R.partitionMapWithIndex((k, a: number) => (a > 1 ? right(a) : left(k)))({
        a: 1,
        b: 2
      }),
      {
        left: { a: "a" },
        right: { b: 2 }
      }
    )
  })

  it("partitionWithIndex", () => {
    assert.deepStrictEqual(
      R.partitionWithIndex((_, a: number) => a > 1)({ a: 1, b: 2 }),
      {
        left: { a: 1 },
        right: { b: 2 }
      }
    )
  })

  it("filterMapWithIndex", () => {
    assert.deepStrictEqual(
      R.filterMapWithIndex((_, a: number) => (a > 1 ? some(a) : none))({ a: 1, b: 2 }),
      { b: 2 }
    )
  })

  it("filterWithIndex", () => {
    assert.deepStrictEqual(R.filterWithIndex((_, a: number) => a > 1)({ a: 1, b: 2 }), {
      b: 2
    })
  })

  it("mapWithIndex", () => {
    assert.deepStrictEqual(
      R.mapWithIndex((k, a: number) => k + String(a))({ a: 1, b: 2 }),
      { a: "a1", b: "b2" }
    )
  })

  it("updateAt", () => {
    const x: Record<string, number> = { a: 1 }
    assert.deepStrictEqual(R.updateAt("b", 2)(x), none)
    assert.deepStrictEqual(R.updateAt("a", 2)(x), some({ a: 2 }))
    const r = R.updateAt("a", 1)(x)
    if (isSome(r)) {
      assert.deepStrictEqual(r.value, x)
    } else {
      assert.fail()
    }
  })

  it("modifyAt", () => {
    const x: Record<string, number> = { a: 1 }
    assert.deepStrictEqual(R.modifyAt("b", (n: number) => n * 2)(x), none)
    assert.deepStrictEqual(R.modifyAt("a", (n: number) => n * 2)(x), some({ a: 2 }))
  })
})
