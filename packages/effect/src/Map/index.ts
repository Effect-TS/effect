/* adapted from https://github.com/gcanti/fp-ts */

/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { Array } from "../Array"
import type {
  CFilter2,
  CFoldable3,
  Kind3,
  URIS3,
  URIS2,
  CFoldable2,
  Kind2,
  URIS,
  CFoldable1,
  CFoldable,
  Kind,
  HKT,
  CFilterableWithIndex2C,
  CWitherable2C,
  CTraversableWithIndex2C,
  CApplicative,
  Separated,
  CPartition2,
  CUnfoldable1,
  CUnfoldable,
  CFilterable2,
  Filter2,
  CTraverseWithIndex2C,
  TraverseWithIndex2C,
  CTraverse2C,
  CSequence2C,
  CWilt2C,
  CWither2C,
  Partition2,
  Traverse2C,
  Wither2C,
  Wilt2C,
  Filterable2
} from "../Base"
import { isLeft, Either } from "../Either"
import { fromEquals } from "../Eq"
import type { Eq } from "../Eq"
import { Predicate, flow } from "../Function"
import { pipe } from "../Function"
import type { Magma } from "../Magma"
import type { Monoid } from "../Monoid"
import * as Op from "../Option"
import type { Ord } from "../Ord"
import type { Semigroup } from "../Semigroup"
import type { Show } from "../Show"
import { MutableArray, MutableMap } from "../Support/Types"

export type Map<K, T> = ReadonlyMap<K, T>

export function collect<K>(
  O: Ord<K>
): <A, B>(f: (k: K, a: A) => B) => (m: Map<K, A>) => Array<B> {
  const keysO = keys(O)
  return <A, B>(f: (k: K, a: A) => B) => (m: Map<K, A>): Array<B> => {
    const out: MutableArray<B> = []
    const ks = keysO(m)
    for (const key of ks) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      out.push(f(key, m.get(key)!))
    }
    return out
  }
}

export function collect_<K>(
  O: Ord<K>
): <A, B>(m: Map<K, A>, f: (k: K, a: A) => B) => Array<B> {
  const keysO = keys(O)
  return <A, B>(m: Map<K, A>, f: (k: K, a: A) => B): Array<B> => {
    const out: MutableArray<B> = []
    const ks = keysO(m)
    for (const key of ks) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      out.push(f(key, m.get(key)!))
    }
    return out
  }
}

export const compact = <K, A>(fa: Map<K, Op.Option<A>>): Map<K, A> => {
  const m = new Map<K, A>()
  const entries = fa.entries()
  let e: Next<readonly [K, Op.Option<A>]>
  while (!(e = entries.next()).done) {
    const [k, oa] = e.value
    if (Op.isSome(oa)) {
      m.set(k, oa.value)
    }
  }
  return m
}

/**
 * Delete a key and value from a map
 */
export function deleteAt<K>(E: Eq<K>): (k: K) => <A>(m: Map<K, A>) => Map<K, A> {
  const lookupWithKeyE = lookupWithKey_(E)
  return (k) => (m) => {
    const found = lookupWithKeyE(m, k)
    if (Op.isSome(found)) {
      const r = new Map(m)
      r.delete(found.value[0])
      return r
    }
    return m
  }
}

export function deleteAt_<K>(E: Eq<K>): <A>(m: Map<K, A>, k: K) => Map<K, A> {
  const lookupWithKeyE = lookupWithKey_(E)
  return (m, k) => {
    const found = lookupWithKeyE(m, k)
    if (Op.isSome(found)) {
      const r = new Map(m)
      r.delete(found.value[0])
      return r
    }
    return m
  }
}

/**
 * Test whether or not a value is a member of a map
 */
export function elem<A>(E: Eq<A>): (a: A) => <K>(m: Map<K, A>) => boolean {
  return (a) => (m) => {
    const values = m.values()
    let e: Next<A>
    // tslint:disable-next-line: strict-boolean-expressions
    while (!(e = values.next()).done) {
      const v = e.value
      if (E.equals(a, v)) {
        return true
      }
    }
    return false
  }
}

export function elem_<A>(E: Eq<A>): <K>(m: Map<K, A>, a: A) => boolean {
  return (m, a) => {
    const values = m.values()
    let e: Next<A>
    // tslint:disable-next-line: strict-boolean-expressions
    while (!(e = values.next()).done) {
      const v = e.value
      if (E.equals(a, v)) {
        return true
      }
    }
    return false
  }
}

export const empty: Map<never, never> =
  /*#__PURE__*/
  (() => new Map<never, never>())()

