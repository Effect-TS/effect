// ets_tracing: off

import "../../../Operator/index.js"

import type { Either } from "../../../Either/index.js"
import type { Predicate, Refinement } from "../../../Function/index.js"
import * as O from "../../../Option/index.js"
import type { MutableRecord } from "../../../Support/Mutable/index.js"
import type { PredicateWithIndex, RefinementWithIndex } from "../../../Utils/index.js"
import * as A from "../Array/index.js"
import * as Tp from "../Tuple/index.js"

/* adapted from https://github.com/gcanti/fp-ts */

export type Dictionary<T> = {
  readonly [P in string]: T
}

/**
 * Build a readonly record from a mutable version
 */
export function fromMutable<A>(r: MutableRecord<string, A>): Dictionary<A> {
  return Object.assign({}, r)
}

/**
 * Converts the record to a mutable version
 */
export function toMutable<A>(r: Dictionary<A>): MutableRecord<string, A> {
  return Object.assign({}, r)
}

/**
 * Calculate the number of key/value pairs in a record
 */
export function size(r: Dictionary<unknown>): number {
  return Object.keys(r).length
}

/**
 * Test whether a record is empty
 */
export function isEmpty(r: Dictionary<unknown>): boolean {
  return Object.keys(r).length === 0
}

/**
 * Extract record keys
 */
export function keys(r: Dictionary<unknown>): ReadonlyArray<string> {
  return Object.keys(r).sort() as any
}

/**
 * Extract record values
 */
export function values<V>(r: Dictionary<V>): ReadonlyArray<V> {
  return Object.keys(r)
    .sort()
    .map((s) => r[s]!)
}

/**
 * Map a record into an array
 */
export function collect<A, B>(
  f: (k: string, a: A) => B
): (r: Dictionary<A>) => ReadonlyArray<B> {
  return (r) => collect_(r, f)
}

/**
 * Map a record into an array
 */
export function collect_<A, B>(
  r: Dictionary<A>,
  f: (k: string, a: A) => B
): ReadonlyArray<B> {
  const out: Array<B> = []
  for (const key of keys(r)) {
    out.push(f(key, r[key]!))
  }
  return out
}

/**
 * Insert or replace a key/value pair in a record
 */
export function insertAt<A>(k: string, a: A): (r: Dictionary<A>) => Dictionary<A> {
  return (r) => insertAt_(r, k, a)
}

/**
 * Insert or replace a key/value pair in a record
 */
export function insertAt_<A>(r: Dictionary<A>, k: string, a: A): Dictionary<A> {
  if (r[k] === a) {
    return r
  }
  const out: MutableRecord<string, A> = Object.assign({}, r)
  out[k] = a
  return out
}

/**
 * Check if k is a key
 */
export function hasOwnProperty(r: Dictionary<unknown>, k: string): boolean {
  return Object.prototype.hasOwnProperty.call(r, k)
}

/**
 * Delete a key
 */
export function deleteAt(k: string): <A>(r: Dictionary<A>) => Dictionary<A> {
  return <A>(r: Dictionary<A>) => deleteAt_(r, k)
}

/**
 * Delete a key
 */
export function deleteAt_<A>(r: Dictionary<A>, k: string): Dictionary<A> {
  if (!Object.prototype.hasOwnProperty.call(r, k)) {
    return r
  }
  const out: MutableRecord<string, A> = Object.assign({}, r)
  delete out[k]
  return out
}

/**
 * Update a key value pair
 */
export function updateAt<A>(
  k: string,
  a: A
): (r: Dictionary<A>) => O.Option<Dictionary<A>> {
  return (r: Dictionary<A>) => updateAt_(r, k, a)
}

/**
 * Update a key value pair
 */
export function updateAt_<A>(
  r: Dictionary<A>,
  k: string,
  a: A
): O.Option<Dictionary<A>> {
  if (!hasOwnProperty(r, k)) {
    return O.none
  }
  if (r[k] === a) {
    return O.some(r)
  }
  const out: MutableRecord<string, A> = Object.assign({}, r)
  out[k] = a
  return O.some(out)
}

/**
 * Modify the value at key k with f
 */
export function modifyAt<A>(
  k: string,
  f: (a: A) => A
): (r: Dictionary<A>) => O.Option<Dictionary<A>> {
  return (r: Dictionary<A>) => modifyAt_(r, k, f)
}

