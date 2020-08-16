import { DecoderURI, primitivesDecoder } from "./decoder"
import { PrimitivesURI } from "./primitives"
import { PureStackURI, AsyncStackURI, SyncStackURI } from "./uris"
import {
  AsyncStackK,
  finalize,
  makeProgram,
  makeProgramAsync,
  SyncStackK
} from "./utils"

import * as T from "@matechs/preview/Effect"
import * as TA from "@matechs/preview/EffectAsync"
import { identity } from "@matechs/preview/Function"
import * as X from "@matechs/preview/XPure"

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

const PureF: SyncStackK<PureStackURI> = {
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
  provide: X.provideAll
}

export const decodePure = finalize<PrimitivesURI, DecoderURI, PureStackURI>()(
  primitivesDecoder(PureF)
)

const SyncF: SyncStackK<SyncStackURI> = {
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
  provide: T.provideAll
}

export const decodeSync = finalize<PrimitivesURI, DecoderURI, SyncStackURI>()(
  primitivesDecoder(SyncF)
)

const AsyncF: AsyncStackK<AsyncStackURI> = {
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
  provide: TA.provideAll
}

export const decodeAsync = finalize<PrimitivesURI, DecoderURI, AsyncStackURI>()({
  ...primitivesDecoder(AsyncF)
})

export const make = makeProgram<PrimitivesURI>()
export const makeAsync = makeProgramAsync<PrimitivesURI>()

export { makeInterpreter, makeProgram } from "./utils"
export { drawDecodeError } from "./decoder"
