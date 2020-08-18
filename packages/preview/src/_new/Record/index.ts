import * as R from "../../_system/Record"
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
