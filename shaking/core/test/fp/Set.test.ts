import * as assert from "assert"

import { getMonoid } from "../../src/Array"
import { left, right } from "../../src/Either"
import { Eq, eqNumber, eqString, eq, getStructEq } from "../../src/Eq"
import { none, some as optionSome } from "../../src/Option"
import { ordNumber } from "../../src/Ord"
import { pipe } from "../../src/Pipe"
import {
  chain,
  every,
  filter,
  fromArray,
  getIntersectionSemigroup,
  getEq,
  getUnionMonoid,
  insert,
  intersection,
  map,
  partition,
  partitionMap,
  reduce,
  remove,
  singleton,
  some,
  toArray,
  toggle,
  union,
  difference,
  compact,
  separate,
  filterMap,
  foldMap,
  getShow,
  empty,
  isSubset
} from "../../src/Set"
import { showString } from "../../src/Show"

const gte2 = (n: number) => n >= 2

interface Foo {
  readonly x: string
}
const foo = (x: string): Foo => ({ x })
const fooEq: Eq<Foo> = {
  equals: (a: Foo, b: Foo) => a.x === b.x
}

describe("Set", () => {
  it("toArray", () => {
    assert.deepStrictEqual(toArray(ordNumber)(new Set()), [])
    assert.deepStrictEqual(toArray(ordNumber)(new Set([1, 2, 3])), [1, 2, 3])
    assert.deepStrictEqual(toArray(ordNumber)(new Set([3, 2, 1])), [1, 2, 3])
  })

  it("getEq", () => {
    const S = getEq(eqNumber)
    assert.deepStrictEqual(S.equals(new Set([1, 2, 3]), new Set([1, 2, 3])), true)
    assert.deepStrictEqual(S.equals(new Set([1, 2, 3]), new Set([1, 2])), false)
    assert.deepStrictEqual(S.equals(new Set([1, 2]), new Set([1, 2, 3])), false)
  })

  it("some", () => {
    assert.deepStrictEqual(
      some((s: string) => s.trim() === "")(new Set<string>()),
      false
    )
    assert.deepStrictEqual(some(gte2)(new Set([1, 2, 3])), true)
    assert.deepStrictEqual(some(gte2)(new Set([1])), false)
  })

  it("map", () => {
    assert.deepStrictEqual(
      map(eqNumber)((n: number) => n % 2)(new Set([])),
      new Set([])
    )
    assert.deepStrictEqual(
      map(eqNumber)((n: number) => n % 2)(new Set([1, 2, 3, 4])),
      new Set([0, 1])
    )
    assert.deepStrictEqual(
      map(eqString)((n: number) => `${n % 2}`)(new Set([1, 2, 3, 4])),
      new Set(["0", "1"])
    )
  })

  it("every", () => {
    assert.deepStrictEqual(every(gte2)(new Set([1, 2, 3])), false)
    assert.deepStrictEqual(every(gte2)(new Set([2, 3])), true)
  })

  it("chain", () => {
    assert.deepStrictEqual(
      chain(eqString)((n: number) => new Set([n.toString()]))(new Set([])),
      new Set([])
    )
    assert.deepStrictEqual(
      chain(eqString)(() => new Set([]))(new Set([1, 2])),
      new Set([])
    )
    assert.deepStrictEqual(
      chain(eqString)((n: number) => new Set([`${n}`, `${n + 1}`]))(new Set([1, 2])),
      new Set(["1", "2", "3"])
    )
  })

  it("subset", () => {
    assert.deepStrictEqual(
      isSubset(eqNumber)(new Set([1, 2, 3]))(new Set([1, 2])),
      true
    )
    assert.deepStrictEqual(
      isSubset(eqNumber)(new Set([1, 2, 4]))(new Set([1, 2, 3])),
      false
    )
  })

  it("filter", () => {
    assert.deepStrictEqual(filter(gte2)(new Set([1, 2, 3])), new Set([2, 3]))

    // refinements
    const isNumber = (u: string | number): u is number => typeof u === "number"
    const actual = filter(isNumber)(new Set([1, "a", 2]))
    assert.deepStrictEqual(actual, new Set([1, 2]))
  })

  it("partition", () => {
    assert.deepStrictEqual(partition(() => true)(new Set([])), {
      right: new Set([]),
      left: new Set([])
    })
    assert.deepStrictEqual(partition(() => true)(new Set([1])), {
      right: new Set([1]),
      left: new Set([])
    })
    assert.deepStrictEqual(partition(() => false)(new Set([1])), {
      right: new Set([]),
      left: new Set([1])
    })
    assert.deepStrictEqual(
      partition((n: number) => n % 2 === 0)(new Set([1, 2, 3, 4])),
      {
        right: new Set([2, 4]),
        left: new Set([1, 3])
      }
    )

    // refinements
    const isNumber = (u: string | number): u is number => typeof u === "number"
    const actual = partition(isNumber)(new Set([1, "a", 2]))
    assert.deepStrictEqual(actual, {
      left: new Set(["a"]),
      right: new Set([1, 2])
    })
  })

  it("union", () => {
    assert.deepStrictEqual(
      union(eqNumber)(new Set([1, 2]))(new Set([1, 3])),
      new Set([1, 2, 3])
    )
  })

  it("intersection", () => {
    assert.deepStrictEqual(
      intersection(eqNumber)(new Set([1, 2]))(new Set([1, 3])),
      new Set([1])
    )
  })

  it("partitionMap", () => {
    assert.deepStrictEqual(
      partitionMap(eqNumber, eqString)((n: number) => left(n))(new Set([])),
      {
        left: new Set([]),
        right: new Set([])
      }
    )
    assert.deepStrictEqual(
      partitionMap(
        eqNumber,
        eqString
      )((n: number) => (n % 2 === 0 ? left(n) : right(`${n}`)))(new Set([1, 2, 3])),
      {
        left: new Set([2]),
        right: new Set(["1", "3"])
      }
    )
    const SL = getStructEq({ value: eqNumber })
    const SR = getStructEq({ value: eqString })
    assert.deepStrictEqual(
      partitionMap(
        SL,
        SR
      )((x: { readonly value: number }) =>
        x.value % 2 === 0 ? left({ value: 2 }) : right({ value: "odd" })
      )(new Set([{ value: 1 }, { value: 2 }, { value: 3 }, { value: 4 }])),
      {
        left: new Set([{ value: 2 }]),
        right: new Set([{ value: "odd" }])
      }
    )
  })

  it("getUnionMonoid", () => {
    const M = getUnionMonoid(eqNumber)
    assert.deepStrictEqual(
      M.concat(new Set([1, 2]), new Set([1, 3])),
      new Set([1, 2, 3])
    )
    assert.deepStrictEqual(M.concat(new Set([1, 2]), M.empty), new Set([1, 2]))
    assert.deepStrictEqual(M.concat(M.empty, new Set([1, 3])), new Set([1, 3]))
  })

  it("getIntersectionSemigroup", () => {
    const S = getIntersectionSemigroup(eqNumber)
    assert.deepStrictEqual(S.concat(new Set([1, 2]), new Set([1, 3])), new Set([1]))
    assert.deepStrictEqual(S.concat(new Set([1, 2]), empty), empty)
    assert.deepStrictEqual(S.concat(empty, new Set([1, 3])), empty)
  })

  it("difference", () => {
    assert.deepStrictEqual(
      difference(eqNumber)(new Set([1, 3]))(new Set([1, 2])),
      new Set([2])
    )
  })

  it("reduce", () => {
    assert.deepStrictEqual(
      reduce(ordNumber)("", (b, a) => b + a)(new Set([1, 2, 3])),
      "123"
    )
    assert.deepStrictEqual(
      reduce(ordNumber)("", (b, a) => b + a)(new Set([3, 2, 1])),
      "123"
    )
  })

  it("foldMap", () => {
    assert.deepStrictEqual(
      foldMap(ordNumber, getMonoid<number>())((a) => [a])(new Set([1, 2, 3])),
      [1, 2, 3]
    )
    assert.deepStrictEqual(
      foldMap(ordNumber, getMonoid<number>())((a) => [a])(new Set([3, 2, 1])),
      [1, 2, 3]
    )
  })

  it("singleton", () => {
    assert.deepStrictEqual(singleton(1), new Set([1]))
  })

  it("insert", () => {
    const x = new Set([1, 2])
    assert.deepStrictEqual(insert(eqNumber)(3)(x), new Set([1, 2, 3]))
    // should return the same ference if the element is already a member
    assert.deepStrictEqual(insert(eqNumber)(2)(x), x)
  })

  it("remove", () => {
    assert.deepStrictEqual(remove(eqNumber)(3)(new Set([1, 2])), new Set([1, 2]))
    assert.deepStrictEqual(remove(eqNumber)(1)(new Set([1, 2])), new Set([2]))
  })

  it("toggle", () => {
    assert.deepStrictEqual(toggle(eqNumber)(1)(new Set([2])), new Set([1, 2]))
    assert.deepStrictEqual(toggle(eqNumber)(1)(new Set([1, 2])), new Set([2]))
  })

  it("fromArray", () => {
    assert.deepStrictEqual(fromArray(eqNumber)([]), new Set([]))
    assert.deepStrictEqual(fromArray(eqNumber)([1]), new Set([1]))
    assert.deepStrictEqual(fromArray(eqNumber)([1, 1]), new Set([1]))
    assert.deepStrictEqual(fromArray(eqNumber)([1, 2]), new Set([1, 2]))

    assert.deepStrictEqual(
      fromArray(fooEq)(["a", "a", "b"].map(foo)),
      new Set(["a", "b"].map(foo))
    )
  })

  it("compact", () => {
    assert.deepStrictEqual(
      compact(eqNumber)(new Set([optionSome(1), none, optionSome(2)])),
      new Set([1, 2])
    )
    type R = { readonly id: string }
    const S: Eq<R> = pipe(
      eqString,
      eq.contramap((x) => x.id)
    )
    assert.deepStrictEqual(
      compact(S)(new Set([optionSome({ id: "a" }), none, optionSome({ id: "a" })])),
      new Set([{ id: "a" }])
    )
  })

  it("separate", () => {
    assert.deepStrictEqual(
      separate(eqString, eqNumber)(new Set([right(1), left("a"), right(2)])),
      {
        left: new Set(["a"]),
        right: new Set([1, 2])
      }
    )
    type L = { readonly error: string }
    type R = { readonly id: string }
    const SL: Eq<L> = pipe(
      eqString,
      eq.contramap((x) => x.error)
    )
    const SR: Eq<R> = pipe(
      eqString,
      eq.contramap((x) => x.id)
    )
    assert.deepStrictEqual(
      separate(
        SL,
        SR
      )(
        new Set([
          right({ id: "a" }),
          left({ error: "error" }),
          right({ id: "a" }),
          left({ error: "error" })
        ])
      ),
      {
        left: new Set([{ error: "error" }]),
        right: new Set([{ id: "a" }])
      }
    )
  })

  it("filterMap", () => {
    assert.deepStrictEqual(
      filterMap(eqNumber)((s: string) => (s.length > 1 ? optionSome(s.length) : none))(
        new Set(["a", "bb", "ccc"])
      ),
      new Set([2, 3])
    )
    type R = { readonly id: string }
    const S: Eq<R> = pipe(
      eqString,
      eq.contramap((x) => x.id)
    )
    assert.deepStrictEqual(
      filterMap(S)((x: { readonly id: string }) => optionSome(x))(
        new Set([{ id: "a" }, { id: "a" }])
      ),
      new Set([{ id: "a" }])
    )
  })

  it("getShow", () => {
    const S = getShow(showString)
    const s1 = new Set<string>([])
    assert.deepStrictEqual(S.show(s1), `new Set([])`)
    const s2 = new Set<string>(["a"])
    assert.deepStrictEqual(S.show(s2), `new Set(["a"])`)
    const s3 = new Set<string>(["a", "b"])
    assert.deepStrictEqual(S.show(s3), `new Set(["a", "b"])`)
  })
})
