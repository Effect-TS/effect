import * as R from "@effect-ts/system/Record"

import type { AnyK } from "../_abstract/Any"
import type { CovariantK } from "../_abstract/Covariant"
import { instance } from "../_abstract/HKT"
import type { TraversableK } from "../_abstract/Traversable"
import { implementForeachF } from "../_abstract/Traversable"
import type { TraversableWithKeysK } from "../_abstract/TraversableWithKeys"
import { implementForeachWithKeysF } from "../_abstract/TraversableWithKeys"
import * as A from "../Array/core"
import type { Associative } from "../Associative"
import { pipe, tuple } from "../Function"
import type { Identity } from "../Identity"
import { makeIdentity } from "../Identity"

export const RecordURI = "Record"
export type RecordURI = typeof RecordURI

declare module "../_abstract/HKT" {
  interface URItoKind<
    TL0,
    TL1,
    TL2,
    TL3,
    K,
    NK extends string,
    SI,
    SO,
    X,
    I,
    S,
    Env,
    Err,
    Out
  > {
    [RecordURI]: R.Record<NK, Out>
  }
  interface URItoKeys<TL0, TL1, TL2, TL3, K, NK extends string> {
    [RecordURI]: NK
  }
}

/**
 * The `Any` instance for `Record[+_: String, +_]`
 */
export const Any = instance<AnyK<RecordURI>>({
  any: () => ({})
})

/**
 * The `Covariant` instance for `Record[+_: String, +_]`
 */
export const Covariant = instance<CovariantK<RecordURI>>({
  map: R.map
})

/**
 * TraversableWithKeys's `foreachWithKeysF` for `Record[+_: String, +_]`.
 */
export const foreachWithKeysF = implementForeachWithKeysF<RecordURI>()((_) => {
  const I = getIdentitySpread<typeof _._b>()<typeof _._fkn>()
  return (G) => (f) => (fa) =>
    pipe(
      R.collect_(fa, (k, a) => tuple(k, a)),
      A.foreachF(G)(([k, a]) =>
        pipe(
          f(a, k),
          G.map((b) => tuple(k, b))
        )
      ),
      G.map(
        A.foldMap(I)(
          ([k, v]) =>
            ({
              [k]: v
            } as R.Record<typeof _._fkn, typeof _._b>)
        )
      )
    )
})

/**
 * Traversable's `foreachF` for `Record[+_: String, +_]`.
 */
export const foreachF = implementForeachF<RecordURI>()(() => (G) => (f) =>
  foreachWithKeysF(G)((a) => f(a))
)

/**
 * The `Traversable` instance for `Record[+_: String, +_]`
 */
export const Traversable = instance<TraversableK<RecordURI>>({
  ...Covariant,
  foreachF
})

/**
 * The `TraversableWithKeys` instance for `Record[+_: String, +_]`
 */
export const TraversableWithKeys = instance<TraversableWithKeysK<RecordURI>>({
  ...Covariant,
  foreachWithKeysF
})

/**
 * The `Identity` instance for `Record`, uses object spread
 */
export function getIdentitySpread<B>(): <FK extends string>() => Identity<
  Readonly<Record<FK, B>>
> {
  return <FK extends string>() =>
    makeIdentity({} as R.Record<FK, B>, (y) => (x) => ({
      ...x,
      ...y
    }))
}

/**
 * The `Identity` instance for `Record`
 */
export function getIdentity<A>(
  S: Associative<A>
): <K extends string>() => Identity<Record<K, A>> {
  return <K extends string>() =>
    makeIdentity(R.empty as R.Record<K, A>, (y) => (x) => {
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
      const r: Record<K, A> = { ...x }
      for (let i = 0; i < len; i++) {
        const k = keys[i]
        r[k] = Object.prototype.hasOwnProperty.call(x, k) ? S.combine(y[k])(x[k]) : y[k]
      }
      return r
    })
}
