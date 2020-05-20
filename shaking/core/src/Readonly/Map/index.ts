/* adapted from https://github.com/gcanti/fp-ts */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
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
  CFilterable2
} from "../../Base"
import { isLeft, Either } from "../../Either"
import { fromEquals } from "../../Eq"
import type { Eq } from "../../Eq"
import { Predicate, flow } from "../../Function"
import type { Magma } from "../../Magma"
import type { Monoid } from "../../Monoid"
import * as Op from "../../Option"
import type { Ord } from "../../Ord"
import { pipe } from "../../Pipe"
import type { Semigroup } from "../../Semigroup"
import type { Show } from "../../Show"

export function collect<K>(
  O: Ord<K>
): <A, B>(f: (k: K, a: A) => B) => (m: ReadonlyMap<K, A>) => ReadonlyArray<B> {
  const keysO = keys(O)
  return <A, B>(f: (k: K, a: A) => B) => (m: ReadonlyMap<K, A>): ReadonlyArray<B> => {
    const out: Array<B> = []
    const ks = keysO(m)
    for (const key of ks) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      out.push(f(key, m.get(key)!))
    }
    return out
  }
}

export const compact = <K, A>(fa: ReadonlyMap<K, Op.Option<A>>): ReadonlyMap<K, A> => {
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
export function deleteAt<K>(
  E: Eq<K>
): (k: K) => <A>(m: ReadonlyMap<K, A>) => ReadonlyMap<K, A> {
  const lookupWithKeyE = lookupWithKey(E)
  return (k) => (m) => {
    const found = lookupWithKeyE(k, m)
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
export function elem<A>(E: Eq<A>): <K>(a: A, m: ReadonlyMap<K, A>) => boolean {
  return (a, m) => {
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

export const empty: ReadonlyMap<never, never> =
  /*#__PURE__*/
  (() => new Map<never, never>())()

export const filter: CFilter2<URI> = <A>(predicate: Predicate<A>) => <E>(
  fa: ReadonlyMap<E, A>
): ReadonlyMap<E, A> =>
  pipe(
    fa,
    filterWithIndex((_, a) => predicate(a))
  )

export const filterMap: <A, B>(
  f: (a: A) => Op.Option<B>
) => <E>(fa: ReadonlyMap<E, A>) => ReadonlyMap<E, B> = (f) =>
  filterMapWithIndex((_, a) => f(a))

export const filterMapWithIndex = <K, A, B>(
  f: (k: K, a: A) => Op.Option<B>
): ((fa: ReadonlyMap<K, A>) => ReadonlyMap<K, B>) => {
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

export const filterWithIndex = <K, A>(
  p: (k: K, a: A) => boolean
): ((fa: ReadonlyMap<K, A>) => ReadonlyMap<K, A>) => {
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

/**
 * Create a map from a foldable collection of key/value pairs, using the
 * specified `Magma` to combine values for duplicate keys.
 */
export function fromFoldable<F extends URIS3, K, A>(
  E: Eq<K>,
  M: Magma<A>,
  F: CFoldable3<F>
): <R, E>(fka: Kind3<F, R, E, readonly [K, A]>) => ReadonlyMap<K, A>
export function fromFoldable<F extends URIS2, K, A>(
  E: Eq<K>,
  M: Magma<A>,
  F: CFoldable2<F>
): <E>(fka: Kind2<F, E, readonly [K, A]>) => ReadonlyMap<K, A>
export function fromFoldable<F extends URIS, K, A>(
  E: Eq<K>,
  M: Magma<A>,
  F: CFoldable1<F>
): (fka: Kind<F, readonly [K, A]>) => ReadonlyMap<K, A>
export function fromFoldable<F, K, A>(
  E: Eq<K>,
  M: Magma<A>,
  F: CFoldable<F>
): (fka: HKT<F, readonly [K, A]>) => ReadonlyMap<K, A>
export function fromFoldable<F, K, A>(
  E: Eq<K>,
  M: Magma<A>,
  F: CFoldable<F>
): (fka: HKT<F, readonly [K, A]>) => ReadonlyMap<K, A> {
  const lookupWithKeyE = lookupWithKey(E)
  return F.reduce<readonly [K, A], Map<K, A>>(new Map<K, A>(), (b, [k, a]) => {
    const bOpt = lookupWithKeyE(k, b)
    if (Op.isSome(bOpt)) {
      b.set(bOpt.value[0], M.concat(bOpt.value[1], a))
    } else {
      b.set(k, a)
    }
    return b
  })
}

export function fromMap<K, A>(m: Map<K, A>): ReadonlyMap<K, A> {
  return new Map(m)
}

export function getEq<K, A>(SK: Eq<K>, SA: Eq<A>): Eq<ReadonlyMap<K, A>> {
  const isSubmap_ = isSubmap(SK, SA)
  return fromEquals((x, y) => isSubmap_(x, y) && isSubmap_(y, x))
}

export function getFilterableWithIndex<K = never>(): CFilterableWithIndex2C<URI, K, K> {
  return {
    ...readonlyMap,
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
export function getMonoid<K, A>(
  SK: Eq<K>,
  SA: Semigroup<A>
): Monoid<ReadonlyMap<K, A>> {
  const lookupWithKeyS = lookupWithKey(SK)
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
        const mxOptA = lookupWithKeyS(k, mx)
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

export function getShow<K, A>(SK: Show<K>, SA: Show<A>): Show<ReadonlyMap<K, A>> {
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

export function getWitherable<K>(
  O: Ord<K>
): CWitherable2C<URI, K> & CTraversableWithIndex2C<URI, K, K> {
  const keysO = keys(O)

  const reduceWithIndex = <A, B>(
    b: B,
    f: (k: K, b: B, a: A) => B
  ): ((fa: ReadonlyMap<K, A>) => B) => {
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

  const foldMapWithIndex = <M>(M: Monoid<M>) => <A>(
    f: (k: K, a: A) => M
  ): ((fa: ReadonlyMap<K, A>) => M) => {
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

  const reduceRightWithIndex = <A, B>(
    b: B,
    f: (k: K, a: A, b: B) => B
  ): ((fa: ReadonlyMap<K, A>) => B) => {
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

  const traverseWithIndex = <F>(
    F: CApplicative<F>
  ): (<A, B>(
    f: (k: K, a: A) => HKT<F, B>
  ) => (ta: ReadonlyMap<K, A>) => HKT<F, ReadonlyMap<K, B>>) => {
    return <A, B>(f: (k: K, a: A) => HKT<F, B>) => (ta: ReadonlyMap<K, A>) => {
      let fm: HKT<F, ReadonlyMap<K, B>> = F.of(empty)
      const entries = ta.entries()
      let e: Next<readonly [K, A]>
      // tslint:disable-next-line: strict-boolean-expressions
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

  const traverse = <F>(
    F: CApplicative<F>
  ): (<A, B>(
    f: (a: A) => HKT<F, B>
  ) => (ta: ReadonlyMap<K, A>) => HKT<F, ReadonlyMap<K, B>>) => {
    const traverseWithIndexF = traverseWithIndex(F)
    return (f) => traverseWithIndexF((_, a) => f(a))
  }

  const sequence = <F>(
    F: CApplicative<F>
  ): (<A>(ta: ReadonlyMap<K, HKT<F, A>>) => HKT<F, ReadonlyMap<K, A>>) => {
    const traverseWithIndexF = traverseWithIndex(F)
    return traverseWithIndexF((_, a) => a)
  }

  return {
    ...readonlyMap,
    _E: undefined as any,
    reduce: (b, f) => reduceWithIndex(b, (_, b, a) => f(b, a)),
    foldMap: (M) => {
      const foldMapWithIndexM = foldMapWithIndex(M)
      return (f) => foldMapWithIndexM((_, a) => f(a))
    },
    reduceRight: (b, f) => reduceRightWithIndex(b, (_, a, b) => f(a, b)),
    traverse,
    sequence,
    mapWithIndex,
    reduceWithIndex,
    foldMapWithIndex,
    reduceRightWithIndex,
    traverseWithIndex,
    wilt: <F>(
      F: CApplicative<F>
    ): (<A, B, C>(
      f: (a: A) => HKT<F, Either<B, C>>
    ) => (
      wa: ReadonlyMap<K, A>
    ) => HKT<F, Separated<ReadonlyMap<K, B>, ReadonlyMap<K, C>>>) => {
      const traverseF = traverse(F)
      return (f) => flow(traverseF(f), F.map(separate))
    },
    wither: <F>(
      F: CApplicative<F>
    ): (<A, B>(
      f: (a: A) => HKT<F, Op.Option<B>>
    ) => (wa: ReadonlyMap<K, A>) => HKT<F, ReadonlyMap<K, B>>) => {
      const traverseF = traverse(F)
      return (f) => flow(traverseF(f), F.map(compact))
    }
  }
}

/**
 * Insert or replace a key/value pair in a map
 */
export function insertAt<K>(
  E: Eq<K>
): <A>(k: K, a: A) => (m: ReadonlyMap<K, A>) => ReadonlyMap<K, A> {
  const lookupWithKeyE = lookupWithKey(E)
  return (k, a) => (m) => {
    const found = lookupWithKeyE(k, m)
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
export function isEmpty<K, A>(d: ReadonlyMap<K, A>): boolean {
  return d.size === 0
}

/**
 * Test whether or not one Map contains all of the keys and values contained in another Map
 */
export function isSubmap<K, A>(
  SK: Eq<K>,
  SA: Eq<A>
): (d1: ReadonlyMap<K, A>, d2: ReadonlyMap<K, A>) => boolean {
  const lookupWithKeyS = lookupWithKey(SK)
  return (d1: ReadonlyMap<K, A>, d2: ReadonlyMap<K, A>): boolean => {
    const entries = d1.entries()
    let e: Next<readonly [K, A]>
    // tslint:disable-next-line: strict-boolean-expressions
    while (!(e = entries.next()).done) {
      const [k, a] = e.value
      const d2OptA = lookupWithKeyS(k, d2)
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
export function keys<K>(O: Ord<K>): <A>(m: ReadonlyMap<K, A>) => ReadonlyArray<K> {
  return (m) => Array.from(m.keys()).sort(O.compare)
}

/**
 * Lookup the value for a key in a `Map`.
 */
export function lookup<K>(E: Eq<K>): <A>(k: K, m: ReadonlyMap<K, A>) => Op.Option<A> {
  const lookupWithKeyE = lookupWithKey(E)
  return (k, m) => Op.map_(lookupWithKeyE(k, m), ([_, a]) => a)
}

/**
 * Lookup the value for a key in a `Map`.
 * If the result is a `Some`, the existing key is also returned.
 */
export function lookupWithKey<K>(
  E: Eq<K>
): <A>(k: K, m: ReadonlyMap<K, A>) => Op.Option<readonly [K, A]> {
  return <A>(k: K, m: ReadonlyMap<K, A>) => {
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

export const map_: <E, A, B>(
  fa: ReadonlyMap<E, A>,
  f: (a: A) => B
) => ReadonlyMap<E, B> = (fa, f) => map(f)(fa)

export const map: <A, B>(
  f: (a: A) => B
) => <E>(fa: ReadonlyMap<E, A>) => ReadonlyMap<E, B> = (f) =>
  mapWithIndex((_, a) => f(a))

export const mapWithIndex = <K, A, B>(
  f: (k: K, a: A) => B
): ((fa: ReadonlyMap<K, A>) => ReadonlyMap<K, B>) => {
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

/**
 * Test whether or not a key exists in a map
 */
export function member<K>(E: Eq<K>): <A>(k: K, m: ReadonlyMap<K, A>) => boolean {
  const lookupE = lookup(E)
  return (k, m) => Op.isSome(lookupE(k, m))
}

export function modifyAt<K>(
  E: Eq<K>
): <A>(k: K, f: (a: A) => A) => (m: ReadonlyMap<K, A>) => Op.Option<ReadonlyMap<K, A>> {
  const lookupWithKeyE = lookupWithKey(E)
  return (k, f) => (m) => {
    const found = lookupWithKeyE(k, m)
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
  fa: ReadonlyMap<K, A>
) =>
  pipe(
    fa,
    partitionWithIndex((_, a) => predicate(a))
  )

export const partitionMap: <A, B, C>(
  f: (a: A) => Either<B, C>
) => <E>(fa: ReadonlyMap<E, A>) => Separated<ReadonlyMap<E, B>, ReadonlyMap<E, C>> = (
  f
) => partitionMapWithIndex((_, a) => f(a))

export const partitionMapWithIndex = <K, A, B, C>(
  f: (k: K, a: A) => Either<B, C>
): ((fa: ReadonlyMap<K, A>) => Separated<ReadonlyMap<K, B>, ReadonlyMap<K, C>>) => {
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

export const partitionWithIndex = <K, A>(
  p: (k: K, a: A) => boolean
): ((fa: ReadonlyMap<K, A>) => Separated<ReadonlyMap<K, A>, ReadonlyMap<K, A>>) => {
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

/**
 * Delete a key and value from a map, returning the value as well as the subsequent map
 */
export function pop<K>(
  E: Eq<K>
): (k: K) => <A>(m: ReadonlyMap<K, A>) => Op.Option<readonly [A, ReadonlyMap<K, A>]> {
  const lookupE = lookup(E)
  const deleteAtE = deleteAt(E)
  return (k) => {
    const deleteAtEk = deleteAtE(k)
    return (m) => Op.map_(lookupE(k, m), (a) => [a, deleteAtEk(m)])
  }
}

export const separate = <K, A, B>(
  fa: ReadonlyMap<K, Either<A, B>>
): Separated<ReadonlyMap<K, A>, ReadonlyMap<K, B>> => {
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
export function singleton<K, A>(k: K, a: A): ReadonlyMap<K, A> {
  return new Map([[k, a]])
}

/**
 * Calculate the number of key/value pairs in a map
 */
export function size<K, A>(d: ReadonlyMap<K, A>): number {
  return d.size
}

export function toMap<K, A>(m: ReadonlyMap<K, A>): Map<K, A> {
  return new Map(m)
}

/**
 * Get a sorted of the key/value pairs contained in a map
 */
export function toReadonlyArray<K>(
  O: Ord<K>
): <A>(m: ReadonlyMap<K, A>) => ReadonlyArray<readonly [K, A]> {
  return collect(O)((k, a) => [k, a] as const)
}

/**
 * Unfolds a map into a list of key/value pairs
 */
export function toUnfoldable<K, F extends URIS>(
  O: Ord<K>,
  U: CUnfoldable1<F>
): <A>(d: ReadonlyMap<K, A>) => Kind<F, readonly [K, A]>
export function toUnfoldable<K, F>(
  O: Ord<K>,
  U: CUnfoldable<F>
): <A>(d: ReadonlyMap<K, A>) => HKT<F, readonly [K, A]>
export function toUnfoldable<K, F>(
  O: Ord<K>,
  U: CUnfoldable<F>
): <A>(d: ReadonlyMap<K, A>) => HKT<F, readonly [K, A]> {
  const toArrayO = toReadonlyArray(O)
  return (d) => {
    const arr = toArrayO(d)
    const len = arr.length
    return U.unfold(0, (b) => (b < len ? Op.some([arr[b], b + 1]) : Op.none))
  }
}

export function updateAt<K>(
  E: Eq<K>
): <A>(k: K, a: A) => (m: ReadonlyMap<K, A>) => Op.Option<ReadonlyMap<K, A>> {
  const lookupWithKeyE = lookupWithKey(E)
  return (k, a) => (m) => {
    const found = lookupWithKeyE(k, m)
    if (Op.isNone(found)) {
      return Op.none
    }
    const r = new Map(m)
    r.set(found.value[0], a)
    return Op.some(r)
  }
}

export const URI = "@matechs/core/Readonly/Map"

export type URI = typeof URI

declare module "../../Base/HKT" {
  interface URItoKind2<E, A> {
    readonly [URI]: ReadonlyMap<E, A>
  }
}

/**
 * Get a sorted array of the values contained in a map
 */
export function values<A>(O: Ord<A>): <K>(m: ReadonlyMap<K, A>) => ReadonlyArray<A> {
  return (m) => Array.from(m.values()).sort(O.compare)
}

export const readonlyMap: CFilterable2<URI> = {
  URI,
  _F: "curried",
  map,
  compact,
  separate,
  filter,
  filterMap,
  partition,
  partitionMap
}
