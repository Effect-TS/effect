import { constant, identity } from "@effect-ts/system/Function"
import * as X from "@effect-ts/system/XPure"

import * as P from "../Prelude"
import { sequenceSF } from "../Prelude/DSL"

export type V = P.V<"R", "-"> & P.V<"E", "+">

export const XPureURI = "XPureURI"

export type XPureURI = typeof XPureURI

declare module "../Prelude/HKT" {
  interface URItoKind<N extends string, K, SI, SO, X, I, S, R, E, A> {
    [XPureURI]: X.XPure<SI, SO, R, E, A>
  }
}

export const Any = P.instance<P.Any<XPureURI, V>>({
  any: () => X.succeed(constant({}))
})

export const Covariant = P.instance<P.Covariant<XPureURI, V>>({
  map: X.map
})

export const AssociativeBoth = P.instance<P.AssociativeBoth<XPureURI, V>>({
  both: X.zip
})

export const AssociativeEither = P.instance<P.AssociativeEither<XPureURI, V>>({
  either: X.orElseEither
})

export const AssociativeFlatten = P.instance<P.AssociativeFlatten<XPureURI, V>>({
  flatten: (ffa) => X.chain_(ffa, identity)
})

export const Applicative = P.instance<P.Applicative<XPureURI, V>>({
  ...Any,
  ...Covariant,
  ...AssociativeBoth
})

export const Access = P.instance<P.FX.Access<XPureURI, V>>({
  access: X.access
})

export const Fail = P.instance<P.FX.Fail<XPureURI, V>>({
  fail: X.fail
})

export const Provide = P.instance<P.FX.Provide<XPureURI, V>>({
  provide: X.provideAll
})

export const sequenceS = sequenceSF(Applicative)

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
