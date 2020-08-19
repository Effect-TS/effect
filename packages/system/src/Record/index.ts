/* adapted from https://github.com/gcanti/fp-ts */

import type { Either } from "../Either"
import { Predicate, Refinement } from "../Function"
import { MutableRecord } from "../Mutable"
import { isNone, isSome, none, Option, some as some_1 } from "../Option"
import { PredicateWithIndex, RefinementWithIndex, Separated } from "../Utils"

export type Record<K extends string, T> = Readonly<MutableRecord<K, T>>

export function fromMutable<K extends string, A>(r: MutableRecord<K, A>): Record<K, A> {
  return Object.assign({}, r)
}

export function toMutable<K extends string, A>(r: Record<K, A>): MutableRecord<K, A> {
  return Object.assign({}, r)
}

/**
 * Calculate the number of key/value pairs in a record
 */
export function size(r: Record<string, unknown>): number {
  return Object.keys(r).length
}

/**
 * Test whether a record is empty
 */
export function isEmpty(r: Record<string, unknown>): boolean {
  return Object.keys(r).length === 0
}

export function keys<K extends string>(r: Record<K, unknown>): ReadonlyArray<K> {
  return (Object.keys(r) as any).sort()
}

/**
 * Map a record into an array
 *
 * @example
 * import {collect} from '@matechs/core/MutableRecord'
 *
 * const x: { a: string, b: boolean } = { a: 'foo', b: false }
 * assert.deepStrictEqual(
 *   collect((key, val) => ({key: key, value: val}))(x),
 *   [{key: 'a', value: 'foo'}, {key: 'b', value: false}]
 * )
 */
export function collect<K extends string, A, B>(
  f: (k: K, a: A) => B
): (r: Record<K, A>) => ReadonlyArray<B> {
  return (r) => {
    const out: Array<B> = []
    for (const key of keys(r)) {
      out.push(f(key, r[key]))
    }
    return out
  }
}

export function collect_<K extends string, A, B>(
  r: Record<K, A>,
  f: (k: K, a: A) => B
): ReadonlyArray<B> {
  const out: Array<B> = []
  for (const key of keys(r)) {
    out.push(f(key, r[key]))
  }
  return out
}

/**
 * Insert or replace a key/value pair in a record
 */
export function insertAt<K extends string, A>(
  k: K,
  a: A
): <KS extends string>(r: Record<KS, A>) => Record<KS | K, A>
export function insertAt<A>(
  k: string,
  a: A
): (r: Record<string, A>) => Record<string, A> {
  return (r) => {
    if (r[k] === a) {
      return r
    }
    const out: MutableRecord<string, A> = Object.assign({}, r)
    out[k] = a
    return out
  }
}

export function insertAt_<KS extends string, K extends string, A>(
  r: Record<KS, A>,
  k: K,
  a: A
): Record<KS | K, A>
export function insertAt_<A>(r: Record<string, A>, k: string, a: A): Record<string, A> {
  if (r[k] === a) {
    return r
  }
  const out: MutableRecord<string, A> = Object.assign({}, r)
  out[k] = a
  return out
}

export function hasOwnProperty<K extends string>(
  k: string,
  r: Record<K, unknown>
): k is K {
  return Object.prototype.hasOwnProperty.call(r, k)
}

/**
 * Delete a key and value from a map
 */
export function deleteAt<K extends string>(
  k: K
): <KS extends string, A>(
  r: Record<KS, A>
) => Record<string extends K ? string : Exclude<KS, K>, A>
export function deleteAt(k: string): <A>(r: Record<string, A>) => Record<string, A> {
  return <A>(r: Record<string, A>) => {
    if (!Object.prototype.hasOwnProperty.call(r, k)) {
      return r
    }
    const out: MutableRecord<string, A> = Object.assign({}, r)
    delete out[k]
    return out
  }
}

export function deleteAt_<KS extends string, A, K extends string>(
  r: Record<KS, A>,
  k: K
): Record<string extends K ? string : Exclude<KS, K>, A>
export function deleteAt_<A>(r: Record<string, A>, k: string): Record<string, A> {
  if (!Object.prototype.hasOwnProperty.call(r, k)) {
    return r
  }
  const out: MutableRecord<string, A> = Object.assign({}, r)
  delete out[k]
  return out
}

