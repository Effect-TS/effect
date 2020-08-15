import { DecoderURI, primitivesDecoder } from "./decoder"
import { primitivesAsyncDecoder } from "./decoderAsync"
import { PrimitivesURI } from "./primitives"
import { PrimitivesAsyncURI } from "./primitivesAsync"
import {
  AsyncStackK,
  finalize,
  makeProgram,
  makeProgramAsync,
  SyncStackK
} from "./utils"

import * as T from "@matechs/preview/EffectAsync"
import { identity } from "@matechs/preview/Function"
import * as X from "@matechs/preview/XPure"

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
    [SyncStackURI]: X.XPure<unknown, unknown, unknown, Err, Out>
    [AsyncStackURI]: T.AsyncRE<T.DefaultEnv, Err, Out>
  }
}

const SyncF: SyncStackK<SyncStackURI> = {
  _stack: "SyncStack",
  URI: SyncStackURI,
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
  map: X.map
}

export const decodePure = finalize<PrimitivesURI, DecoderURI, SyncStackURI>()(
  primitivesDecoder(SyncF)
)

const AsyncF: AsyncStackK<AsyncStackURI> = {
  _stack: "AsyncStack",
  URI: AsyncStackURI,
  run: T.either,
  TL0: undefined as any,
  TL1: undefined as any,
  TL2: undefined as any,
  TL3: undefined as any,
  any: T.Any.any,
  both: T.AssociativeBoth.both,
  fail: T.Fail.fail,
  flatten: T.Monad.flatten,
  fromXPure: (xp) => T.fromEither(() => X.runEither(xp)),
  map: T.map,
  fromEffect: identity
}

export const decodeAsync = finalize<
  PrimitivesURI | PrimitivesAsyncURI,
  DecoderURI,
  AsyncStackURI
>()({
  ...primitivesDecoder(AsyncF),
  ...primitivesAsyncDecoder(AsyncF)
})

export const make = makeProgram<PrimitivesURI>()
export const makeAsync = makeProgramAsync<PrimitivesURI | PrimitivesAsyncURI>()

export { makeInterpreter, makeProgram } from "./utils"