export const filter: CFilter2<URI> = <A>(predicate: Predicate<A>) => <E>(
  fa: Map<E, A>
): Map<E, A> =>
  pipe(
    fa,
    filterWithIndex((_, a) => predicate(a))
  )

export const filter_: Filter2<URI> = <A, E>(
  fa: Map<E, A>,
  predicate: Predicate<A>
): Map<E, A> => filterWithIndex_(fa, (_, a) => predicate(a))

export const filterMap: <A, B>(
  f: (a: A) => Op.Option<B>
) => <E>(fa: Map<E, A>) => Map<E, B> = (f) => filterMapWithIndex((_, a) => f(a))

export const filterMap_: <E, A, B>(
  fa: Map<E, A>,
  f: (a: A) => Op.Option<B>
) => Map<E, B> = (fa, f) => filterMapWithIndex_(fa, (_, a) => f(a))

export const filterMapWithIndex = <K, A, B>(
  f: (k: K, a: A) => Op.Option<B>
): ((fa: Map<K, A>) => Map<K, B>) => {
  return (fa) => {
    const m = new Map<K, B>()
    const entries = fa.entries()
    let e: Next<readonly [K, A]>
    // tslint:disable-next-line: strict-boolean-expressions
    while (!(e = entries.next()).done) {
      const [k, a] = e.value
      const o = f(k, a)
      if (Op.isSome(o)) {
        m.set(k, o.value)
      }
    }
    return m
  }
}

export const filterMapWithIndex_ = <K, A, B>(
  fa: Map<K, A>,
  f: (k: K, a: A) => Op.Option<B>
): Map<K, B> => {
  const m = new Map<K, B>()
  const entries = fa.entries()
  let e: Next<readonly [K, A]>
  // tslint:disable-next-line: strict-boolean-expressions
  while (!(e = entries.next()).done) {
    const [k, a] = e.value
    const o = f(k, a)
    if (Op.isSome(o)) {
      m.set(k, o.value)
    }
  }
  return m
}

export const filterWithIndex = <K, A>(
  p: (k: K, a: A) => boolean
): ((fa: Map<K, A>) => Map<K, A>) => {
  return (fa) => {
    const m = new Map<K, A>()
    const entries = fa.entries()
    let e: Next<readonly [K, A]>
    // tslint:disable-next-line: strict-boolean-expressions
    while (!(e = entries.next()).done) {
      const [k, a] = e.value
      if (p(k, a)) {
        m.set(k, a)
      }
    }
    return m
  }
}

export const filterWithIndex_ = <K, A>(
  fa: Map<K, A>,
  p: (k: K, a: A) => boolean
): Map<K, A> => {
  const m = new Map<K, A>()
  const entries = fa.entries()
  let e: Next<readonly [K, A]>
  // tslint:disable-next-line: strict-boolean-expressions
  while (!(e = entries.next()).done) {
    const [k, a] = e.value
    if (p(k, a)) {
      m.set(k, a)
    }
  }
  return m
}

/**
 * Create a map from a foldable collection of key/value pairs, using the
 * specified `Magma` to combine values for duplicate keys.
 */
export function fromFoldable<F extends URIS3, K, A>(
  E: Eq<K>,
  M: Magma<A>,
  F: CFoldable3<F>
): <R, E>(fka: Kind3<F, R, E, readonly [K, A]>) => Map<K, A>
export function fromFoldable<F extends URIS2, K, A>(
  E: Eq<K>,
  M: Magma<A>,
  F: CFoldable2<F>
): <E>(fka: Kind2<F, E, readonly [K, A]>) => Map<K, A>
export function fromFoldable<F extends URIS, K, A>(
  E: Eq<K>,
  M: Magma<A>,
  F: CFoldable1<F>
): (fka: Kind<F, readonly [K, A]>) => Map<K, A>
export function fromFoldable<F, K, A>(
  E: Eq<K>,
  M: Magma<A>,
  F: CFoldable<F>
): (fka: HKT<F, readonly [K, A]>) => Map<K, A>
export function fromFoldable<F, K, A>(
  E: Eq<K>,
  M: Magma<A>,
  F: CFoldable<F>
): (fka: HKT<F, readonly [K, A]>) => Map<K, A> {
  const lookupWithKeyE = lookupWithKey_(E)
  return F.reduce<readonly [K, A], MutableMap<K, A>>(new Map<K, A>(), (b, [k, a]) => {
    const bOpt = lookupWithKeyE(b, k)
    if (Op.isSome(bOpt)) {
      b.set(bOpt.value[0], M.concat(bOpt.value[1], a))
    } else {
      b.set(k, a)
    }
    return b
  })
}

