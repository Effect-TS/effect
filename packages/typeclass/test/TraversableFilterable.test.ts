import * as ArrayInstances from "@effect/typeclass/data/Array"
import * as OptionInstances from "@effect/typeclass/data/Option"
import * as _ from "@effect/typeclass/TraversableFilterable"
import { assert, describe, expect, it } from "@effect/vitest"
import * as E from "effect/Either"
import * as O from "effect/Option"
import * as U from "./util.js"

describe.concurrent("TraversableFilterable", () => {
  it("traversePartitionMap", () => {
    const traversePartitionMap: <A, B, C>(
      self: ReadonlyArray<A>,
      f: (a: A) => O.Option<E.Either<C, B>>
    ) => O.Option<[ReadonlyArray<B>, ReadonlyArray<C>]> = _.traversePartitionMap({
      ...ArrayInstances.Traversable,
      ...ArrayInstances.Covariant,
      ...ArrayInstances.Filterable
    })(OptionInstances.Applicative)
    const f = (s: string) => s.length > 1 ? O.some(E.right(s)) : s.length > 0 ? O.some(E.left(s)) : O.none()
    expect(traversePartitionMap([], f)).toEqual(O.some([[], []]))
    expect(traversePartitionMap([""], f)).toEqual(O.none())
    expect(traversePartitionMap(["a"], f)).toEqual(O.some([["a"], []]))
    expect(traversePartitionMap(["aa"], f)).toEqual(O.some([[], ["aa"]]))
    expect(traversePartitionMap(["aa", "a", ""], f)).toEqual(O.none())
    expect(traversePartitionMap(["aa", "a", "aaa"], f)).toEqual(O.some([["a"], ["aa", "aaa"]]))
  })

  it("traverseFilterMap", () => {
    const traverseFilterMap: <A, B>(
      self: ReadonlyArray<A>,
      f: (a: A) => O.Option<O.Option<B>>
    ) => O.Option<ReadonlyArray<B>> = _.traverseFilterMap({
      ...ArrayInstances.Traversable,
      ...ArrayInstances.Filterable
    })(OptionInstances.Applicative)
    const f = (s: string) => s.length > 1 ? O.some(O.some(s)) : s.length > 0 ? O.some(O.none()) : O.none()
    assert.deepStrictEqual(traverseFilterMap([], f), O.some([]))
    assert.deepStrictEqual(traverseFilterMap([""], f), O.none())
    assert.deepStrictEqual(traverseFilterMap(["a"], f), O.some([]))
    assert.deepStrictEqual(traverseFilterMap(["aa"], f), O.some(["aa"]))
    assert.deepStrictEqual(traverseFilterMap(["aa", "a", ""], f), O.none())
    assert.deepStrictEqual(
      traverseFilterMap(["aa", "a", "aaa"], f),
      O.some(["aa", "aaa"])
    )
  })

  it("traverseFilter", () => {
    const traverseFilter = _.traverseFilter(
      ArrayInstances.TraversableFilterable
    )(OptionInstances.Applicative)
    const f = traverseFilter((s: string) => s.length > 2 ? O.some(false) : s.length > 1 ? O.some(true) : O.none())
    U.deepStrictEqual(f([]), O.some([]))
    U.deepStrictEqual(f(["a"]), O.none())
    U.deepStrictEqual(f(["a", "aa"]), O.none())
    U.deepStrictEqual(f(["aa"]), O.some(["aa"]))
    U.deepStrictEqual(f(["aaa"]), O.some([]))
    U.deepStrictEqual(f(["aaa", "aa"]), O.some(["aa"]))
  })

  it("traversePartition", () => {
    const traversePartition = _.traversePartition(
      ArrayInstances.TraversableFilterable
    )(OptionInstances.Applicative)
    const f = traversePartition((s: string) => s.length > 2 ? O.some(false) : s.length > 1 ? O.some(true) : O.none())
    expect(f([])).toEqual(O.some([[], []]))
    expect(f(["a"])).toEqual(O.none())
    expect(f(["a", "aa"])).toEqual(O.none())
    expect(f(["aa"])).toEqual(O.some([[], ["aa"]]))
    expect(f(["aaa"])).toEqual(O.some([["aaa"], []]))
    expect(f(["aaa", "aa"])).toEqual(O.some([["aaa"], ["aa"]]))
  })
})
