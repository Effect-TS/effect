import * as P from "../Prelude"

import { constant, identity } from "@effect-ts/system/Function"
import * as X from "@effect-ts/system/XPure"

export const XPureURI = "XPureURI"

export type XPureURI = typeof XPureURI

declare module "../Prelude/HKT" {
  interface URItoKind<N extends string, K, SI, SO, X, I, S, R, E, A> {
    [XPureURI]: X.XPure<SI, SO, R, E, A>
  }
}

export const Any: P.Any<XPureURI> = P.instance<P.Any<XPureURI>>({
  any: () => X.succeed(constant({}))
})

export const Covariant = P.instance<P.Covariant<XPureURI>>({
  map: X.map
})

export const AssociativeBoth = P.instance<P.AssociativeBoth<XPureURI>>({
  both: X.zip
})

export const AssociativeEither = P.instance<P.AssociativeEither<XPureURI>>({
  either: X.orElseEither
})

export const AssociativeFlatten = P.instance<P.AssociativeFlatten<XPureURI>>({
  flatten: (ffa) => X.chain_(ffa, identity)
})

export const Applicative = P.instance<P.Applicative<XPureURI>>({
  ...Any,
  ...Covariant,
  ...AssociativeBoth
})

export const Access = P.instance<P.FX.Access<XPureURI>>({
  access: X.access
})

export const Fail = P.instance<P.FX.Fail<XPureURI>>({
  fail: X.fail
})

export const Provide = P.instance<P.FX.Provide<XPureURI>>({
  provide: X.provideAll
})

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
