import { dual, pipe } from "../../Function"
import * as HashSet from "../../HashSet"
import * as core from "../../internal/stm/core"
import * as tMap from "../../internal/stm/tMap"
import type * as Option from "../../Option"
import type { Predicate } from "../../Predicate"
import * as RA from "../../ReadonlyArray"
import type * as STM from "../../STM"
import type * as TMap from "../../TMap"
import type * as TSet from "../../TSet"

/** @internal */
const TSetSymbolKey = "effect/TSet"

/** @internal */
export const TSetTypeId: TSet.TSetTypeId = Symbol.for(
  TSetSymbolKey
) as TSet.TSetTypeId

/** @internal */
const tSetVariance = {
  _A: (_: never) => _
}

/** @internal */
class TSetImpl<A> implements TSet.TSet<A> {
  readonly [TSetTypeId] = tSetVariance
  constructor(readonly tMap: TMap.TMap<A, void>) {}
}

/** @internal */
export const add = dual<
  <A>(value: A) => (self: TSet.TSet<A>) => STM.STM<never, never, void>,
  <A>(self: TSet.TSet<A>, value: A) => STM.STM<never, never, void>
>(2, (self, value) => tMap.set(self.tMap, value, void 0 as void))

/** @internal */
export const difference = dual<
  <A>(other: TSet.TSet<A>) => (self: TSet.TSet<A>) => STM.STM<never, never, void>,
  <A>(self: TSet.TSet<A>, other: TSet.TSet<A>) => STM.STM<never, never, void>
>(2, (self, other) =>
  core.flatMap(
    toHashSet(other),
    (values) => removeIfDiscard(self, (value) => HashSet.has(values, value))
  ))

/** @internal */
export const empty = <A>(): STM.STM<never, never, TSet.TSet<A>> => fromIterable([])

/** @internal */
export const forEach = dual<
  <A, R, E>(f: (value: A) => STM.STM<R, E, void>) => (self: TSet.TSet<A>) => STM.STM<R, E, void>,
  <A, R, E>(self: TSet.TSet<A>, f: (value: A) => STM.STM<R, E, void>) => STM.STM<R, E, void>
>(2, (self, f) => reduceSTM(self, void 0 as void, (_, value) => f(value)))

/** @internal */
export const fromIterable = <A>(iterable: Iterable<A>): STM.STM<never, never, TSet.TSet<A>> =>
  core.map(
    tMap.fromIterable(Array.from(iterable).map((a) => [a, void 0])),
    (tMap) => new TSetImpl(tMap)
  )

/** @internal */
export const has = dual<
  <A>(value: A) => (self: TSet.TSet<A>) => STM.STM<never, never, boolean>,
  <A>(self: TSet.TSet<A>, value: A) => STM.STM<never, never, boolean>
>(2, (self, value) => tMap.has(self.tMap, value))

/** @internal */
export const intersection = dual<
  <A>(other: TSet.TSet<A>) => (self: TSet.TSet<A>) => STM.STM<never, never, void>,
  <A>(self: TSet.TSet<A>, other: TSet.TSet<A>) => STM.STM<never, never, void>
>(2, (self, other) =>
  core.flatMap(
    toHashSet(other),
    (values) => pipe(self, retainIfDiscard((value) => pipe(values, HashSet.has(value))))
  ))

/** @internal */
export const isEmpty = <A>(self: TSet.TSet<A>): STM.STM<never, never, boolean> => tMap.isEmpty(self.tMap)

/** @internal */
export const make = <Elements extends Array<any>>(
  ...elements: Elements
): STM.STM<never, never, TSet.TSet<Elements[number]>> => fromIterable(elements)

/** @internal */
export const reduce = dual<
  <Z, A>(zero: Z, f: (accumulator: Z, value: A) => Z) => (self: TSet.TSet<A>) => STM.STM<never, never, Z>,
  <Z, A>(self: TSet.TSet<A>, zero: Z, f: (accumulator: Z, value: A) => Z) => STM.STM<never, never, Z>
>(3, (self, zero, f) =>
  tMap.reduceWithIndex(
    self.tMap,
    zero,
    (acc, _, key) => f(acc, key)
  ))

/** @internal */
export const reduceSTM = dual<
  <Z, A, R, E>(zero: Z, f: (accumulator: Z, value: A) => STM.STM<R, E, Z>) => (self: TSet.TSet<A>) => STM.STM<R, E, Z>,
  <Z, A, R, E>(self: TSet.TSet<A>, zero: Z, f: (accumulator: Z, value: A) => STM.STM<R, E, Z>) => STM.STM<R, E, Z>
>(3, (self, zero, f) =>
  tMap.reduceWithIndexSTM(
    self.tMap,
    zero,
    (acc, _, key) => f(acc, key)
  ))

/** @internal */
export const remove = dual<
  <A>(value: A) => (self: TSet.TSet<A>) => STM.STM<never, never, void>,
  <A>(self: TSet.TSet<A>, value: A) => STM.STM<never, never, void>
>(2, (self, value) => tMap.remove(self.tMap, value))

/** @internal */
export const removeAll = dual<
  <A>(iterable: Iterable<A>) => (self: TSet.TSet<A>) => STM.STM<never, never, void>,
  <A>(self: TSet.TSet<A>, iterable: Iterable<A>) => STM.STM<never, never, void>
>(2, (self, iterable) => tMap.removeAll(self.tMap, iterable))

/** @internal */
export const removeIf = dual<
  <A>(predicate: Predicate<A>) => (self: TSet.TSet<A>) => STM.STM<never, never, Array<A>>,
  <A>(self: TSet.TSet<A>, predicate: Predicate<A>) => STM.STM<never, never, Array<A>>