export function fromMutable<K, A>(m: MutableMap<K, A>): Map<K, A> {
  return new Map(m)
}

export function getEq<K, A>(SK: Eq<K>, SA: Eq<A>): Eq<Map<K, A>> {
  const isSubmap_ = isSubmap(SK, SA)
  return fromEquals((x, y) => isSubmap_(x, y) && isSubmap_(y, x))
}

export function getFilterableWithIndex<K = never>(): CFilterableWithIndex2C<URI, K, K> {
  return {
    ...filterableMap,
    _E: undefined as any,
    mapWithIndex,
    partitionMapWithIndex,
    partitionWithIndex,
    filterMapWithIndex,
    filterWithIndex
  }
}

/**
 * Gets `Monoid` instance for Maps given `Semigroup` instance for their values
 */
export function getMonoid<K, A>(SK: Eq<K>, SA: Semigroup<A>): Monoid<Map<K, A>> {
  const lookupWithKeyS = lookupWithKey_(SK)
  return {
    concat: (mx, my) => {
      if (mx === empty) {
        return my
      }
      if (my === empty) {
        return mx
      }
      const r = new Map(mx)
      const entries = my.entries()
      let e: Next<readonly [K, A]>
      // tslint:disable-next-line: strict-boolean-expressions
      while (!(e = entries.next()).done) {
        const [k, a] = e.value
        const mxOptA = lookupWithKeyS(mx, k)
        if (Op.isSome(mxOptA)) {
          r.set(mxOptA.value[0], SA.concat(mxOptA.value[1], a))
        } else {
          r.set(k, a)
        }
      }
      return r
    },
    empty
  }
}

export function getShow<K, A>(SK: Show<K>, SA: Show<A>): Show<Map<K, A>> {
  return {
    show: (m) => {
      let elements = ""
      m.forEach((a, k) => {
        elements += `[${SK.show(k)}, ${SA.show(a)}], `
      })
      if (elements !== "") {
        elements = elements.substring(0, elements.length - 2)
      }
      return `new Map([${elements}])`
    }
  }
}

export function traverseWithIndex<K>(_: Ord<K>): CTraverseWithIndex2C<URI, K, K> {
  return <F>(F: CApplicative<F>) => <A, B>(f: (k: K, a: A) => HKT<F, B>) => (
    ta: Map<K, A>
  ): HKT<F, Map<K, B>> => {
    let fm: HKT<F, Map<K, B>> = F.of(empty)
    const entries = ta.entries()
    let e: Next<readonly [K, A]>
    while (!(e = entries.next()).done) {
      const [key, a] = e.value
      fm = pipe(
        fm,
        F.map((m) => (b: B) => new Map(m).set(key, b)),
        F.ap(f(key, a))
      )
    }
    return fm
  }
}

export function traverseWithIndex_<K>(_: Ord<K>): TraverseWithIndex2C<URI, K, K> {
  return <F>(F: CApplicative<F>) => <A, B>(
    ta: Map<K, A>,
    f: (k: K, a: A) => HKT<F, B>
  ): HKT<F, Map<K, B>> => {
    let fm: HKT<F, Map<K, B>> = F.of(empty)
    const entries = ta.entries()
    let e: Next<readonly [K, A]>
    while (!(e = entries.next()).done) {
      const [key, a] = e.value
      fm = pipe(
        fm,
        F.map((m) => (b: B) => new Map(m).set(key, b)),
        F.ap(f(key, a))
      )
    }
    return fm
  }
}

export function traverse<K>(_: Ord<K>): CTraverse2C<URI, K> {
  const T = traverseWithIndex(_)
  return <F>(F: CApplicative<F>) => {
    const traverseWithIndexF = T(F)
    return <A, B>(f: (a: A) => HKT<F, B>) => traverseWithIndexF((_, a: A) => f(a))
  }
}

export function traverse_<K>(_: Ord<K>): Traverse2C<URI, K> {
  const T = traverseWithIndex_(_)
  return <F>(F: CApplicative<F>) => {
    const traverseWithIndexF = T(F)
    return <A, B>(ta: Map<K, A>, f: (a: A) => HKT<F, B>) =>
      traverseWithIndexF(ta, (_, a: A) => f(a))
  }
}

