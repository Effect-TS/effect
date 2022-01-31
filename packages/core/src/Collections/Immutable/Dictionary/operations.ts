// ets_tracing: off

import * as R from "@effect-ts/system/Collections/Immutable/Dictionary"
import * as Tp from "@effect-ts/system/Collections/Immutable/Tuple"
import * as O from "@effect-ts/system/Option"
import type { MutableRecord } from "@effect-ts/system/Support/Mutable"

import type { Associative } from "../../../Associative/index.js"
import type { Closure } from "../../../Closure/index.js"
import * as E from "../../../Either/index.js"
import type { Equal } from "../../../Equal/index.js"
import { makeEqual } from "../../../Equal/index.js"
import { identity, pipe, tuple } from "../../../Function/index.js"
import type { Identity } from "../../../Identity/index.js"
import { makeIdentity } from "../../../Identity/index.js"
import type { DictionaryURI } from "../../../Modules/index.js"
import type * as HKT from "../../../Prelude/HKT/index.js"
import type { Foldable, URI } from "../../../Prelude/index.js"
import * as P from "../../../Prelude/index.js"
import { succeedF } from "../../../Prelude/index.js"
import type { Show } from "../../../Show/index.js"
import * as A from "../Array/index.js"

export * from "@effect-ts/system/Collections/Immutable/Dictionary"

/**
 * Traverse Record with Applicative, passing index to f
 */
export const forEachWithIndexF = P.implementForEachWithIndexF<[URI<DictionaryURI>]>()(
  (_) => (G) => {
    const succeed = succeedF(G)
    return (f) => (fa) => {
      let base = succeed<R.Dictionary<typeof _.B>>({} as any)
      for (const k of Object.keys(fa)) {
        base = G.map(
          ({ tuple: [x, b] }: Tp.Tuple<[R.Dictionary<typeof _.B>, typeof _.B]>) =>
            Object.assign(x, { [k]: b })
        )(G.both(f(k, fa[k]!))(base))
      }
      return base
    }
  }
)

/**
 * Traverse Record with Applicative
 */
export const forEachF = P.implementForEachF<[URI<DictionaryURI>]>()(
  (_) => (G) => (f) => forEachWithIndexF(G)((_, a) => f(a))
)

/**
 * Fold + MapWithIndex
 */
export const foldMapWithIndex: P.FoldMapWithIndexFn<[URI<DictionaryURI>]> =
  (I) => (f) =>
    R.reduceWithIndex(I.identity, (k, b, a) => I.combine(b, f(k, a)))

/**
 * Fold + Map
 */
export const foldMap: P.FoldMapFn<[URI<DictionaryURI>]> = (I) => (f) =>
  foldMapWithIndex(I)((_, a) => f(a))

/**
 * WiltWithIndex's separate
 */
export const separateWithIndexF = P.implementSeparateWithIndexF<[URI<DictionaryURI>]>()(
  () => (G) => (f) => (x) =>
    pipe(
      x,
      R.collect(tuple),
      A.separateF(G)(([k, a]) =>
        pipe(
          f(k, a),
          G.map(
            E.bimap(
              (b) => Tp.tuple(k, b),
              (a) => Tp.tuple(k, a)
            )
          )
        )
      ),
      G.map(({ tuple: [left, right] }) =>
        Tp.tuple(R.fromArray(left), R.fromArray(right))
      )
    )
)

/**
 * Wilt's separate
 */
export const separateF = P.implementSeparateF<[URI<DictionaryURI>]>()(
  () => (G) => (f) => separateWithIndexF(G)((_, a) => f(a))
)

/**
 * WitherWithIndex's compactWithIndex
 */
export const compactWithIndexF = P.implementCompactWithIndexF<[URI<DictionaryURI>]>()(
  () => (G) => (f) => (x) =>
    pipe(
      x,
      R.collect(tuple),
      A.compactF(G)(([k, a]) => pipe(f(k, a), G.map(O.map((b) => Tp.tuple(k, b))))),
      G.map(R.fromArray)
    )
)

/**
 * Wither's compact
 */
export const compactF = P.implementCompactF<[URI<DictionaryURI>]>()(
  () => (G) => (f) => compactWithIndexF(G)((_, a) => f(a))
)

/**
 * Like fromFoldable + map
 */