/**
 * Modify the value at key k with f
 */
export function modifyAt_<A>(
  r: Dictionary<A>,
  k: string,
  f: (a: A) => A
): O.Option<Dictionary<A>> {
  if (!hasOwnProperty(r, k)) {
    return O.none
  }
  const out: MutableRecord<string, A> = Object.assign({}, r)
  out[k] = f(r[k]!)
  return O.some(out)
}

/**
 * Delete a key and value from a map, returning the value as well as the subsequent map
 */
export function pop(
  k: string
): <A>(r: Dictionary<A>) => O.Option<Tp.Tuple<[A, Dictionary<A>]>> {
  return (r) => pop_(r, k)
}

/**
 * Delete a key and value from a map, returning the value as well as the subsequent map
 */
export function pop_<A>(
  r: Dictionary<A>,
  k: string
): O.Option<Tp.Tuple<[A, Dictionary<A>]>> {
  const deleteAtk = deleteAt(k)
  const oa = lookup_(r, k)
  return O.isNone(oa) ? O.none : O.some(Tp.tuple(oa.value, deleteAtk(r)))
}

/**
 * Lookup the value for a key in a record
 */
export function lookup_<A>(r: Dictionary<A>, k: string): O.Option<A> {
  return Object.prototype.hasOwnProperty.call(r, k) ? O.some(r[k]!) : O.none
}

/**
 * Lookup the value for a key in a record
 */
export function lookup(k: string): <A>(r: Dictionary<A>) => O.Option<A> {
  return (r) => (Object.prototype.hasOwnProperty.call(r, k) ? O.some(r[k]!) : O.none)
}

/**
 * Empty record
 */
export const empty: Dictionary<never> = {}

/**
 * Map a record passing the keys to the iterating function
 */
export function mapWithIndex<A, B>(
  f: (k: string, a: A) => B
): (fa: Dictionary<A>) => Dictionary<B> {
  return (fa) => mapWithIndex_(fa, f)
}

/**
 * Map a record passing the keys to the iterating function
 */
export function mapWithIndex_<A, B>(
  fa: Dictionary<A>,
  f: (k: string, a: A) => B
): Dictionary<B> {
  const out: MutableRecord<string, B> = {}
  const keys = Object.keys(fa)
  for (const key of keys) {
    out[key] = f(key, fa[key]!)
  }
  return out
}

/**
 * Map a record passing the values to the iterating function
 */
export function map<A, B>(f: (a: A) => B): (fa: Dictionary<A>) => Dictionary<B> {
  return (fa) => map_(fa, f)
}

/**
 * Map a record passing the values to the iterating function
 */
export function map_<A, B>(fa: Dictionary<A>, f: (a: A) => B): Dictionary<B> {
  return mapWithIndex_(fa, (_, a) => f(a))
}

/**
 * Reduce the record passing the index toghether with the value to f
 */
export function reduceWithIndex<A, B>(
  b: B,
  f: (k: string, b: B, a: A) => B
): (fa: Dictionary<A>) => B {
  return (fa) => reduceWithIndex_(fa, b, f)
}

/**
 * Reduce the record passing the index toghether with the value to f
 */
export function reduceWithIndex_<A, B>(
  fa: Dictionary<A>,
  b: B,
  f: (k: string, b: B, a: A) => B
): B {
  let out = b
  const keys = Object.keys(fa).sort()
  const len = keys.length
  for (let i = 0; i < len; i++) {
    const k = keys[i]!
    out = f(k, out, fa[k]!)
  }
  return out
}

/**
 * Reduce the record passing the index toghether with the value to f
 *
 * Inverted order
 */
export function reduceRightWithIndex<A, B>(
  b: B,
  f: (k: string, a: A, b: B) => B
): (fa: Dictionary<A>) => B {
  return (fa) => reduceRightWithIndex_(fa, b, f)
}

/**
 * Reduce the record passing the index toghether with the value to f
 *
 * Inverted order
 */
export function reduceRightWithIndex_<A, B>(
  fa: Dictionary<A>,
  b: B,
  f: (k: string, a: A, b: B) => B
): B {
  let out = b
  const keys = Object.keys(fa).sort()
  const len = keys.length
  for (let i = len - 1; i >= 0; i--) {
    const k = keys[i]!
    out = f(k, fa[k]!, out)
  }
  return out
}

