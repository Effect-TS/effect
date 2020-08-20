import { constant, identity } from "@effect-ts/system/Function"
import * as X from "@effect-ts/system/XPure"

import type * as P from "../Prelude"

export const XPureURI = "XPureURI"
export type XPureURI = typeof XPureURI

declare module "../Prelude/HKT" {
  interface URItoKind<N extends string, K, SI, SO, X, I, S, R, E, A> {
    [XPureURI]: X.XPure<SI, SO, R, E, A>
  }
}

export const Any: P.Any<XPureURI> = {
  F: XPureURI,
  any: () => X.succeed(constant({}))
}

export const AssociativeBoth: P.AssociativeBoth<XPureURI> = {
  F: XPureURI,
  both: X.zip
}

export const AssociativeEither: P.AssociativeEither<XPureURI> = {
  F: XPureURI,
  either: X.orElseEither
}

export const AssociativeFlatten: P.AssociativeFlatten<XPureURI> = {
  F: XPureURI,
  flatten: (ffa) => X.chain_(ffa, identity)
}

export {
  access,
  accessM,
  bimap,
  bimap_,
  catchAll,
  catchAll_,
  chain,
  chain_,
  contramapInput,
  either,
  environment,
  fail,
  fold,
  foldM,
  foldM_,
  fold_,
  map,
  mapError,
  mapError_,
  map_,
  modify,
  orElseEither,
  orElseEither_,
  provideAll,
  provideSome,
  run,
  runEither,
  runIO,
  runResult,
  runResult_,
  runState,
  runStateEither,
  runStateEither_,
  runStateResult,
  runStateResult_,
  runState_,
  run_,
  succeed,
  suspend,
  sync,
  tap,
  tap_,
  tryCatch,
  unit,
  update,
  XPure,
  zip,
  zipWith,
  zipWith_,
  zip_
} from "@effect-ts/system/XPure"