export function reduceWithIndex<K>(_: Ord<K>) {
  const keysO = keys(_)
  return <A, B>(b: B, f: (k: K, b: B, a: A) => B): ((fa: Map<K, A>) => B) => {
    return (fa) => {
      let out: B = b
      const ks = keysO(fa)
      const len = ks.length
      for (let i = 0; i < len; i++) {
        const k = ks[i]
        out = f(k, out, fa.get(k)!)
      }
      return out
    }
  }
}

export function reduceWithIndex_<K>(_: Ord<K>) {
  const keysO = keys(_)
  return <A, B>(fa: Map<K, A>, b: B, f: (k: K, b: B, a: A) => B): B => {
    let out: B = b
    const ks = keysO(fa)
    const len = ks.length
    for (let i = 0; i < len; i++) {
      const k = ks[i]
      out = f(k, out, fa.get(k)!)
    }
    return out
  }
}

export function foldMapWithIndex<K>(_: Ord<K>) {
  const keysO = keys(_)
  return <M>(M: Monoid<M>) => <A>(f: (k: K, a: A) => M): ((fa: Map<K, A>) => M) => {
    return (fa) => {
      let out: M = M.empty
      const ks = keysO(fa)
      const len = ks.length
      for (let i = 0; i < len; i++) {
        const k = ks[i]
        out = M.concat(out, f(k, fa.get(k)!))
      }
      return out
    }
  }
}

export function foldMapWithIndex_<K>(_: Ord<K>) {
  const keysO = keys(_)
  return <M>(M: Monoid<M>) => <A>(fa: Map<K, A>, f: (k: K, a: A) => M): M => {
    let out: M = M.empty
    const ks = keysO(fa)
    const len = ks.length
    for (let i = 0; i < len; i++) {
      const k = ks[i]
      out = M.concat(out, f(k, fa.get(k)!))
    }
    return out
  }
}

export function reduceRightWithIndex<K>(_: Ord<K>) {
  const keysO = keys(_)
  return <A, B>(b: B, f: (k: K, a: A, b: B) => B): ((fa: Map<K, A>) => B) => {
    return (fa) => {
      let out: B = b
      const ks = keysO(fa)
      const len = ks.length
      for (let i = len - 1; i >= 0; i--) {
        const k = ks[i]
        out = f(k, fa.get(k)!, out)
      }
      return out
    }
  }
}

export function reduceRightWithIndex_<K>(_: Ord<K>) {
  const keysO = keys(_)
  return <A, B>(fa: Map<K, A>, b: B, f: (k: K, a: A, b: B) => B): B => {
    let out: B = b
    const ks = keysO(fa)
    const len = ks.length
    for (let i = len - 1; i >= 0; i--) {
      const k = ks[i]
      out = f(k, fa.get(k)!, out)
    }
    return out
  }
}

export function sequence<K>(_: Ord<K>): CSequence2C<URI, K> {
  const T = traverseWithIndex(_)
  return <F>(F: CApplicative<F>): (<A>(ta: Map<K, HKT<F, A>>) => HKT<F, Map<K, A>>) => {
    const traverseWithIndexF = T(F)
    return traverseWithIndexF((_, a) => a)
  }
}

export function wilt<K>(_: Ord<K>): CWilt2C<URI, K> {
  const T = traverse(_)
  return <F>(
    F: CApplicative<F>
  ): (<A, B, C>(
    f: (a: A) => HKT<F, Either<B, C>>
  ) => (wa: Map<K, A>) => HKT<F, Separated<Map<K, B>, Map<K, C>>>) => {
    const traverseF = T(F)
    return (f) => flow(traverseF(f), F.map(separate))
  }
}

export function wilt_<K>(_: Ord<K>): Wilt2C<URI, K> {
  const T = traverse_(_)
  return <F>(
    F: CApplicative<F>
  ): (<A, B, C>(
    wa: Map<K, A>,
    f: (a: A) => HKT<F, Either<B, C>>
  ) => HKT<F, Separated<Map<K, B>, Map<K, C>>>) => {
    const traverseF = T(F)
    return (wa, f) => F.map(separate)(traverseF(wa, f))
  }
}

export function wither<K>(_: Ord<K>): CWither2C<URI, K> {
  const T = traverse(_)
  return <F>(
    F: CApplicative<F>
  ): (<A, B>(
    f: (a: A) => HKT<F, Op.Option<B>>
  ) => (wa: Map<K, A>) => HKT<F, Map<K, B>>) => {
    const traverseF = T(F)
    return (f) => flow(traverseF(f), F.map(compact))
  }
}

