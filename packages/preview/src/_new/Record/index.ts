import { pipe, tuple } from "../../Function"
import * as R from "../../_system/Record"
import * as A from "../Array"
import * as P from "../Prelude"

export const RecordURI = "RecordURI"
export type RecordURI = typeof RecordURI

declare module "../HKT" {
  export interface URItoKind<N extends string, K, SI, SO, X, I, S, R, E, A> {
    [RecordURI]: R.Record<N, A>
  }
}

export const Covariant = P.instance<P.Covariant<RecordURI>>({
  map: R.map
})

export const foreachF = P.implementForeachF<RecordURI>()((_) => (G) => (f) => (r) =>
  pipe(
    R.collect_(r, tuple),
    A.foreachF(G)(([k, a]) =>
      pipe(
        f(a),
        G.map((b) => tuple(k, b))
      )
    ),
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
