/**
 * @since 1.0.0
 */
import * as P from "../../Prelude"
import * as A from "../Array"

import { flow, tuple } from "@effect-ts/system/Function"
import * as R from "@effect-ts/system/Record"

/**
 * @since 1.0.0
 */
export const RecordURI = "RecordURI"
/**
 * @since 1.0.0
 */
export type RecordURI = typeof RecordURI

declare module "../../Prelude/HKT" {
  export interface URItoKind<N extends string, K, SI, SO, X, I, S, R, E, A> {
    [RecordURI]: R.Record<N, A>
  }
}

/**
 * @since 1.0.0
 */
export const Covariant = P.instance<P.Covariant<RecordURI>>({
  map: R.map
})

/**
 * @since 1.0.0
 */
export const foreachF = P.implementForeachF<RecordURI>()((_) => (G) => (f) =>
  flow(
    R.collect(tuple),
    A.foreachF(G)(([k, a]) => G.map((b) => tuple(k, b))(f(a))),
    G.map(
      A.reduce({} as R.Record<typeof _.N, typeof _.B>, (b, [k, v]) =>
        Object.assign(b, { [k]: v })
      )
    )
  )
)

/**
 * @since 1.0.0
 */
export const Traversable = P.instance<P.Traversable<RecordURI>>({
  map: R.map,
  foreachF
})