export function updateAt<A>(
  k: string,
  a: A
): <K extends string>(r: Record<K, A>) => Option<Record<K, A>> {
  return <K extends string>(r: Record<K, A>) => {
    if (!hasOwnProperty(k, r)) {
      return none
    }
    if (r[k] === a) {
      return some_1(r)
    }
    const out: MutableRecord<K, A> = Object.assign({}, r)
    out[k] = a
    return some_1(out)
  }
}

export function updateAt_<K extends string, A>(
  r: Record<K, A>,
  k: string,
  a: A
): Option<Record<K, A>> {
  if (!hasOwnProperty(k, r)) {
    return none
  }
  if (r[k] === a) {
    return some_1(r)
  }
  const out: MutableRecord<K, A> = Object.assign({}, r)
  out[k] = a
  return some_1(out)
}

export function modifyAt<A>(
  k: string,
  f: (a: A) => A
): <K extends string>(r: Record<K, A>) => Option<Record<K, A>> {
  return <K extends string>(r: Record<K, A>) => {
    if (!hasOwnProperty(k, r)) {
      return none
    }
    const out: MutableRecord<K, A> = Object.assign({}, r)
    out[k] = f(r[k])
    return some_1(out)
  }
}

export function modifyAt_<K extends string, A>(
  r: Record<K, A>,
  k: string,
  f: (a: A) => A
): Option<Record<K, A>> {
  if (!hasOwnProperty(k, r)) {
    return none
  }
  const out: MutableRecord<K, A> = Object.assign({}, r)
  out[k] = f(r[k])
  return some_1(out)
}

/**
 * Delete a key and value from a map, returning the value as well as the subsequent map
 */
export function pop<K extends string>(
  k: K
): <KS extends string, A>(
  r: Record<KS, A>
) => Option<readonly [A, Record<string extends K ? string : Exclude<KS, K>, A>]>
export function pop(
  k: string
): <A>(r: Record<string, A>) => Option<readonly [A, Record<string, A>]> {
  const deleteAtk = deleteAt(k)
  return (r) => {
    const oa = lookup_(r, k)
    return isNone(oa) ? none : some_1([oa.value, deleteAtk(r)])
  }
}

export function pop_<KS extends string, A, K extends string>(
  r: Record<KS, A>,
  k: K
): Option<readonly [A, Record<string extends K ? string : Exclude<KS, K>, A>]>
export function pop_<A>(
  r: Record<string, A>,
  k: string
): Option<readonly [A, Record<string, A>]> {
  const deleteAtk = deleteAt(k)
  const oa = lookup_(r, k)
  return isNone(oa) ? none : some_1([oa.value, deleteAtk(r)])
}

/**
 * Lookup the value for a key in a record
 */
export function lookup_<A>(r: Record<string, A>, k: string): Option<A> {
  return Object.prototype.hasOwnProperty.call(r, k) ? some_1(r[k]) : none
}

export function lookup(k: string): <A>(r: Record<string, A>) => Option<A> {
  return (r) => (Object.prototype.hasOwnProperty.call(r, k) ? some_1(r[k]) : none)
}

export const empty: Record<string, never> = {}

/**
 * Map a record passing the keys to the iterating function
 */
export function mapWithIndex<K extends string, A, B>(
  f: (k: K, a: A) => B
): (fa: Record<K, A>) => Record<K, B>
export function mapWithIndex<A, B>(
  f: (k: string, a: A) => B
): (fa: Record<string, A>) => Record<string, B> {
  return (fa) => {
    const out: MutableRecord<string, B> = {}
    const keys = Object.keys(fa)
    for (const key of keys) {
      out[key] = f(key, fa[key])
    }
    return out
  }
}