/**
 * Create a record with one key/value pair
 */
export function singleton<A>(k: string, a: A): Dictionary<A> {
  return { [k]: a }
}

/**
 * Partition a record using f that also consumes the entry key
 */
export function partitionMapWithIndex<A, B, C>(
  f: (key: string, a: A) => Either<B, C>
): (fa: Dictionary<A>) => Tp.Tuple<[Dictionary<B>, Dictionary<C>]> {
  return (fa) => partitionMapWithIndex_(fa, f)
}

/**
 * Partition a record using f that also consumes the entry key
 */
export function partitionMapWithIndex_<A, B, C>(
  fa: Dictionary<A>,
  f: (key: string, a: A) => Either<B, C>
): Tp.Tuple<[Dictionary<B>, Dictionary<C>]> {
  const left: MutableRecord<string, B> = {}
  const right: MutableRecord<string, C> = {}
  const keys = Object.keys(fa)
  for (const key of keys) {
    const e = f(key, fa[key]!)
    switch (e._tag) {
      case "Left":
        left[key] = e.left
        break
      case "Right":
        right[key] = e.right
        break
    }
  }
  return Tp.tuple(left, right)
}

/**
 * Partition a record using a predicate that also consumes the entry key
 */
export function partitionWithIndex<A, B extends A>(
  refinementWithIndex: RefinementWithIndex<string, A, B>
): (fa: Dictionary<A>) => Tp.Tuple<[Dictionary<A>, Dictionary<B>]>
export function partitionWithIndex<A>(
  predicateWithIndex: PredicateWithIndex<string, A>
): (fa: Dictionary<A>) => Tp.Tuple<[Dictionary<A>, Dictionary<A>]>
export function partitionWithIndex<A>(
  predicateWithIndex: PredicateWithIndex<string, A>
): (fa: Dictionary<A>) => Tp.Tuple<[Dictionary<A>, Dictionary<A>]> {
  return (fa) => partitionWithIndex_(fa, predicateWithIndex)
}

/**
 * Partition a record using a predicate that also consumes the entry key
 */
export function partitionWithIndex_<A, B extends A>(
  fa: Dictionary<A>,
  refinementWithIndex: RefinementWithIndex<string, A, B>
): Tp.Tuple<[Dictionary<A>, Dictionary<B>]>
export function partitionWithIndex_<A>(
  fa: Dictionary<A>,
  predicateWithIndex: PredicateWithIndex<string, A>
): Tp.Tuple<[Dictionary<A>, Dictionary<A>]>
export function partitionWithIndex_<A>(
  fa: Dictionary<A>,
  predicateWithIndex: PredicateWithIndex<string, A>
): Tp.Tuple<[Dictionary<A>, Dictionary<A>]> {
  const left: MutableRecord<string, A> = {}
  const right: MutableRecord<string, A> = {}
  const keys = Object.keys(fa)
  for (const key of keys) {
    const a = fa[key]!
    if (predicateWithIndex(key, a)) {
      right[key] = a
    } else {
      left[key] = a
    }
  }
  return Tp.tuple(left, right)
}

/**
 * Filter & map the record entries with f that consumes also the entry index
 */
export function filterMapWithIndex<A, B>(
  f: (key: string, a: A) => O.Option<B>
): (fa: Dictionary<A>) => Dictionary<B>
export function filterMapWithIndex<A, B>(
  f: (key: string, a: A) => O.Option<B>
): (fa: Dictionary<A>) => Dictionary<B> {
  return (fa) => filterMapWithIndex_(fa, f)
}

/**
 * Filter & map the record entries with f that consumes also the entry index
 */
export function filterMapWithIndex_<A, B>(
  fa: Dictionary<A>,
  f: (key: string, a: A) => O.Option<B>
): Dictionary<B> {
  const r: MutableRecord<string, B> = {}
  const keys = Object.keys(fa)
  for (const key of keys) {
    const optionB = f(key, fa[key]!)
    if (O.isSome(optionB)) {
      r[key] = optionB.value
    }
  }
  return r
}