>(2, (self, predicate) =>
  pipe(
    tMap.removeIf(self.tMap, (key) => predicate(key)),
    core.map(RA.map((entry) => entry[0]))
  ))

/** @internal */
export const removeIfDiscard = dual<
  <A>(predicate: Predicate<A>) => (self: TSet.TSet<A>) => STM.STM<never, never, void>,
  <A>(self: TSet.TSet<A>, predicate: Predicate<A>) => STM.STM<never, never, void>
>(2, (self, predicate) =>
  tMap.removeIfDiscard(
    self.tMap,
    (key) => predicate(key)
  ))

/** @internal */
export const retainIf = dual<
  <A>(predicate: Predicate<A>) => (self: TSet.TSet<A>) => STM.STM<never, never, Array<A>>,
  <A>(self: TSet.TSet<A>, predicate: Predicate<A>) => STM.STM<never, never, Array<A>>
>(2, (self, predicate) =>
  pipe(
    tMap.retainIf(self.tMap, (key) => predicate(key)),
    core.map(RA.map((entry) => entry[0]))
  ))

/** @internal */
export const retainIfDiscard = dual<
  <A>(predicate: Predicate<A>) => (self: TSet.TSet<A>) => STM.STM<never, never, void>,
  <A>(self: TSet.TSet<A>, predicate: Predicate<A>) => STM.STM<never, never, void>
>(2, (self, predicate) =>
  tMap.retainIfDiscard(
    self.tMap,
    (key) => predicate(key)
  ))

/** @internal */
export const size = <A>(self: TSet.TSet<A>): STM.STM<never, never, number> =>
  core.map(toChunk(self), (chunk) => chunk.length)

/** @internal */
export const takeFirst = dual<
  <A, B>(pf: (a: A) => Option.Option<B>) => (self: TSet.TSet<A>) => STM.STM<never, never, B>,
  <A, B>(self: TSet.TSet<A>, pf: (a: A) => Option.Option<B>) => STM.STM<never, never, B>
>(2, (self, pf) => tMap.takeFirst(self.tMap, (key) => pf(key)))

/** @internal */
export const takeFirstSTM = dual<
  <A, R, E, B>(pf: (a: A) => STM.STM<R, Option.Option<E>, B>) => (self: TSet.TSet<A>) => STM.STM<R, E, B>,
  <A, R, E, B>(self: TSet.TSet<A>, pf: (a: A) => STM.STM<R, Option.Option<E>, B>) => STM.STM<R, E, B>
>(2, (self, pf) => tMap.takeFirstSTM(self.tMap, (key) => pf(key)))

/** @internal */
export const takeSome = dual<
  <A, B>(pf: (a: A) => Option.Option<B>) => (self: TSet.TSet<A>) => STM.STM<never, never, RA.NonEmptyArray<B>>,
  <A, B>(self: TSet.TSet<A>, pf: (a: A) => Option.Option<B>) => STM.STM<never, never, RA.NonEmptyArray<B>>
>(2, (self, pf) => tMap.takeSome(self.tMap, (key) => pf(key)))

/** @internal */
export const takeSomeSTM = dual<
  <A, R, E, B>(
    pf: (a: A) => STM.STM<R, Option.Option<E>, B>
  ) => (self: TSet.TSet<A>) => STM.STM<R, E, RA.NonEmptyArray<B>>,
  <A, R, E, B>(
    self: TSet.TSet<A>,
    pf: (a: A) => STM.STM<R, Option.Option<E>, B>
  ) => STM.STM<R, E, RA.NonEmptyArray<B>>
>(2, (self, pf) => tMap.takeSomeSTM(self.tMap, (key) => pf(key)))

/** @internal */
export const toChunk = <A>(self: TSet.TSet<A>): STM.STM<never, never, Array<A>> => tMap.keys(self.tMap)

/** @internal */
export const toHashSet = <A>(self: TSet.TSet<A>): STM.STM<never, never, HashSet.HashSet<A>> =>
  reduce(
    self,
    HashSet.empty<A>(),
    (acc, value) => pipe(acc, HashSet.add(value))
  )

/** @internal */
export const toReadonlyArray = <A>(self: TSet.TSet<A>): STM.STM<never, never, ReadonlyArray<A>> =>
  reduce<ReadonlyArray<A>, A>(
    self,
    [],
    (acc, value) => [...acc, value]
  )

/** @internal */
export const toReadonlySet = <A>(self: TSet.TSet<A>): STM.STM<never, never, ReadonlySet<A>> =>
  core.map(toReadonlyArray(self), (values) => new Set(values))

/** @internal */
export const transform = dual<
  <A>(f: (a: A) => A) => (self: TSet.TSet<A>) => STM.STM<never, never, void>,
  <A>(self: TSet.TSet<A>, f: (a: A) => A) => STM.STM<never, never, void>
>(2, (self, f) => tMap.transform(self.tMap, (key, value) => [f(key), value]))

/** @internal */
export const transformSTM = dual<
  <A, R, E>(f: (a: A) => STM.STM<R, E, A>) => (self: TSet.TSet<A>) => STM.STM<R, E, void>,
  <A, R, E>(self: TSet.TSet<A>, f: (a: A) => STM.STM<R, E, A>) => STM.STM<R, E, void>
>(2, (self, f) =>
  tMap.transformSTM(
    self.tMap,
    (key, value) => core.map(f(key), (a) => [a, value])
  ))

/** @internal */
export const union = dual<
  <A>(other: TSet.TSet<A>) => (self: TSet.TSet<A>) => STM.STM<never, never, void>,
  <A>(self: TSet.TSet<A>, other: TSet.TSet<A>) => STM.STM<never, never, void>
>(2, (self, other) => forEach(other, (value) => add(self, value)))
