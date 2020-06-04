import * as assert from "assert"

import { getMonoid } from "../../src/Array"
import { left, right } from "../../src/Either"
import { Eq, eqNumber, eqString, eq, getStructEq } from "../../src/Eq"
import { none, some as optionSome } from "../../src/Option"
import { ordNumber } from "../../src/Ord"
import { pipe } from "../../src/Pipe"
import * as _ from "../../src/Set"
import { showString } from "../../src/Show"

const gte2 = (n: number) => n >= 2

interface Foo {
  readonly x: string
}
const foo = (x: string): Foo => ({ x })
const fooEq: Eq<Foo> = {
  equals: (a: Foo, b: Foo) => a.x === b.x
}

describe("ReadonlySet", () => {
  it("toArray", () => {
    assert.deepStrictEqual(_.toArray(ordNumber)(new Set()), [])
    assert.deepStrictEqual(_.toArray(ordNumber)(new Set([1, 2, 3])), [1, 2, 3])
    assert.deepStrictEqual(_.toArray(ordNumber)(new Set([3, 2, 1])), [1, 2, 3])
  })

  it("getEq", () => {
    const S = _.getEq(eqNumber)
    assert.deepStrictEqual(S.equals(new Set([1, 2, 3]), new Set([1, 2, 3])), true)
    assert.deepStrictEqual(S.equals(new Set([1, 2, 3]), new Set([1, 2])), false)
    assert.deepStrictEqual(S.equals(new Set([1, 2]), new Set([1, 2, 3])), false)
  })

  it("some", () => {
    assert.deepStrictEqual(
      _.some((s: string) => s.trim() === "")(new Set<string>()),
      false
    )
    assert.deepStrictEqual(_.some(gte2)(new Set([1, 2, 3])), true)
    assert.deepStrictEqual(_.some(gte2)(new Set([1])), false)
  })

  it("map", () => {
    assert.deepStrictEqual(
      _.map(eqNumber)((n: number) => n % 2)(new Set([])),
      new Set([])
    )
    assert.deepStrictEqual(
      _.map(eqNumber)((n: number) => n % 2)(new Set([1, 2, 3, 4])),
      new Set([0, 1])
    )
    assert.deepStrictEqual(
      _.map(eqString)((n: number) => `${n % 2}`)(new Set([1, 2, 3, 4])),
      new Set(["0", "1"])
    )
  })

  it("every", () => {
    assert.deepStrictEqual(_.every(gte2)(new Set([1, 2, 3])), false)
    assert.deepStrictEqual(_.every(gte2)(new Set([2, 3])), true)
  })

  it("chain", () => {
    assert.deepStrictEqual(
      _.chain(eqString)((n: number) => new Set([n.toString()]))(new Set([])),
      new Set([])
    )
    assert.deepStrictEqual(
      _.chain(eqString)(() => new Set([]))(new Set([1, 2])),
      new Set([])
    )
    assert.deepStrictEqual(
      _.chain(eqString)((n: number) => new Set([`${n}`, `${n + 1}`]))(new Set([1, 2])),
      new Set(["1", "2", "3"])
    )
  })

  it("isSubset", () => {
    assert.deepStrictEqual(
      _.isSubset(eqNumber)(new Set([1, 2, 3]))(new Set([1, 2])),
      true
    )
    assert.deepStrictEqual(
      _.isSubset(eqNumber)(new Set([1, 2, 4]))(new Set([1, 2, 3])),
      false
    )
  })

  it("filter", () => {
    assert.deepStrictEqual(_.filter(gte2)(new Set([1, 2, 3])), new Set([2, 3]))

    // refinements
    const isNumber = (u: string | number): u is number => typeof u === "number"
    const actual = _.filter(isNumber)(new Set([1, "a", 2]))
    assert.deepStrictEqual(actual, new Set([1, 2]))
  })

  it("partition", () => {
    assert.deepStrictEqual(_.partition(() => true)(new Set([])), {
      right: new Set([]),
      left: new Set([])
    })
    assert.deepStrictEqual(_.partition(() => true)(new Set([1])), {
      right: new Set([1]),
      left: new Set([])
    })
    assert.deepStrictEqual(_.partition(() => false)(new Set([1])), {
      right: new Set([]),
      left: new Set([1])
    })
    assert.deepStrictEqual(
      _.partition((n: number) => n % 2 === 0)(new Set([1, 2, 3, 4])),
      {
        right: new Set([2, 4]),
        left: new Set([1, 3])
      }
    )

    // refinements
    const isNumber = (u: string | number): u is number => typeof u === "number"
    const actual = _.partition(isNumber)(new Set([1, "a", 2]))
    assert.deepStrictEqual(actual, {
      left: new Set(["a"]),
      right: new Set([1, 2])
    })
  })

  it("union", () => {
    assert.deepStrictEqual(
      _.union(eqNumber)(new Set([1, 2]))(new Set([1, 3])),
      new Set([1, 2, 3])
    )
  })

  it("intersection", () => {
    assert.deepStrictEqual(
      _.intersection(eqNumber)(new Set([1, 2]))(new Set([1, 3])),
      new Set([1])
    )
  })

  it("partitionMap", () => {
    assert.deepStrictEqual(
      _.partitionMap(eqNumber, eqString)((n: number) => left(n))(new Set([])),
      {
        left: new Set([]),
        right: new Set([])
      }
    )
    assert.deepStrictEqual(
      _.partitionMap(
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
      _.partitionMap(
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
    const M = _.getUnionMonoid(eqNumber)
    assert.deepStrictEqual(
      M.concat(new Set([1, 2]), new Set([1, 3])),
      new Set([1, 2, 3])
    )
    assert.deepStrictEqual(M.concat(new Set([1, 2]), M.empty), new Set([1, 2]))
    assert.deepStrictEqual(M.concat(M.empty, new Set([1, 3])), new Set([1, 3]))
  })

  it("getIntersectionSemigroup", () => {
    const S = _.getIntersectionSemigroup(eqNumber)
    assert.deepStrictEqual(S.concat(new Set([1, 2]), new Set([1, 3])), new Set([1]))
    assert.deepStrictEqual(S.concat(new Set([1, 2]), _.empty), _.empty)
    assert.deepStrictEqual(S.concat(_.empty, new Set([1, 3])), _.empty)
  })

  it("difference", () => {
    assert.deepStrictEqual(
      _.difference(eqNumber)(new Set([1, 3]))(new Set([1, 2])),
      new Set([2])
    )
  })

  it("reduce", () => {
    assert.deepStrictEqual(
      _.reduce(ordNumber)("", (b, a) => b + a)(new Set([1, 2, 3])),
      "123"
    )
    assert.deepStrictEqual(
      _.reduce(ordNumber)("", (b, a) => b + a)(new Set([3, 2, 1])),
      "123"
    )
  })

  it("foldMap", () => {
    assert.deepStrictEqual(
      _.foldMap(ordNumber, getMonoid<number>())((a) => [a])(new Set([1, 2, 3])),
      [1, 2, 3]
    )
    assert.deepStrictEqual(
      _.foldMap(ordNumber, getMonoid<number>())((a) => [a])(new Set([3, 2, 1])),
      [1, 2, 3]
    )
  })

  it("singleton", () => {
    assert.deepStrictEqual(_.singleton(1), new Set([1]))
  })

  it("insert", () => {
    const x = new Set([1, 2])
    assert.deepStrictEqual(_.insert(eqNumber)(3)(x), new Set([1, 2, 3]))
    // should return the same ference if the element is already a member
    assert.deepStrictEqual(_.insert(eqNumber)(2)(x), x)
  })

  it("remove", () => {
    assert.deepStrictEqual(_.remove(eqNumber)(3)(new Set([1, 2])), new Set([1, 2]))
    assert.deepStrictEqual(_.remove(eqNumber)(1)(new Set([1, 2])), new Set([2]))
  })

  it("fromArray", () => {
    assert.deepStrictEqual(_.fromArray(eqNumber)([]), new Set([]))
    assert.deepStrictEqual(_.fromArray(eqNumber)([1]), new Set([1]))
    assert.deepStrictEqual(_.fromArray(eqNumber)([1, 1]), new Set([1]))
    assert.deepStrictEqual(_.fromArray(eqNumber)([1, 2]), new Set([1, 2]))

    assert.deepStrictEqual(
      _.fromArray(fooEq)(["a", "a", "b"].map(foo)),
      new Set(["a", "b"].map(foo))
    )
  })

  it("compact", () => {
    assert.deepStrictEqual(
      _.compact(eqNumber)(new Set([optionSome(1), none, optionSome(2)])),
      new Set([1, 2])
    )
    type R = { readonly id: string }
    const S: Eq<R> = pipe(
      eqString,
      eq.contramap((x) => x.id)
    )
    assert.deepStrictEqual(
      _.compact(S)(new Set([optionSome({ id: "a" }), none, optionSome({ id: "a" })])),
      new Set([{ id: "a" }])
    )
  })

  it("separate", () => {
    assert.deepStrictEqual(
      _.separate(eqString, eqNumber)(new Set([right(1), left("a"), right(2)])),
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
      _.separate(
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
      _.filterMap(eqNumber)((s: string) =>
        s.length > 1 ? optionSome(s.length) : none
      )(new Set(["a", "bb", "ccc"])),
      new Set([2, 3])
    )
    type R = { readonly id: string }
    const S: Eq<R> = pipe(
      eqString,
      eq.contramap((x) => x.id)
    )
    assert.deepStrictEqual(
      _.filterMap(S)((x: { readonly id: string }) => optionSome(x))(
        new Set([{ id: "a" }, { id: "a" }])
      ),
      new Set([{ id: "a" }])
    )
  })

  it("getShow", () => {
    const S = _.getShow(showString)
    const s1 = new Set<string>([])
    assert.deepStrictEqual(S.show(s1), `new Set([])`)
    const s2 = new Set<string>(["a"])
    assert.deepStrictEqual(S.show(s2), `new Set(["a"])`)
    const s3 = new Set<string>(["a", "b"])
    assert.deepStrictEqual(S.show(s3), `new Set(["a", "b"])`)
  })

  it("fromMutable", () => {
    const as = new Set(["a"])
    const bs = _.fromMutable(as)
    assert.deepStrictEqual(bs, as)
    assert.notStrictEqual(bs, as)
  })

  it("toMutable", () => {
    const as: ReadonlySet<string> = new Set(["a"])
    const bs = _.toMutable(as)
    assert.deepStrictEqual(bs, as)
    assert.notStrictEqual(bs, as)
  })
})