export function fromFoldableMap_<F extends HKT.URIS, C, B>(
  M: Closure<B>,
  F: Foldable<F, C>
): <K, Q, W, X, I, S, R, E, A>(
  fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>,
  f: (a: A) => Tp.Tuple<[string, B]>
) => R.Dictionary<B>
export function fromFoldableMap_<F, B>(
  M: Closure<B>,
  F: Foldable<HKT.UHKT<F>>
): <A>(fa: HKT.HKT<F, A>, f: (a: A) => Tp.Tuple<[string, B]>) => R.Dictionary<B> {
  return <A>(fa: HKT.HKT<F, A>, f: (a: A) => Tp.Tuple<[string, B]>) => {
    return F.reduce<A, MutableRecord<string, B>>({}, (r, a) => {
      const [k, b] = f(a).tuple
      r[k] = Object.prototype.hasOwnProperty.call(r, k) ? M.combine(r[k]!, b) : b
      return r
    })(fa)
  }
}

/**
 * Like fromFoldable + map
 */
export function fromFoldableMap<F extends HKT.URIS, C, B>(
  M: Closure<B>,
  F: Foldable<F, C>
): <A>(
  f: (a: A) => Tp.Tuple<[string, B]>
) => <K, Q, W, X, I, S, R, E>(
  fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
) => R.Dictionary<B>
export function fromFoldableMap<F, B>(
  M: Closure<B>,
  F: Foldable<HKT.UHKT<F>>
): <A>(f: (a: A) => Tp.Tuple<[string, B]>) => (fa: HKT.HKT<F, A>) => R.Dictionary<B> {
  const ff = fromFoldableMap_(M, F)
  return <A>(f: (a: A) => Tp.Tuple<[string, B]>) =>
    (fa: HKT.HKT<F, A>) =>
      ff(fa, f)
}

/**
 * Construct a Record from a Foldable and a Closure of values
 */
export function fromFoldable<F extends HKT.URIS, C, A>(
  M: Closure<A>,
  F: Foldable<F>
): <K, Q, W, X, I, S, R, E>(
  fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, Tp.Tuple<[string, A]>>
) => R.Dictionary<A>
export function fromFoldable<F, A>(
  M: Closure<A>,
  F: Foldable<HKT.UHKT<F>>
): (fa: HKT.HKT<F, Tp.Tuple<[string, A]>>) => R.Dictionary<A> {
  const fromFoldableMapM = fromFoldableMap(M, F)
  return fromFoldableMapM(identity)
}

/**
 * Get Show of Record given Show of values
 */
export function getShow<A>(S: Show<A>): Show<R.Dictionary<A>> {
  return {
    show: (r) => {
      const elements = R.collect((k, a: A) => `${JSON.stringify(k)}: ${S.show(a)}`)(
        r
      ).join(", ")
      return elements === "" ? "{}" : `{ ${elements} }`
    }
  }
}

/**
 * Test whether one record contains all of the keys and values contained in another record
 */
export function isSubrecord_<A>(
  E: Equal<A>
): (x: R.Dictionary<A>, y: R.Dictionary<A>) => boolean {
  return (x, y) => {
    for (const k in x) {
      if (!Object.prototype.hasOwnProperty.call(y, k) || !E.equals(x[k]!, y[k]!)) {
        return false
      }
    }
    return true
  }
}

/**
 * Test whether one record contains all of the keys and values contained in another record
 */
export function isSubrecord<A>(
  E: Equal<A>
): (y: R.Dictionary<A>) => (x: R.Dictionary<A>) => boolean {
  const is = isSubrecord_(E)
  return (y) => (x) => is(x, y)
}

/**
 * Get Equals for record given Equals of values
 */
export function getEqual<A>(E: Equal<A>): Equal<R.Dictionary<A>> {
  const isSubrecordE = isSubrecord_(E)
  return makeEqual((x, y) => isSubrecordE(x, y) && isSubrecordE(y, x))
}

/**
 * Returns a `Identity` instance for records given a `Associative` instance for their values
 */
export function getIdentity<A>(S: Associative<A>): Identity<R.Dictionary<A>> {
  return makeIdentity(R.empty as R.Dictionary<A>, (x, y) => {
    if (x === R.empty) {
      return y
    }
    if (y === R.empty) {
      return x
    }
    const keys = Object.keys(y)
    const len = keys.length
    if (len === 0) {
      return x
    }
    const r: MutableRecord<string, A> = { ...x }
    for (let i = 0; i < len; i++) {
      const k = keys[i]!
      r[k] = Object.prototype.hasOwnProperty.call(x, k)
        ? S.combine(x[k]!, y[k]!)
        : y[k]!
    }
    return r
  })
}
