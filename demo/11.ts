import type * as M from "@effect-ts/system/Map"

import { getEitherM } from "../src/Classic/EitherT"
import { identity } from "../src/Function"
import * as P from "../src/Prelude"
import type * as H from "../src/Prelude/HKT"
import * as T from "../src/Pure"
import { getReaderM } from "../src/Pure/ReaderT"

type State<K, V> = M.Map<K, V>

export interface Store<K, V, A>
  extends T.XPure<State<K, V>, State<K, V>, unknown, never, A> {}

export const URI = "Store"
export type URI = typeof URI

type SK = "SK"
type SV = "SV"
type Params<K, V> = H.CT<SK, K> & H.CT<SV, V>

declare module "../src/Prelude/HKT" {
  export interface URItoKind<D, N extends string, K, SI, SO, X, I, S, R, E, A> {
    [URI]: Store<H.Custom<D, SK>, H.Custom<D, SV>, A>
  }
}

export const getMonad = <K, V>() =>
  P.instance<P.Monad<[URI], Params<K, V>>>({
    any: T.Any.any,
    flatten: (ffa) => T.chain_(ffa, identity),
    map: T.map
  })

export const K = getReaderM(getEitherM(getMonad<string, number>()))