export function wither_<K>(_: Ord<K>): Wither2C<URI, K> {
  const T = traverse(_)
  return <F>(
    F: CApplicative<F>
  ): (<A, B>(
    wa: Map<K, A>,
    f: (a: A) => HKT<F, Op.Option<B>>
  ) => HKT<F, Map<K, B>>) => {
    const traverseF = T(F)
    return (ta, f) => flow(traverseF(f), F.map(compact))(ta)
  }
}

export function reduce<K>(_: Ord<K>) {
  const ri = reduceWithIndex(_)
  return <A, B>(b: B, f: (b: B, a: A) => B) => ri(b, (_, b, a: A) => f(b, a))
}

export function reduce_<K>(_: Ord<K>) {
  const ri = reduceWithIndex_(_)
  return <A, B>(fa: Map<K, A>, b: B, f: (b: B, a: A) => B) =>
    ri(fa, b, (_, b, a: A) => f(b, a))
}

export function foldMap<K>(_: Ord<K>) {
  const F = foldMapWithIndex(_)
  return <M>(M: Monoid<M>) => {
    const foldMapWithIndexM = F(M)
    return <A>(f: (a: A) => M) => foldMapWithIndexM((_, a: A) => f(a))
  }
}

export function foldMap_<K>(_: Ord<K>) {
  const F = foldMapWithIndex_(_)
  return <M>(M: Monoid<M>) => {
    const foldMapWithIndexM = F(M)
    return <A>(fa: Map<K, A>, f: (a: A) => M) =>
      foldMapWithIndexM(fa, (_, a: A) => f(a))
  }
}

export function reduceRight<K>(_: Ord<K>) {
  const ri = reduceRightWithIndex(_)
  return <A, B>(b: B, f: (a: A, b: B) => B) => ri(b, (_, a: A, b) => f(a, b))
}

export function reduceRight_<K>(_: Ord<K>) {
  const ri = reduceRightWithIndex_(_)
  return <A, B>(fa: Map<K, A>, b: B, f: (a: A, b: B) => B) =>
    ri(fa, b, (_, a: A, b) => f(a, b))
}

export function getWitherable<K>(
  O: Ord<K>
): CWitherable2C<URI, K> & CTraversableWithIndex2C<URI, K, K> {
  return {
    ...filterableMap,
    _E: undefined as any,
    reduce: reduce(O),
    foldMap: foldMap(O),
    reduceRight: reduceRight(O),
    traverse: traverse(O),
    sequence: sequence(O),
    mapWithIndex,
    reduceWithIndex: reduceWithIndex(O),
    foldMapWithIndex: foldMapWithIndex(O),
    reduceRightWithIndex: reduceRightWithIndex(O),
    traverseWithIndex: traverseWithIndex(O),
    wilt: wilt(O),
    wither: wither(O)
  }
}

/**
 * Insert or replace a key/value pair in a map
 */
export function insertAt<K>(E: Eq<K>): <A>(k: K, a: A) => (m: Map<K, A>) => Map<K, A> {
  const lookupWithKeyE = lookupWithKey_(E)
  return (k, a) => (m) => {
    const found = lookupWithKeyE(m, k)
    if (Op.isNone(found)) {
      const r = new Map(m)
      r.set(k, a)
      return r
    } else if (found.value[1] !== a) {
      const r = new Map(m)
      r.set(found.value[0], a)
      return r
    }
    return m
  }
}

export function insertAt_<K>(E: Eq<K>): <A>(m: Map<K, A>, k: K, a: A) => Map<K, A> {
  const lookupWithKeyE = lookupWithKey_(E)
  return (m, k, a) => {
    const found = lookupWithKeyE(m, k)
    if (Op.isNone(found)) {
      const r = new Map(m)
      r.set(k, a)
      return r
    } else if (found.value[1] !== a) {
      const r = new Map(m)
      r.set(found.value[0], a)
      return r
    }
    return m
  }
}

/**
 * Test whether or not a map is empty
 */
export function isEmpty<K, A>(d: Map<K, A>): boolean {
  return d.size === 0
}

/**
 * Test whether or not one Map contains all of the keys and values contained in another Map
 */
export function isSubmap<K, A>(
  SK: Eq<K>,
  SA: Eq<A>
): (d1: Map<K, A>, d2: Map<K, A>) => boolean {
  const lookupWithKeyS = lookupWithKey_(SK)
  return (d1: Map<K, A>, d2: Map<K, A>): boolean => {
    const entries = d1.entries()
    let e: Next<readonly [K, A]>
    // tslint:disable-next-line: strict-boolean-expressions
    while (!(e = entries.next()).done) {
      const [k, a] = e.value
      const d2OptA = lookupWithKeyS(d2, k)
      if (
        Op.isNone(d2OptA) ||
        !SK.equals(k, d2OptA.value[0]) ||
        !SA.equals(a, d2OptA.value[1])
      ) {
        return false
      }
    }
    return true
  }
}

