import * as assert from "assert"

import * as _ from "../../src/Eq"
import { fold } from "../../src/Monoid"

describe("Eq", () => {
  it("getTupleEq", () => {
    const S = _.getTupleEq(_.eqString, _.eqNumber, _.eqBoolean)
    assert.deepStrictEqual(S.equals(["a", 1, true], ["a", 1, true]), true)
    assert.deepStrictEqual(S.equals(["a", 1, true], ["b", 1, true]), false)
    assert.deepStrictEqual(S.equals(["a", 1, true], ["a", 2, true]), false)
    assert.deepStrictEqual(S.equals(["a", 1, true], ["a", 1, false]), false)
  })

  interface Person {
    readonly name: string
    readonly age: number
  }
  it("fromEquals", () => {
    interface A {
      readonly x: number
    }
    let nbCall = 0
    const S1 = _.fromEquals<A>((a, b) => {
      nbCall += 1
      return a.x === b.x
    })
    const a1 = { x: 1 }
    const a2 = { x: 1 }
    S1.equals(a1, a1)
    assert.deepStrictEqual(nbCall, 0)
    S1.equals(a1, a2)
    assert.deepStrictEqual(nbCall, 1)
  })

  it("contramap", () => {
    const S = _.eq.contramap(_.eqString, (p: Person) => p.name)
    assert.deepStrictEqual(S.equals({ name: "a", age: 1 }, { name: "a", age: 2 }), true)
    assert.deepStrictEqual(S.equals({ name: "a", age: 1 }, { name: "a", age: 1 }), true)
    assert.deepStrictEqual(
      S.equals({ name: "a", age: 1 }, { name: "b", age: 1 }),
      false
    )
    assert.deepStrictEqual(
      S.equals({ name: "a", age: 1 }, { name: "b", age: 2 }),
      false
    )
  })

  it("eqDate", () => {
    assert.deepStrictEqual(_.eqDate.equals(new Date(0), new Date(0)), true)
    assert.deepStrictEqual(_.eqDate.equals(new Date(0), new Date(1)), false)
    assert.deepStrictEqual(_.eqDate.equals(new Date(1), new Date(0)), false)
  })

  it("getStructEq", () => {
    const S = _.getStructEq<Person>({
      name: _.eqString,
      age: _.eqNumber
    })
    assert.deepStrictEqual(S.equals({ name: "a", age: 1 }, { name: "a", age: 1 }), true)
    assert.deepStrictEqual(
      S.equals({ name: "a", age: 1 }, { name: "a", age: 2 }),
      false
    )
    assert.deepStrictEqual(
      S.equals({ name: "a", age: 1 }, { name: "b", age: 1 }),
      false
    )
  })

  it("eqStrict", () => {
    assert.deepStrictEqual(_.eqStrict.equals(1, 1), true)
    assert.deepStrictEqual(_.eqStrict.equals(1, "a"), false)
  })

  it("getMonoid", () => {
    type T = readonly [string, number, boolean]
    const M = _.getMonoid<T>()
    const eqFst: _.Eq<T> = _.contramap((x: T) => x[0])(_.eqString)
    const eqSnd: _.Eq<T> = _.contramap((x: T) => x[1])(_.eqNumber)
    const eq3rd: _.Eq<T> = _.contramap((x: T) => x[2])(_.eqBoolean)
    const eq = fold(M)([eqFst, eqSnd, eq3rd])
    assert.deepStrictEqual(eq.equals(["a", 1, true], ["a", 1, true]), true)
    assert.deepStrictEqual(eq.equals(["a", 1, true], ["b", 1, true]), false)
    assert.deepStrictEqual(eq.equals(["a", 1, true], ["a", 2, true]), false)
    assert.deepStrictEqual(eq.equals(["a", 1, true], ["a", 1, false]), false)
  })
})