export function mapWithIndex_<K extends string, A, B>(
  fa: Record<K, A>,
  f: (k: K, a: A) => B
): Record<K, B>
export function mapWithIndex_<A, B>(
  fa: Record<string, A>,
  f: (k: string, a: A) => B
): Record<string, B> {
  const out: MutableRecord<string, B> = {}
  const keys = Object.keys(fa)
  for (const key of keys) {
    out[key] = f(key, fa[key])
  }
  return out
}

/**
 * Map a record passing the values to the iterating function
 */
export function map<A, B>(
  f: (a: A) => B
): <K extends string>(fa: Record<K, A>) => Record<K, B>
export function map<A, B>(
  f: (a: A) => B
): (fa: Record<string, A>) => Record<string, B> {
  return mapWithIndex((_, a) => f(a))
}

export function map_<K extends string, A, B>(
  fa: Record<K, A>,
  f: (a: A) => B
): Record<K, B>
export function map_<A, B>(fa: Record<string, A>, f: (a: A) => B): Record<string, B> {
  return mapWithIndex_(fa, (_, a) => f(a))
}

export function reduceWithIndex<K extends string, A, B>(
  b: B,
  f: (k: K, b: B, a: A) => B
): (fa: Record<K, A>) => B
export function reduceWithIndex<A, B>(
  b: B,
  f: (k: string, b: B, a: A) => B
): (fa: Record<string, A>) => B {
  return (fa) => {
    let out = b
    const keys = Object.keys(fa).sort()
    const len = keys.length
    for (let i = 0; i < len; i++) {
      const k = keys[i]
      out = f(k, out, fa[k])
    }
    return out
  }
}

export function reduceWithIndex_<K extends string, A, B>(
  fa: Record<K, A>,
  b: B,
  f: (k: K, b: B, a: A) => B
): B
export function reduceWithIndex_<A, B>(
  fa: Record<string, A>,
  b: B,
  f: (k: string, b: B, a: A) => B
): B {
  let out = b
  const keys = Object.keys(fa).sort()
  const len = keys.length
  for (let i = 0; i < len; i++) {
    const k = keys[i]
    out = f(k, out, fa[k])
  }
  return out
}

export function reduceRightWithIndex<K extends string, A, B>(
  b: B,
  f: (k: K, a: A, b: B) => B
): (fa: Record<K, A>) => B
export function reduceRightWithIndex<A, B>(
  b: B,
  f: (k: string, a: A, b: B) => B
): (fa: Record<string, A>) => B {
  return (fa) => {
    let out = b
    const keys = Object.keys(fa).sort()
    const len = keys.length
    for (let i = len - 1; i >= 0; i--) {
      const k = keys[i]
      out = f(k, fa[k], out)
    }
    return out
  }
}

export function reduceRightWithIndex_<K extends string, A, B>(
  fa: Record<K, A>,
  b: B,
  f: (k: K, a: A, b: B) => B
): B
export function reduceRightWithIndex_<A, B>(
  fa: Record<string, A>,
  b: B,
  f: (k: string, a: A, b: B) => B
): B {
  let out = b
  const keys = Object.keys(fa).sort()
  const len = keys.length
  for (let i = len - 1; i >= 0; i--) {
    const k = keys[i]
    out = f(k, fa[k], out)
  }
  return out
}

/**
 * Create a record with one key/value pair
 */
export function singleton<K extends string, A>(k: K, a: A): Record<K, A> {
  return { [k]: a } as any
}

export function partitionMapWithIndex<K extends string, A, B, C>(
  f: (key: K, a: A) => Either<B, C>
): (fa: Record<K, A>) => Separated<Record<string, B>, Record<string, C>>
export function partitionMapWithIndex<A, B, C>(
  f: (key: string, a: A) => Either<B, C>
): (fa: Record<string, A>) => Separated<Record<string, B>, Record<string, C>> {
  return (fa) => {
    const left: MutableRecord<string, B> = {}
    const right: MutableRecord<string, C> = {}
    const keys = Object.keys(fa)
    for (const key of keys) {
      const e = f(key, fa[key])
      switch (e._tag) {
        case "Left":
          left[key] = e.left
          break
        case "Right":
          right[key] = e.right
          break
      }
    }
    return {
      left,
      right
    }
  }
}