/**
 * Get a sorted array of the keys contained in a map
 */
export function keys<K>(O: Ord<K>): <A>(m: Map<K, A>) => Array<K> {
  return (m) => Array.from(m.keys()).sort(O.compare)
}

export function keys_<K, A>(m: Map<K, A>, O: Ord<K>): Array<K> {
  return Array.from(m.keys()).sort(O.compare)
}

/**
 * Lookup the value for a key in a `Map`.
 */
export function lookup<K>(E: Eq<K>): (k: K) => <A>(m: Map<K, A>) => Op.Option<A> {
  const lookupWithKeyE = lookupWithKey_(E)
  return (k) => (m) => Op.map_(lookupWithKeyE(m, k), ([_, a]) => a)
}

export function lookup_<K>(E: Eq<K>): <A>(m: Map<K, A>, k: K) => Op.Option<A> {
  const lookupWithKeyE = lookupWithKey_(E)
  return (m, k) => Op.map_(lookupWithKeyE(m, k), ([_, a]) => a)
}

/**
 * Lookup the value for a key in a `Map`.
 * If the result is a `Some`, the existing key is also returned.
 */
export function lookupWithKey<K>(
  E: Eq<K>
): (k: K) => <A>(m: Map<K, A>) => Op.Option<readonly [K, A]> {
  return (k: K) => <A>(m: Map<K, A>) => {
    const entries = m.entries()
    let e: Next<readonly [K, A]>
    // tslint:disable-next-line: strict-boolean-expressions
    while (!(e = entries.next()).done) {
      const [ka, a] = e.value
      if (E.equals(ka, k)) {
        return Op.some([ka, a])
      }
    }
    return Op.none
  }
}

export function lookupWithKey_<K>(
  E: Eq<K>
): <A>(m: Map<K, A>, k: K) => Op.Option<readonly [K, A]> {
  return <A>(m: Map<K, A>, k: K) => {
    const entries = m.entries()
    let e: Next<readonly [K, A]>
    // tslint:disable-next-line: strict-boolean-expressions
    while (!(e = entries.next()).done) {
      const [ka, a] = e.value
      if (E.equals(ka, k)) {
        return Op.some([ka, a])
      }
    }
    return Op.none
  }
}

export const map_: <E, A, B>(fa: Map<E, A>, f: (a: A) => B) => Map<E, B> = (fa, f) =>
  map(f)(fa)

export const map: <A, B>(f: (a: A) => B) => <E>(fa: Map<E, A>) => Map<E, B> = (f) =>
  mapWithIndex((_, a) => f(a))

export const mapWithIndex = <K, A, B>(
  f: (k: K, a: A) => B
): ((fa: Map<K, A>) => Map<K, B>) => {
  return (fa) => {
    const m = new Map<K, B>()
    const entries = fa.entries()
    let e: Next<readonly [K, A]>
    while (!(e = entries.next()).done) {
      const [key, a] = e.value
      m.set(key, f(key, a))
    }
    return m
  }
}

export const mapWithIndex_ = <K, A, B>(
  fa: Map<K, A>,
  f: (k: K, a: A) => B
): Map<K, B> => {
  const m = new Map<K, B>()
  const entries = fa.entries()
  let e: Next<readonly [K, A]>
  while (!(e = entries.next()).done) {
    const [key, a] = e.value
    m.set(key, f(key, a))
  }
  return m
}

/**
 * Test whether or not a key exists in a map
 */
export function member<K>(E: Eq<K>): (k: K) => <A>(m: Map<K, A>) => boolean {
  const lookupE = lookup_(E)
  return (k) => (m) => Op.isSome(lookupE(m, k))
}

export function member_<K>(E: Eq<K>): <A>(m: Map<K, A>, k: K) => boolean {
  const lookupE = lookup_(E)
  return (m, k) => Op.isSome(lookupE(m, k))
}

export function modifyAt<K>(
  E: Eq<K>
): <A>(k: K, f: (a: A) => A) => (m: Map<K, A>) => Op.Option<Map<K, A>> {
  const lookupWithKeyE = lookupWithKey_(E)
  return (k, f) => (m) => {
    const found = lookupWithKeyE(m, k)
    if (Op.isNone(found)) {
      return Op.none
    }
    const r = new Map(m)
    r.set(found.value[0], f(found.value[1]))
    return Op.some(r)
  }
}

