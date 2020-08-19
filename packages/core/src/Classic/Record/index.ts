import * as P from "../../Prelude"
import * as A from "../Array"

import { flow, tuple } from "@effect-ts/system/Function"
import * as R from "@effect-ts/system/Record"

export const RecordURI = "RecordURI"

export type RecordURI = typeof RecordURI

declare module "../../Prelude/HKT" {
  export interface URItoKind<N extends string, K, SI, SO, X, I, S, R, E, A> {
    [RecordURI]: R.Record<N, A>
  }
}

export const Covariant = P.instance<P.Covariant<RecordURI>>({
  map: R.map
})

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

export const Traversable = P.instance<P.Traversable<RecordURI>>({
  map: R.map,
  foreachF
})