export function partitionMapWithIndex_<K extends string, A, B, C>(
  fa: Record<K, A>,
  f: (key: K, a: A) => Either<B, C>
): Separated<Record<string, B>, Record<string, C>>
export function partitionMapWithIndex_<A, B, C>(
  fa: Record<string, A>,
  f: (key: string, a: A) => Either<B, C>
): Separated<Record<string, B>, Record<string, C>> {
  const left: MutableRecord<string, B> = {}
  const right: MutableRecord<string, C> = {}
  const keys = Object.keys(fa)
  for (const key of keys) {
    const e = f(key, fa[key])
    switch (e._tag) {
      case "Left":
        left[key] = e.left
        break
      case "Right":
        right[key] = e.right
        break
    }
  }
  return {
    left,
    right
  }
}

export function partitionWithIndex<K extends string, A, B extends A>(
  refinementWithIndex: RefinementWithIndex<K, A, B>
): (fa: Record<K, A>) => Separated<Record<string, A>, Record<string, B>>
export function partitionWithIndex<K extends string, A>(
  predicateWithIndex: PredicateWithIndex<K, A>
): (fa: Record<K, A>) => Separated<Record<string, A>, Record<string, A>>
export function partitionWithIndex<A>(
  predicateWithIndex: PredicateWithIndex<string, A>
): (fa: Record<string, A>) => Separated<Record<string, A>, Record<string, A>> {
  return (fa) => {
    const left: MutableRecord<string, A> = {}
    const right: MutableRecord<string, A> = {}
    const keys = Object.keys(fa)
    for (const key of keys) {
      const a = fa[key]
      if (predicateWithIndex(key, a)) {
        right[key] = a
      } else {
        left[key] = a
      }
    }
    return {
      left,
      right
    }
  }
}

export function partitionWithIndex_<K extends string, A, B extends A>(
  fa: Record<K, A>,
  refinementWithIndex: RefinementWithIndex<K, A, B>
): Separated<Record<string, A>, Record<string, B>>
export function partitionWithIndex_<K extends string, A>(
  fa: Record<K, A>,
  predicateWithIndex: PredicateWithIndex<K, A>
): Separated<Record<string, A>, Record<string, A>>
export function partitionWithIndex_<A>(
  fa: Record<string, A>,
  predicateWithIndex: PredicateWithIndex<string, A>
): Separated<Record<string, A>, Record<string, A>> {
  const left: MutableRecord<string, A> = {}
  const right: MutableRecord<string, A> = {}
  const keys = Object.keys(fa)
  for (const key of keys) {
    const a = fa[key]
    if (predicateWithIndex(key, a)) {
      right[key] = a
    } else {
      left[key] = a
    }
  }
  return {
    left,
    right
  }
}

export function filterMapWithIndex<K extends string, A, B>(
  f: (key: K, a: A) => Option<B>
): (fa: Record<K, A>) => Record<string, B>
export function filterMapWithIndex<A, B>(
  f: (key: string, a: A) => Option<B>
): (fa: Record<string, A>) => Record<string, B> {
  return (fa) => {
    const r: MutableRecord<string, B> = {}
    const keys = Object.keys(fa)
    for (const key of keys) {
      const optionB = f(key, fa[key])
      if (isSome(optionB)) {
        r[key] = optionB.value
      }
    }
    return r
  }
}

export function filterMapWithIndex_<K extends string, A, B>(
  fa: Record<K, A>,
  f: (key: K, a: A) => Option<B>
): Record<string, B>
export function filterMapWithIndex_<A, B>(
  fa: Record<string, A>,
  f: (key: string, a: A) => Option<B>
): Record<string, B> {
  const r: MutableRecord<string, B> = {}
  const keys = Object.keys(fa)
  for (const key of keys) {
    const optionB = f(key, fa[key])
    if (isSome(optionB)) {
      r[key] = optionB.value
    }
  }
  return r
}

