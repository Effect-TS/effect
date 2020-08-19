/**
 * @since 1.0.0
 */
import * as P from "../Prelude"

import { constant, identity } from "@effect-ts/system/Function"
import * as X from "@effect-ts/system/XPure"

/**
 * @since 1.0.0
 */
export const XPureURI = "XPureURI"

/**
 * @since 1.0.0
 */
export type XPureURI = typeof XPureURI

declare module "../Prelude/HKT" {
  interface URItoKind<N extends string, K, SI, SO, X, I, S, R, E, A> {
    [XPureURI]: X.XPure<SI, SO, R, E, A>
  }
}

/**
 * @since 1.0.0
 */
export const Any: P.Any<XPureURI> = {
  F: XPureURI,
  any: () => X.succeed(constant({}))
}

/**
 * @since 1.0.0
 */
export const AssociativeBoth = P.instance<P.AssociativeBoth<XPureURI>>({
  both: X.zip
})

/**
 * @since 1.0.0
 */
export const AssociativeEither = P.instance<P.AssociativeEither<XPureURI>>({
  either: X.orElseEither
})

/**
 * @since 1.0.0
 */
export const AssociativeFlatten = P.instance<P.AssociativeFlatten<XPureURI>>({
  flatten: (ffa) => X.chain_(ffa, identity)
})

export {
  /**
   * @since 1.0.0
   */
  access,
  /**
   * @since 1.0.0
   */
  accessM,
  /**
   * @since 1.0.0
   */
  bimap,
  /**
   * @since 1.0.0
   */
  bimap_,
  /**
   * @since 1.0.0
   */
  catchAll,
  /**
   * @since 1.0.0
   */
  catchAll_,
  /**
   * @since 1.0.0
   */
  chain,
  /**
   * @since 1.0.0
   */
  chain_,
  /**
   * @since 1.0.0
   */
  contramapInput,
  /**
   * @since 1.0.0
   */
  either,
  /**
   * @since 1.0.0
   */
  environment,
  /**
   * @since 1.0.0
   */
  fail,
  /**
   * @since 1.0.0
   */
  fold,
  /**
   * @since 1.0.0
   */
  foldM,
  /**
   * @since 1.0.0
   */
  foldM_,
  /**
   * @since 1.0.0
   */
  fold_,
  /**
   * @since 1.0.0
   */
  map,
  /**
   * @since 1.0.0
   */
  mapError,
  /**
   * @since 1.0.0
   */
  mapError_,
  /**
   * @since 1.0.0
   */
  map_,
  /**
   * @since 1.0.0
   */
  modify,
  /**
   * @since 1.0.0
   */
  orElseEither,
  /**
   * @since 1.0.0
   */
  orElseEither_,
  /**
   * @since 1.0.0
   */
  provideAll,
  /**
   * @since 1.0.0
   */
  provideSome,
  /**
   * @since 1.0.0
   */
  run,
  /**
   * @since 1.0.0
   */
  runEither,
  /**
   * @since 1.0.0
   */
  runIO,
  /**
   * @since 1.0.0
   */
  runResult,
  /**
   * @since 1.0.0
   */
  runResult_,
  /**
   * @since 1.0.0
   */
  runState,
  /**
   * @since 1.0.0
   */
  runStateEither,
  /**
   * @since 1.0.0
   */
  runStateEither_,
  /**
   * @since 1.0.0
   */
  runStateResult,
  /**
   * @since 1.0.0
   */
  runStateResult_,
  /**
   * @since 1.0.0
   */
  runState_,
  /**
   * @since 1.0.0
   */
  run_,
  /**
   * @since 1.0.0
   */
  succeed,
  /**
   * @since 1.0.0
   */
  suspend,
  /**
   * @since 1.0.0
   */
  sync,
  /**
   * @since 1.0.0
   */
  tap,
  /**
   * @since 1.0.0
   */
  tap_,
  /**
   * @since 1.0.0
   */
  tryCatch,
  /**
   * @since 1.0.0
   */
  unit,
  /**
   * @since 1.0.0
   */
  update,
  /**
   * @since 1.0.0
   */
  XPure,
  /**
   * @since 1.0.0
   */
  zip,
  /**
   * @since 1.0.0
   */
  zipWith,
  /**
   * @since 1.0.0
   */
  zipWith_,
  /**
   * @since 1.0.0
   */
  zip_
} from "@effect-ts/system/XPure"
