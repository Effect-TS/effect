import type { MutableRecord } from "@effect-ts/system/Mutable"
import * as O from "@effect-ts/system/Option"
import * as R from "@effect-ts/system/Record"

import * as A from "../Array"
import type { Associative } from "../Associative"
import type { Closure } from "../Closure"
import * as E from "../Either"
import type { Equal } from "../Equal"
import { makeEqual } from "../Equal"
import { flow, identity, pipe, tuple } from "../Function"
import type { Identity } from "../Identity"
import { makeIdentity } from "../Identity"
import type { RecordURI } from "../Modules"
import type { Foldable } from "../Prelude"
import { succeedF } from "../Prelude"
import * as P from "../Prelude"
import type * as HKT from "../Prelude/HKT"
import type { Show } from "../Show"
import type { V } from "./definition"

export * from "@effect-ts/system/Record"

/**
 * Traverse Record with Applicative, passing index to f
 */
export const foreachWithIndexF = P.implementForeachWithIndexF<[RecordURI], V>()(
  (_) => (G) => {
    const succeed = succeedF(G)
    return (f) => (fa) => {
      let base = succeed<Record<typeof _.N, typeof _.B>>({} as any)
      for (const k of Object.keys(fa) as typeof _.N[]) {
        base = G.map(([x, b]: readonly [Record<typeof _.N, typeof _.B>, typeof _.B]) =>
          Object.assign(x, { [k]: b })
        )(G.both(f(k, fa[k]))(base))
      }
      return base
    }
  }
)

/**
 * Traverse Record with Applicative
 */
export const foreachF = P.implementForeachF<[RecordURI], V>()((_) => (G) => (f) =>
  foreachWithIndexF(G)((_, a) => f(a))
)

/**
 * Fold + MapWithIndex
 */
export const foldMapWithIndex: P.FoldMapWithIndexFn<[RecordURI], V> = (I) => (f) =>
  R.reduceWithIndex(I.identity, (k, b, a) => I.combine(f(k, a))(b))

/**
 * Fold + Map
 */
export const foldMap: P.FoldMapFn<[RecordURI], V> = (I) => (f) =>
  foldMapWithIndex(I)((_, a) => f(a))

/**
 * WiltWithIndex's separate
 */
export const separateWithIndexF = P.implementSeparateWithIndexF<[RecordURI], V>()(
  () => (G) => (f) =>
    flow(
      R.collect(tuple),
      A.separateF(G)(([k, a]) =>
        pipe(
          f(k, a),
          G.map(
            E.bimap(
              (b) => tuple(k, b),
              (a) => tuple(k, a)
            )
          )
        )
      ),
      G.map(({ left, right }) => ({
        left: R.fromArray(left),
        right: R.fromArray(right)
      }))
    )
)

/**
 * Wilt's separate
 */
export const separateF = P.implementSeparateF<[RecordURI], V>()(() => (G) => (f) =>
  separateWithIndexF(G)((_, a) => f(a))
)

/**
 * WitherWithIndex's compactWithIndex
 */
export const compactWithIndexF = P.implementCompactWithIndexF<[RecordURI], V>()(
  () => (G) => (f) =>
    flow(
      R.collect(tuple),
      A.compactF(G)(([k, a]) => pipe(f(k, a), G.map(O.map((b) => tuple(k, b))))),
      G.map(R.fromArray)
    )
)

/**
 * Wither's compact
 */
export const compactF = P.implementCompactF<[RecordURI], V>()(() => (G) => (f) =>
  compactWithIndexF(G)((_, a) => f(a))
)

/**
 * Like fromFoldable + map
 */
export function fromFoldableMap_<F extends HKT.URIS, C, B>(
  M: Closure<B>,
  F: Foldable<F, C>
): <N extends string, K, Q, W, X, I, S, R, E, A>(
  fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
  f: (a: A) => readonly [string, B]
) => R.Record<string, B>
export function fromFoldableMap_<F, B>(
  M: Closure<B>,
  F: Foldable<HKT.UHKT<F>>
): <A>(fa: HKT.HKT<F, A>, f: (a: A) => readonly [string, B]) => R.Record<string, B> {
  return <A>(fa: HKT.HKT<F, A>, f: (a: A) => readonly [string, B]) => {
    return F.reduce<A, MutableRecord<string, B>>({}, (r, a) => {
      const [k, b] = f(a)
      r[k] = Object.prototype.hasOwnProperty.call(r, k) ? M.combine(b)(r[k]) : b
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
  f: (a: A) => readonly [string, B]
) => <N extends string, K, Q, W, X, I, S, R, E>(
  fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
) => R.Record<string, B>
export function fromFoldableMap<F, B>(
  M: Closure<B>,
  F: Foldable<HKT.UHKT<F>>
): <A>(
  f: (a: A) => readonly [string, B]
) => (fa: HKT.HKT<F, A>) => R.Record<string, B> {
  const ff = fromFoldableMap_(M, F)
  return <A>(f: (a: A) => readonly [string, B]) => (fa: HKT.HKT<F, A>) => ff(fa, f)
}

/**
 * Construct a Record from a Foldable and a Closure of values
 */
export function fromFoldable<F extends HKT.URIS, C, A>(
  M: Closure<A>,
  F: Foldable<F>
): <N extends string, K, Q, W, X, I, S, R, E>(
  fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, readonly [string, A]>
) => R.Record<string, A> {
  const fromFoldableMapM = fromFoldableMap(M, F)
  return fromFoldableMapM(identity)
}

/**
 * Get Show of Record given Show of values
 */
export function getShow<A>(S: Show<A>): Show<R.Record<string, A>> {
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
): (x: R.Record<string, A>, y: R.Record<string, A>) => boolean {
  return (x, y) => {
    for (const k in x) {
      if (!Object.prototype.hasOwnProperty.call(y, k) || !E.equals(y[k])(x[k])) {
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
): (y: R.Record<string, A>) => (x: R.Record<string, A>) => boolean {
  const is = isSubrecord_(E)
  return (y) => (x) => is(x, y)
}

/**
 * Get Equals for record given Equals of values
 */
export function getEqual<K extends string, A>(E: Equal<A>): Equal<R.Record<K, A>> {
  const isSubrecordE = isSubrecord_(E)
  return makeEqual((y) => (x) => isSubrecordE(x, y) && isSubrecordE(y, x))
}

/**
 * Returns a `Identity` instance for records given a `Associative` instance for their values
 */
export function getIdentity<K extends string, A>(
  S: Associative<A>
): Identity<R.Record<K, A>> {
  return makeIdentity(R.empty as R.Record<K, A>, (y) => (x) => {
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
    const r: MutableRecord<K, A> = { ...x }
    for (let i = 0; i < len; i++) {
      const k = keys[i]
      r[k] = Object.prototype.hasOwnProperty.call(x, k) ? S.combine(y[k])(x[k]) : y[k]
    }
    return r
  })
}