/**
 * Filter the record entries with f that consumes also the entry index
 */
export function filterWithIndex<A, B extends A>(
  refinementWithIndex: RefinementWithIndex<string, A, B>
): (fa: Dictionary<A>) => Dictionary<B>
export function filterWithIndex<A>(
  predicateWithIndex: PredicateWithIndex<string, A>
): (fa: Dictionary<A>) => Dictionary<A>
export function filterWithIndex<A>(
  predicateWithIndex: PredicateWithIndex<string, A>
): (fa: Dictionary<A>) => Dictionary<A> {
  return (fa) => filterWithIndex_(fa, predicateWithIndex)
}

/**
 * Filter the record entries with f that consumes also the entry index
 */
export function filterWithIndex_<A, B extends A>(
  fa: Dictionary<A>,
  refinementWithIndex: RefinementWithIndex<string, A, B>
): Dictionary<B>
export function filterWithIndex_<A>(
  fa: Dictionary<A>,
  predicateWithIndex: PredicateWithIndex<string, A>
): Dictionary<A>
export function filterWithIndex_<A>(
  fa: Dictionary<A>,
  predicateWithIndex: PredicateWithIndex<string, A>
): Dictionary<A> {
  const out: MutableRecord<string, A> = {}
  let changed = false
  for (const key in fa) {
    if (Object.prototype.hasOwnProperty.call(fa, key)) {
      const a = fa[key]!
      if (predicateWithIndex(key, a)) {
        out[key] = a
      } else {
        changed = true
      }
    }
  }
  return changed ? out : fa
}

/**
 * Checks a predicate against all the record entries
 */
export function every<A>(predicate: Predicate<A>): (r: Dictionary<A>) => boolean {
  return (r) => every_(r, predicate)
}

/**
 * Checks a predicate against all the record entries
 */
export function every_<A>(r: Dictionary<A>, predicate: Predicate<A>): boolean {
  for (const k in r) {
    if (!predicate(r[k]!)) {
      return false
    }
  }
  return true
}

/**
 * Checks a predicate against some of the record entries
 */
export function some<A>(predicate: (a: A) => boolean): (r: Dictionary<A>) => boolean {
  return (r) => some_(r, predicate)
}

/**
 * Checks a predicate against some of the record entries
 */
export function some_<A>(r: Dictionary<A>, predicate: (a: A) => boolean): boolean {
  for (const k in r) {
    if (predicate(r[k]!)) {
      return true
    }
  }
  return false
}

/**
 * Drop the None entries
 */
export const compact = <A>(fa: Dictionary<O.Option<A>>): Dictionary<A> => {
  const r: MutableRecord<string, A> = {}
  const keys = Object.keys(fa)
  for (const key of keys) {
    const optionA = fa[key]!
    if (O.isSome(optionA)) {
      r[key] = optionA.value
    }
  }
  return r
}

/**
 * Separate the record entries
 */
export const separate = <A, B>(
  fa: Dictionary<Either<A, B>>
): Tp.Tuple<[Dictionary<A>, Dictionary<B>]> => {
  const left: MutableRecord<string, A> = {}
  const right: MutableRecord<string, B> = {}
  const keys = Object.keys(fa)
  for (const key of keys) {
    const e = fa[key]!
    switch (e._tag) {
      case "Left":
        left[key] = e.left
        break
      case "Right":
        right[key] = e.right
        break
    }
  }
  return Tp.tuple(left, right)
}

/**
 * Filter record entries according to a predicate
 */
export const filter: {
  <A, B extends A>(refinement: Refinement<A, B>): (fa: Dictionary<A>) => Dictionary<B>
  <A>(predicate: Predicate<A>): (fa: Dictionary<A>) => Dictionary<A>
} =
  <A>(predicate: Predicate<A>) =>
  (fa: Dictionary<A>): Dictionary<A> =>
    filter_(fa, predicate)

/**
 * Filter record entries according to a predicate
 */
export const filter_: {
  <A, B extends A>(fa: Dictionary<A>, refinement: Refinement<A, B>): Dictionary<B>
  <A>(fa: Dictionary<A>, predicate: Predicate<A>): Dictionary<A>
} = <A>(fa: Dictionary<A>, predicate: Predicate<A>): Dictionary<A> =>
  filterWithIndex_(fa, (_, a) => predicate(a))