export function modifyAt_<K>(
  E: Eq<K>
): <A>(m: Map<K, A>, k: K, f: (a: A) => A) => Op.Option<Map<K, A>> {
  const lookupWithKeyE = lookupWithKey_(E)
  return (m, k, f) => {
    const found = lookupWithKeyE(m, k)
    if (Op.isNone(found)) {
      return Op.none
    }
    const r = new Map(m)
    r.set(found.value[0], f(found.value[1]))
    return Op.some(r)
  }
}

export interface Next<A> {
  readonly done?: boolean
  readonly value: A
}

export const partition: CPartition2<URI> = <A>(predicate: Predicate<A>) => <K>(
  fa: Map<K, A>
) => partitionWithIndex_(fa, (_, a) => predicate(a))

export const partition_: Partition2<URI> = <K, A>(
  fa: Map<K, A>,
  predicate: Predicate<A>
) => partitionWithIndex_(fa, (_, a) => predicate(a))

export const partitionMap: <A, B, C>(
  f: (a: A) => Either<B, C>
) => <E>(fa: Map<E, A>) => Separated<Map<E, B>, Map<E, C>> = (f) =>
  partitionMapWithIndex((_, a) => f(a))

export const partitionMap_: <E, A, B, C>(
  fa: Map<E, A>,
  f: (a: A) => Either<B, C>
) => Separated<Map<E, B>, Map<E, C>> = (fa, f) =>
  partitionMapWithIndex_(fa, (_, a) => f(a))

export const partitionMapWithIndex = <K, A, B, C>(
  f: (k: K, a: A) => Either<B, C>
): ((fa: Map<K, A>) => Separated<Map<K, B>, Map<K, C>>) => {
  return (fa) => {
    const left = new Map<K, B>()
    const right = new Map<K, C>()
    const entries = fa.entries()
    let e: Next<readonly [K, A]>
    // tslint:disable-next-line: strict-boolean-expressions
    while (!(e = entries.next()).done) {
      const [k, a] = e.value
      const ei = f(k, a)
      if (isLeft(ei)) {
        left.set(k, ei.left)
      } else {
        right.set(k, ei.right)
      }
    }
    return {
      left,
      right
    }
  }
}

export const partitionMapWithIndex_ = <K, A, B, C>(
  fa: Map<K, A>,
  f: (k: K, a: A) => Either<B, C>
): Separated<Map<K, B>, Map<K, C>> => {
  const left = new Map<K, B>()
  const right = new Map<K, C>()
  const entries = fa.entries()
  let e: Next<readonly [K, A]>
  // tslint:disable-next-line: strict-boolean-expressions
  while (!(e = entries.next()).done) {
    const [k, a] = e.value
    const ei = f(k, a)
    if (isLeft(ei)) {
      left.set(k, ei.left)
    } else {
      right.set(k, ei.right)
    }
  }
  return {
    left,
    right
  }
}

export const partitionWithIndex = <K, A>(
  p: (k: K, a: A) => boolean
): ((fa: Map<K, A>) => Separated<Map<K, A>, Map<K, A>>) => {
  return (fa) => {
    const left = new Map<K, A>()
    const right = new Map<K, A>()
    const entries = fa.entries()
    let e: Next<readonly [K, A]>
    // tslint:disable-next-line: strict-boolean-expressions
    while (!(e = entries.next()).done) {
      const [k, a] = e.value
      if (p(k, a)) {
        right.set(k, a)
      } else {
        left.set(k, a)
      }
    }
    return {
      left,
      right
    }
  }
}

export const partitionWithIndex_ = <K, A>(
  fa: Map<K, A>,
  p: (k: K, a: A) => boolean
): Separated<Map<K, A>, Map<K, A>> => {
  const left = new Map<K, A>()
  const right = new Map<K, A>()
  const entries = fa.entries()
  let e: Next<readonly [K, A]>
  // tslint:disable-next-line: strict-boolean-expressions
  while (!(e = entries.next()).done) {
    const [k, a] = e.value
    if (p(k, a)) {
      right.set(k, a)
    } else {
      left.set(k, a)
    }
  }
  return {
    left,
    right
  }
}

/**
 * Delete a key and value from a map, returning the value as well as the subsequent map
 */
