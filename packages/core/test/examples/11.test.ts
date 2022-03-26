import * as M from "@effect-ts/system/Collections/Immutable/Map"
import * as Tp from "@effect-ts/system/Collections/Immutable/Tuple"
import { flow, identity, pipe } from "@effect-ts/system/Function"

import * as E from "../../src/Either/index.js"
import * as EitherT from "../../src/EitherT/index.js"
import * as DSL from "../../src/PreludeV2/DSL/index.js"
import type * as H from "../../src/PreludeV2/HKT/index.js"
import * as P from "../../src/PreludeV2/index.js"
import * as T from "../../src/XPure/index.js"
import * as R from "../../src/XPure/XReader/index.js"
import * as ReaderT from "../../src/XPure/XReaderT/index.js"

type State<K, V> = M.Map<K, V>

export interface Store<K, V, A>
  extends T.XPure<unknown, State<K, V>, State<K, V>, unknown, never, A> {}

export const URI = "Store"
export type URI = typeof URI

type StoreKey = "StoreKey"
type StoreValue = "StoreValue"
type Params<K, V> = H.CustomType<StoreKey, K> & H.CustomType<StoreValue, V>

declare module "../../src/Prelude/HKT" {
  export interface URItoKind<FC, TC, K, Q, W, X, I, S, R, E, A> {
    [URI]: Store<H.AccessCustom<TC, StoreKey>, H.AccessCustom<TC, StoreValue>, A>
  }
}

export const getStoreMonad = <K, V>() =>
  P.instance<P.Monad<[H.URI<URI>], Params<K, V>>>({
    any: () => T.Any.any(),
    flatten: (ffa) => T.chain_(ffa, identity),
    map: T.map
  })

export const K = pipe(getStoreMonad<string, number>(), EitherT.monad, ReaderT.monad)

export const chain = DSL.chainF(K)

export const succeed = DSL.succeedF(K)

test("11", () => {
  const result = pipe(
    succeed("hello"),
    R.map(
      T.chain(
        E.fold(
          (e) => T.succeed(E.left(e)),
          (v) =>
            T.modify(
              flow(
                M.toMutable,
                (s) => s.set(v, v.length),
                M.fromMutable,
                (s) => Tp.tuple(s, E.right(v.length))
              )
            )
        )
      )
    ),
    chain((x) => T.accessM((y: number) => succeed(x * y))),
    R.runEnv(2),
    T.runState(M.empty)
  )

  expect(result).toEqual(Tp.tuple(M.singleton("hello", 5), E.right(10)))
})
