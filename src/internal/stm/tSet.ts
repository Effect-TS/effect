import * as Chunk from "../../Chunk.js"
import { dual, pipe } from "../../Function.js"
import * as HashSet from "../../HashSet.js"
import type * as Option from "../../Option.js"
import { hasProperty, type Predicate } from "../../Predicate.js"
import * as RA from "../../ReadonlyArray.js"
import * as STM from "../../STM.js"
import type * as TMap from "../../TMap.js"
import type * as TSet from "../../TSet.js"
import * as core from "./core.js"
import * as tMap from "./tMap.js"

/** @internal */
const TSetSymbolKey = "effect/TSet"

/** @internal */
export const TSetTypeId: TSet.TSetTypeId = Symbol.for(
  TSetSymbolKey
) as TSet.TSetTypeId

const tSetVariance = {
  /* c8 ignore next */
  _A: (_: any) => _
}

/** @internal */
class TSetImpl<in out A> implements TSet.TSet<A> {
  readonly [TSetTypeId] = tSetVariance
  constructor(readonly tMap: TMap.TMap<A, void>) {}
}

const isTSet = (u: unknown) => hasProperty(u, TSetTypeId)

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
    (values) => removeIf(self, (value) => HashSet.has(values, value), { discard: true })
  ))

/** @internal */
export const empty = <A>(): STM.STM<never, never, TSet.TSet<A>> => fromIterable<A>([])

/** @internal */
export const forEach = dual<
  <A, R, E>(f: (value: A) => STM.STM<R, E, void>) => (self: TSet.TSet<A>) => STM.STM<R, E, void>,
  <A, R, E>(self: TSet.TSet<A>, f: (value: A) => STM.STM<R, E, void>) => STM.STM<R, E, void>
>(2, (self, f) => reduceSTM(self, void 0 as void, (_, value) => f(value)))

/** @internal */
export const fromIterable = <A>(iterable: Iterable<A>): STM.STM<never, never, TSet.TSet<A>> =>
  core.map(
    tMap.fromIterable(Array.from(iterable).map((a): [A, void] => [a, void 0])),
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
    (values) => pipe(self, retainIf((value) => pipe(values, HashSet.has(value)), { discard: true }))
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
  tMap.reduce(
    self.tMap,
    zero,
    (acc, _, key) => f(acc, key)
  ))

/** @internal */
export const reduceSTM = dual<
  <Z, A, R, E>(zero: Z, f: (accumulator: Z, value: A) => STM.STM<R, E, Z>) => (self: TSet.TSet<A>) => STM.STM<R, E, Z>,
  <Z, A, R, E>(self: TSet.TSet<A>, zero: Z, f: (accumulator: Z, value: A) => STM.STM<R, E, Z>) => STM.STM<R, E, Z>
>(3, (self, zero, f) =>
  tMap.reduceSTM(
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
export const removeIf: {
  <A>(predicate: Predicate<A>, options: {
    readonly discard: true
  }): (self: TSet.TSet<A>) => STM.STM<never, never, void>
  <A>(
    predicate: Predicate<A>,
    options?: {
      readonly discard: false
    }
  ): (self: TSet.TSet<A>) => STM.STM<never, never, Array<A>>
  <A>(self: TSet.TSet<A>, predicate: Predicate<A>, options: {
    readonly discard: true
  }): STM.STM<never, never, void>
  <A>(
    self: TSet.TSet<A>,
    predicate: Predicate<A>,
    options?: {
      readonly discard: false
    }
  ): STM.STM<never, never, Array<A>>
} = dual(
  (args) => isTSet(args[0]),
  (self, predicate, options) =>
    options?.discard === true ? tMap.removeIf(self.tMap, (key) => predicate(key), { discard: true }) : pipe(
      tMap.removeIf(self.tMap, (key) => predicate(key)),
      core.map(RA.map((entry) => entry[0]))
    )
)

/** @internal */
export const retainIf: {
  <A>(predicate: Predicate<A>, options: {
    readonly discard: true
  }): (self: TSet.TSet<A>) => STM.STM<never, never, void>
  <A>(
    predicate: Predicate<A>,
    options?: {
      readonly discard: false
    }
  ): (self: TSet.TSet<A>) => STM.STM<never, never, Array<A>>
  <A>(self: TSet.TSet<A>, predicate: Predicate<A>, options: {
    readonly discard: true
  }): STM.STM<never, never, void>
  <A>(
    self: TSet.TSet<A>,
    predicate: Predicate<A>,
    options?: {
      readonly discard: false
    }
  ): STM.STM<never, never, Array<A>>
} = dual((args) => isTSet(args[0]), (self, predicate, options) =>
  options?.discard === true ?
    tMap.retainIf(self.tMap, (key) => predicate(key), { discard: true }) :
    pipe(
      tMap.retainIf(self.tMap, (key) => predicate(key)),
      core.map(RA.map((entry) => entry[0]))
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
export const toChunk = <A>(self: TSet.TSet<A>): STM.STM<never, never, Chunk.Chunk<A>> =>
  tMap.keys(self.tMap).pipe(STM.map(Chunk.unsafeFromArray))

/** @internal */
export const toHashSet = <A>(self: TSet.TSet<A>): STM.STM<never, never, HashSet.HashSet<A>> =>
  reduce(
    self,
    HashSet.empty<A>(),
    (acc, value) => pipe(acc, HashSet.add(value))
  )

/** @internal */
export const toArray = <A>(self: TSet.TSet<A>): STM.STM<never, never, Array<A>> =>
  reduce<Array<A>, A>(
    self,
    [],
    (acc, value) => [...acc, value]
  )

/** @internal */
export const toReadonlySet = <A>(self: TSet.TSet<A>): STM.STM<never, never, ReadonlySet<A>> =>
  core.map(toArray(self), (values) => new Set(values))

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