export function pop<K>(
  E: Eq<K>
): (k: K) => <A>(m: Map<K, A>) => Op.Option<readonly [A, Map<K, A>]> {
  const lookupE = lookup_(E)
  const deleteAtE = deleteAt(E)
  return (k) => {
    const deleteAtEk = deleteAtE(k)
    return (m) => Op.map_(lookupE(m, k), (a) => [a, deleteAtEk(m)])
  }
}

export function pop_<K>(
  E: Eq<K>
): <A>(m: Map<K, A>, k: K) => Op.Option<readonly [A, Map<K, A>]> {
  const lookupE = lookup_(E)
  const deleteAtE = deleteAt(E)
  return (m, k) => {
    const deleteAtEk = deleteAtE(k)
    return Op.map_(lookupE(m, k), (a) => [a, deleteAtEk(m)])
  }
}

export const separate = <K, A, B>(
  fa: Map<K, Either<A, B>>
): Separated<Map<K, A>, Map<K, B>> => {
  const left = new Map<K, A>()
  const right = new Map<K, B>()
  const entries = fa.entries()
  let e: Next<readonly [K, Either<A, B>]>
  while (!(e = entries.next()).done) {
    const [k, ei] = e.value
    if (isLeft(ei)) {
      left.set(k, ei.left)
    } else {
      right.set(k, ei.right)
    }
  }
  return {
    left,
    right
  }
}

/**
 * Create a map with one key/value pair
 */
export function singleton<K, A>(k: K, a: A): Map<K, A> {
  return new Map([[k, a]])
}

/**
 * Calculate the number of key/value pairs in a map
 */
export function size<K, A>(d: Map<K, A>): number {
  return d.size
}

export function toMutable<K, A>(m: Map<K, A>): MutableMap<K, A> {
  return new Map(m)
}

/**
 * Get a sorted of the key/value pairs contained in a map
 */
export function toArray<K>(O: Ord<K>): <A>(m: Map<K, A>) => Array<readonly [K, A]> {
  return collect(O)((k, a) => [k, a] as const)
}

/**
 * Unfolds a map into a list of key/value pairs
 */
export function toUnfoldable<K, F extends URIS>(
  O: Ord<K>,
  U: CUnfoldable1<F>
): <A>(d: Map<K, A>) => Kind<F, readonly [K, A]>
export function toUnfoldable<K, F>(
  O: Ord<K>,
  U: CUnfoldable<F>
): <A>(d: Map<K, A>) => HKT<F, readonly [K, A]>
export function toUnfoldable<K, F>(
  O: Ord<K>,
  U: CUnfoldable<F>
): <A>(d: Map<K, A>) => HKT<F, readonly [K, A]> {
  const toArrayO = toArray(O)
  return (d) => {
    const arr = toArrayO(d)
    const len = arr.length
    return U.unfold(0, (b) => (b < len ? Op.some([arr[b], b + 1]) : Op.none))
  }
}

export function updateAt<K>(
  E: Eq<K>
): <A>(k: K, a: A) => (m: Map<K, A>) => Op.Option<Map<K, A>> {
  const lookupWithKeyE = lookupWithKey_(E)
  return (k, a) => (m) => {
    const found = lookupWithKeyE(m, k)
    if (Op.isNone(found)) {
      return Op.none
    }
    const r = new Map(m)
    r.set(found.value[0], a)
    return Op.some(r)
  }
}

export function updateAt_<K>(
  E: Eq<K>
): <A>(m: Map<K, A>, k: K, a: A) => Op.Option<Map<K, A>> {
  const lookupWithKeyE = lookupWithKey_(E)
  return (m, k, a) => {
    const found = lookupWithKeyE(m, k)
    if (Op.isNone(found)) {
      return Op.none
    }
    const r = new Map(m)
    r.set(found.value[0], a)
    return Op.some(r)
  }
}

export const URI = "@matechs/core/Map"

export type URI = typeof URI

declare module "../Base/HKT" {
  interface URItoKind2<E, A> {
    readonly [URI]: Map<E, A>
  }
}

/**
 * Get a sorted array of the values contained in a map
 */
export function values<A>(O: Ord<A>): <K>(m: Map<K, A>) => Array<A> {
  return (m) => Array.from(m.values()).sort(O.compare)
}

export const filterableMap: CFilterable2<URI> = {
  URI,
  map,
  compact,
  separate,
  filter,
  filterMap,
  partition,
  partitionMap
}

//
// Compatibility with fp-ts ecosystem
//

export const filterableMap_: Filterable2<URI> = {
  URI,
  map: map_,
  compact,
  separate,
  filter: filter_,
  filterMap: filterMap_,
  partition: partition_,
  partitionMap: partitionMap_
}
