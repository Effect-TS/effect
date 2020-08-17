import { AsyncStackK, SyncStackK } from "../utils"

import * as T from "@matechs/preview/Effect"
import * as TA from "@matechs/preview/EffectAsync"
import { identity } from "@matechs/preview/Function"
import * as X from "@matechs/preview/XPure"

export const PureStackURI = "morphic/PureStack"
export type PureStackURI = typeof PureStackURI

export const SyncStackURI = "morphic/SyncStack"
export type SyncStackURI = typeof SyncStackURI

export const AsyncStackURI = "morphic/AsyncStack"
export type AsyncStackURI = typeof AsyncStackURI

declare module "@matechs/preview/_abstract/HKT" {
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
    [PureStackURI]: X.XPure<unknown, unknown, Env, Err, Out>
    [SyncStackURI]: T.SyncRE<Env, Err, Out>
    [AsyncStackURI]: TA.AsyncRE<Env, Err, Out>
  }
}

export const Sync: SyncStackK<SyncStackURI> = {
  _stack: "SyncStack",
  URI: SyncStackURI,
  run: T.either,
  TL0: undefined as any,
  TL1: undefined as any,
  TL2: undefined as any,
  TL3: undefined as any,
  any: T.Any.any,
  both: T.zip,
  fail: T.Fail.fail,
  flatten: T.flatten,
  fromXPure: <R, E, A>(xp: X.XPure<unknown, unknown, R, E, A>) =>
    T.accessM((r: R) => T.fromEither(() => X.runEither(X.provideAll(r)(xp)))),
  map: T.map,
  access: T.access,
  provide: T.provideAll,
  wrapErr: identity,
  unwrapErr: identity
}

export const Pure: SyncStackK<PureStackURI> = {
  _stack: "SyncStack",
  URI: PureStackURI,
  run: X.either,
  TL0: undefined as any,
  TL1: undefined as any,
  TL2: undefined as any,
  TL3: undefined as any,
  any: X.Any.any,
  both: X.AssociativeBoth.both,
  fail: X.Fail.fail,
  flatten: X.Monad.flatten,
  fromXPure: identity,
  map: X.map,
  access: X.access,
  provide: X.provideAll,
  wrapErr: identity,
  unwrapErr: identity
}

export const Async: AsyncStackK<AsyncStackURI> = {
  _stack: "AsyncStack",
  URI: AsyncStackURI,
  run: TA.either,
  TL0: undefined as any,
  TL1: undefined as any,
  TL2: undefined as any,
  TL3: undefined as any,
  any: TA.Any.any,
  both: TA.AssociativeBoth.both,
  fail: TA.Fail.fail,
  flatten: TA.Monad.flatten,
  fromXPure: <R, E, A>(xp: X.XPure<unknown, unknown, R, E, A>) =>
    TA.accessM((r: R) => TA.fromEither(() => X.runEither(X.provideAll(r)(xp)))),
  map: TA.map,
  fromEffect: identity,
  access: TA.access,
  provide: TA.provideAll,
  wrapErr: identity,
  unwrapErr: identity
}