export function filterWithIndex<K extends string, A, B extends A>(
  refinementWithIndex: RefinementWithIndex<K, A, B>
): (fa: Record<K, A>) => Record<string, B>
export function filterWithIndex<K extends string, A>(
  predicateWithIndex: PredicateWithIndex<K, A>
): (fa: Record<K, A>) => Record<string, A>
export function filterWithIndex<A>(
  predicateWithIndex: PredicateWithIndex<string, A>
): (fa: Record<string, A>) => Record<string, A> {
  return (fa) => {
    const out: MutableRecord<string, A> = {}
    let changed = false
    for (const key in fa) {
      if (Object.prototype.hasOwnProperty.call(fa, key)) {
        const a = fa[key]
        if (predicateWithIndex(key, a)) {
          out[key] = a
        } else {
          changed = true
        }
      }
    }
    return changed ? out : fa
  }
}

export function filterWithIndex_<K extends string, A, B extends A>(
  fa: Record<K, A>,
  refinementWithIndex: RefinementWithIndex<K, A, B>
): Record<string, B>
export function filterWithIndex_<K extends string, A>(
  fa: Record<K, A>,
  predicateWithIndex: PredicateWithIndex<K, A>
): Record<string, A>
export function filterWithIndex_<A>(
  fa: Record<string, A>,
  predicateWithIndex: PredicateWithIndex<string, A>
): Record<string, A> {
  const out: MutableRecord<string, A> = {}
  let changed = false
  for (const key in fa) {
    if (Object.prototype.hasOwnProperty.call(fa, key)) {
      const a = fa[key]
      if (predicateWithIndex(key, a)) {
        out[key] = a
      } else {
        changed = true
      }
    }
  }
  return changed ? out : fa
}

export function every<A>(predicate: Predicate<A>): (r: Record<string, A>) => boolean {
  return (r) => {
    for (const k in r) {
      if (!predicate(r[k])) {
        return false
      }
    }
    return true
  }
}

export function every_<A>(r: Record<string, A>, predicate: Predicate<A>): boolean {
  for (const k in r) {
    if (!predicate(r[k])) {
      return false
    }
  }
  return true
}

export function some<A>(
  predicate: (a: A) => boolean
): (r: Record<string, A>) => boolean {
  return (r) => {
    for (const k in r) {
      if (predicate(r[k])) {
        return true
      }
    }
    return false
  }
}

export function some_<A>(r: Record<string, A>, predicate: (a: A) => boolean): boolean {
  for (const k in r) {
    if (predicate(r[k])) {
      return true
    }
  }
  return false
}

export const compact = <A>(fa: Record<string, Option<A>>): Record<string, A> => {
  const r: MutableRecord<string, A> = {}
  const keys = Object.keys(fa)
  for (const key of keys) {
    const optionA = fa[key]
    if (isSome(optionA)) {
      r[key] = optionA.value
    }
  }
  return r
}

export const separate = <A, B>(
  fa: Record<string, Either<A, B>>
): Separated<Record<string, A>, Record<string, B>> => {
  const left: MutableRecord<string, A> = {}
  const right: MutableRecord<string, B> = {}
  const keys = Object.keys(fa)
  for (const key of keys) {
    const e = fa[key]
    switch (e._tag) {
      case "Left":
        left[key] = e.left
        break
      case "Right":
        right[key] = e.right
        break
    }
  }
  return {
    left,
    right
  }
}

export const filter: {
  <A, B extends A>(refinement: Refinement<A, B>): <K extends string>(
    fa: Record<K, A>
  ) => Record<K, B>
  <A>(predicate: Predicate<A>): <K extends string>(fa: Record<K, A>) => Record<K, A>
} = <A>(predicate: Predicate<A>) => (fa: Record<string, A>): Record<string, A> =>
  filterWithIndex_(fa, (_, a) => predicate(a))

export const filter_: {
  <K extends string, A, B extends A>(
    fa: Record<K, A>,
    refinement: Refinement<A, B>
  ): Record<K, B>
  <K extends string, A>(fa: Record<K, A>, predicate: Predicate<A>): Record<K, A>
} = <A>(fa: Record<string, A>, predicate: Predicate<A>): Record<string, A> =>
  filterWithIndex_(fa, (_, a) => predicate(a))

