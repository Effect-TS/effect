import * as A from "../Array/core"
import { pipe, tuple } from "../Function"
import { makeIdentity } from "../Identity"
import { makeAny } from "../_abstract/Any"
import { makeCovariant } from "../_abstract/Covariant"
import { implementForeachF, makeTraversable } from "../_abstract/Traversable"
import * as R from "../_system/Record"

export const RecordURI = "Record"
export type RecordURI = typeof RecordURI

declare module "../_abstract/HKT" {
  interface URItoKind<K extends string, SI, SO, X, I, S, Env, Err, Out> {
    [RecordURI]: R.Record<K, Out>
  }
}

/**
 * The `Any` instance for `Record[+_: String, +_]`
 */
export const Any = makeAny(RecordURI)({
  any: () => ({})
})

/**
 * The `Covariant` instance for `Record[+_: String, +_]`
 */
export const Covariant = makeCovariant(RecordURI)({
  map: R.map
})

/**
 * Traversable's `foreachF` for `Record[+_: String, +_]`.
 */
export const foreachF = implementForeachF(RecordURI)(
  ({ _b, _fk }) => (G) => (f) => (fa) =>
    pipe(
      R.collect_(fa, (k, a) => tuple(k, a)),
      A.foreachF(G)(([k, a]) =>
        pipe(
          f(a),
          G.map((b) => tuple(k, b))
        )
      ),
      G.map(
        A.foldMap(
          makeIdentity({} as R.Record<typeof _fk, typeof _b>, (y) => (x) => ({
            ...x,
            ...y
          }))
        )(
          ([k, v]) =>
            ({
              [k]: v
            } as R.Record<typeof _fk, typeof _b>)
        )
      )
    )
)

/**
 * The `Traversable` instance for `Record[+_: String, +_]`
 */
export const Traversable = makeTraversable(Covariant)({
  foreachF
})