/**
 * Filter & map record entries according to a predicate
 */
export const filterMap =
  <A, B>(f: (a: A) => O.Option<B>) =>
  (fa: Dictionary<A>) =>
    filterMap_(fa, f)

/**
 * Filter & map record entries according to a predicate
 */
export const filterMap_ = <A, B>(fa: Dictionary<A>, f: (a: A) => O.Option<B>) =>
  filterMapWithIndex_(fa, (_, a: A) => f(a))

/**
 * Partition record entries according to a predicate
 */
export const partition: {
  <A, B extends A>(refinement: Refinement<A, B>): (
    fa: Dictionary<A>
  ) => Tp.Tuple<[Dictionary<A>, Dictionary<B>]>
  <A>(predicate: Predicate<A>): <K extends string>(
    fa: Dictionary<A>
  ) => Tp.Tuple<[Dictionary<A>, Dictionary<A>]>
} =
  <A>(predicate: Predicate<A>) =>
  (fa: Dictionary<A>): Tp.Tuple<[Dictionary<A>, Dictionary<A>]> =>
    partition_(fa, predicate)

/**
 * Partition record entries according to a predicate
 */
export const partition_: {
  <A, B extends A>(fa: Dictionary<A>, refinement: Refinement<A, B>): Tp.Tuple<
    [Dictionary<A>, Dictionary<B>]
  >
  <A>(fa: Dictionary<A>, predicate: Predicate<A>): Tp.Tuple<
    [Dictionary<A>, Dictionary<A>]
  >
} = <A>(
  fa: Dictionary<A>,
  predicate: Predicate<A>
): Tp.Tuple<[Dictionary<A>, Dictionary<A>]> =>
  partitionWithIndex_(fa, (_, a) => predicate(a))

/**
 * Partition & map record entries
 */
export const partitionMap: {
  <A, B, C>(f: (a: A) => Either<B, C>): (
    fa: Dictionary<A>
  ) => Tp.Tuple<[Dictionary<B>, Dictionary<C>]>
  <A, B, C>(f: (a: A) => Either<B, C>): (
    fa: Dictionary<A>
  ) => Tp.Tuple<[Dictionary<B>, Dictionary<C>]>
} =
  <A, B, C>(f: (a: A) => Either<B, C>) =>
  (fa: Dictionary<A>) =>
    partitionMap_(fa, f)

/**
 * Partition & map record entries
 */
export const partitionMap_ = <A, B, C>(fa: Dictionary<A>, f: (a: A) => Either<B, C>) =>
  partitionMapWithIndex_(fa, (_, a: A) => f(a))

/**
 * Reduce record entries
 */
export const reduce: <A, B>(b: B, f: (b: B, a: A) => B) => (fa: Dictionary<A>) => B =
  (b, f) => (fa) =>
    reduce_(fa, b, f)

/**
 * Reduce record entries
 */
export const reduce_: <A, B>(fa: Dictionary<A>, b: B, f: (b: B, a: A) => B) => B = (
  fa,
  b,
  f
) => reduceWithIndex_(fa, b, (_, b, a) => f(b, a))

/**
 * Reduce record entries in inverted order
 */
export const reduceRight: <A, B>(
  b: B,
  f: (a: A, b: B) => B
) => (fa: Dictionary<A>) => B = (b, f) => (fa) => reduceRight_(fa, b, f)

/**
 * Reduce record entries in inverted order
 */
export const reduceRight_: <A, B>(
  fa: Readonly<MutableRecord<string, A>>,
  b: B,
  f: (a: A, b: B) => B
) => B = (fa, b, f) => reduceRightWithIndex_(fa, b, (_, a, b) => f(a, b))

/**
 * Converts a record into an array of [key, value]
 */
export const toArray: <A>(r: Dictionary<A>) => ReadonlyArray<Tp.Tuple<[string, A]>> =
  collect(Tp.tuple)

/**
 * Converts an array of [key, value] into a record
 */
export const fromArray = <V>(_: ReadonlyArray<Tp.Tuple<[string, V]>>): Dictionary<V> =>
  A.reduce_(_, {} as Dictionary<V>, (b, { tuple: [k, v] }) =>
    Object.assign(b, { [k]: v })
  )
