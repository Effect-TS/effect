import { identity, pipe } from "@effect-ts/system/Function"
import type * as M from "@effect-ts/system/Map"

import * as EitherT from "../../src/Classic/EitherT"
import * as P from "../../src/Prelude"
import * as DSL from "../../src/Prelude/DSL"
import type * as H from "../../src/Prelude/HKT"
import * as T from "../../src/Pure"
import * as ReaderT from "../../src/Pure/ReaderT"

type State<K, V> = M.Map<K, V>

export interface Store<K, V, A>
  extends T.XPure<State<K, V>, State<K, V>, unknown, never, A> {}

export const URI = "Store"
export type URI = typeof URI

type StoreKey = "StoreKey"
type StoreValue = "StoreValue"
type Params<K, V> = H.CT<StoreKey, K> & H.CT<StoreValue, V>

declare module "../../src/Prelude/HKT" {
  export interface URItoKind<D, N extends string, K, SI, SO, X, I, S, R, E, A> {
    [URI]: Store<H.Custom<D, StoreKey>, H.Custom<D, StoreValue>, A>
  }
}

export const getStoreMonad = <K, V>() =>
  P.instance<P.Monad<[URI], Params<K, V>>>({
    any: T.Any.any,
    flatten: (ffa) => T.chain_(ffa, identity),
    map: T.map
  })

export const K = pipe(getStoreMonad<string, number>(), EitherT.monad(), ReaderT.monad())

export const chain = DSL.chainF(K)

export const succeed = DSL.succeedF(K)

test("11", () => {})