export const filterMap: {
  <A, B>(f: (a: A) => Option<B>): <K extends string>(fa: Record<K, A>) => Record<K, B>
  <A, B>(f: (a: A) => Option<B>): (fa: Record<string, A>) => Record<string, B>
} = <A, B>(f: (a: A) => Option<B>) => filterMapWithIndex((_, a: A) => f(a))

export const filterMap_: {
  <K extends string, A, B>(fa: Record<K, A>, f: (a: A) => Option<B>): Record<K, B>
  <A, B>(fa: Record<string, A>, f: (a: A) => Option<B>): Record<string, B>
} = <A, B>(fa: Record<string, A>, f: (a: A) => Option<B>) =>
  filterMapWithIndex_(fa, (_, a: A) => f(a))

export const partition: {
  <A, B extends A>(refinement: Refinement<A, B>): <K extends string>(
    fa: Record<K, A>
  ) => Separated<Record<K, A>, Record<K, B>>
  <A>(predicate: Predicate<A>): <K extends string>(
    fa: Record<K, A>
  ) => Separated<Record<K, A>, Record<K, A>>
} = <A>(predicate: Predicate<A>) => (
  fa: Record<string, A>
): Separated<Record<string, A>, Record<string, A>> =>
  partitionWithIndex_(fa, (_, a) => predicate(a))

export const partition_: {
  <K extends string, A, B extends A>(
    fa: Record<K, A>,
    refinement: Refinement<A, B>
  ): Separated<Record<K, A>, Record<K, B>>
  <K extends string, A>(fa: Record<K, A>, predicate: Predicate<A>): Separated<
    Record<K, A>,
    Record<K, A>
  >
} = <A>(
  fa: Record<string, A>,
  predicate: Predicate<A>
): Separated<Record<string, A>, Record<string, A>> =>
  partitionWithIndex_(fa, (_, a) => predicate(a))

export const partitionMap: {
  <A, B, C>(f: (a: A) => Either<B, C>): <K extends string>(
    fa: Record<K, A>
  ) => Separated<Record<K, B>, Record<K, C>>
  <A, B, C>(f: (a: A) => Either<B, C>): (
    fa: Record<string, A>
  ) => Separated<Record<string, B>, Record<string, C>>
} = <A, B, C>(f: (a: A) => Either<B, C>) => partitionMapWithIndex((_, a: A) => f(a))

export const partitionMap_: {
  <K extends string, A, B, C>(fa: Record<K, A>, f: (a: A) => Either<B, C>): Separated<
    Record<K, B>,
    Record<K, C>
  >
  <A, B, C>(fa: Record<string, A>, f: (a: A) => Either<B, C>): Separated<
    Record<string, B>,
    Record<string, C>
  >
} = <A, B, C>(fa: Record<string, A>, f: (a: A) => Either<B, C>) =>
  partitionMapWithIndex_(fa, (_, a: A) => f(a))

export const reduce: <A, B>(
  b: B,
  f: (b: B, a: A) => B
) => (fa: Readonly<MutableRecord<string, A>>) => B = (b, f) =>
  reduceWithIndex(b, (_, b, a) => f(b, a))

export const reduce_: <A, B>(
  fa: Readonly<MutableRecord<string, A>>,
  b: B,
  f: (b: B, a: A) => B
) => B = (fa, b, f) => reduceWithIndex_(fa, b, (_, b, a) => f(b, a))

export const reduceRight: <A, B>(
  b: B,
  f: (a: A, b: B) => B
) => (fa: Readonly<MutableRecord<string, A>>) => B = (b, f) =>
  reduceRightWithIndex(b, (_, a, b) => f(a, b))

export const reduceRight_: <A, B>(
  fa: Readonly<MutableRecord<string, A>>,
  b: B,
  f: (a: A, b: B) => B
) => B = (fa, b, f) => reduceRightWithIndex_(fa, b, (_, a, b) => f(a, b))

export const toReadonlyArray: <K extends string, A>(
  r: Record<K, A>
) => ReadonlyArray<readonly [K, A]> =
  /*#__PURE__*/
  (() => collect((k, a) => [k, a]))() as any
