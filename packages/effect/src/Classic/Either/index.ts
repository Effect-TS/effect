/**
 * @since 1.0.0
 */

import * as P from "../../Prelude"
import { getValidationF } from "../../Prelude/FX/Validation"
import { Associative } from "../Associative"

import * as E from "@effect-ts/system/Either"
import { pipe, tuple } from "@effect-ts/system/Function"

/**
 * @since 1.0.0
 */
export const EitherURI = "EitherURI"

/**
 * @since 1.0.0
 */
export type EitherURI = typeof EitherURI

declare module "../../Prelude/HKT" {
  interface URItoKind<N extends string, K, SI, SO, X, I, S, R, E, A> {
    [EitherURI]: E.Either<E, A>
  }
}

/**
 * @since 1.0.0
 */
export const Any: P.Any<EitherURI> = {
  F: EitherURI,
  any: () => E.right({})
}

/**
 * @since 1.0.0
 */
export const AssociativeBoth = P.instance<P.AssociativeBoth<EitherURI>>({
  both: E.zip
})

/**
 * @since 1.0.0
 */
export const AssociativeEither = P.instance<P.AssociativeEither<EitherURI>>({
  either: (fb) => (fa) =>
    fa._tag === "Right"
      ? E.right(E.left(fa.right))
      : fb._tag === "Right"
      ? E.right(fb)
      : fb
})

/**
 * @since 1.0.0
 */
export const AssociativeFlatten = P.instance<P.AssociativeFlatten<EitherURI>>({
  flatten: E.flatten
})

/**
 * @since 1.0.0
 */
export const Covariant = P.instance<P.Covariant<EitherURI>>({
  map: E.map
})

/**
 * @since 1.0.0
 */
export const Applicative: P.Applicative<EitherURI> = {
  ...Any,
  ...Covariant,
  ...AssociativeBoth
}

/**
 * @since 1.0.0
 */
export const Monad: P.Monad<EitherURI> = {
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
}

/**
 * @since 1.0.0
 */
export const getValidationApplicative = getValidationF<EitherURI>({
  F: EitherURI,
  any: Any.any,
  both: E.zip,
  fail: E.left,
  flatten: E.flatten,
  map: E.map,
  run: E.right
})

/**
 * @since 1.0.0
 */
export function zipValidation<E>(
  A: Associative<E>
): <B>(fb: E.Either<E, B>) => <A>(fa: E.Either<E, A>) => E.Either<E, readonly [A, B]> {
  return (fb) =>
    E.fold(
      (ea) =>
        E.fold_(
          fb,
          (eb) => E.left(A.combine(eb)(ea)),
          () => E.left(ea)
        ),
      (a) => E.fold_(fb, E.left, (b) => E.right(tuple(a, b)))
    )
}

/**
 * @since 1.0.0
 */
export const foreachF = P.implementForeachF<EitherURI>()((_) => (G) => (f) => (fa) =>
  E.isLeft(fa)
    ? pipe(
        G.any(),
        G.map(() => fa)
      )
    : pipe(f(fa.right), G.map(E.right))
)

/**
 * @since 1.0.0
 */
export const Traversable = P.instance<P.Traversable<EitherURI>>({
  map: E.map,
  foreachF
})

export {
  /**
   * @since 1.0.0
   */
  alt,
  /**
   * @since 1.0.0
   */
  alt_,
  /**
   * @since 1.0.0
   */
  ap,
  /**
   * @since 1.0.0
   */
  ap_,
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
  chain,
  /**
   * @since 1.0.0
   */
  chain_,
  /**
   * @since 1.0.0
   */
  compact,
  /**
   * @since 1.0.0
   */
  duplicate,
  /**
   * @since 1.0.0
   */
  Either,
  /**
   * @since 1.0.0
   */
  exists,
  /**
   * @since 1.0.0
   */
  exists_,
  /**
   * @since 1.0.0
   */
  extend,
  /**
   * @since 1.0.0
   */
  extend_,
  /**
   * @since 1.0.0
   */
  filterOrElse,
  /**
   * @since 1.0.0
   */
  filterOrElse_,
  /**
   * @since 1.0.0
   */
  flatten,
  /**
   * @since 1.0.0
   */
  fold,
  /**
   * @since 1.0.0
   */
  fold_,
  /**
   * @since 1.0.0
   */
  fromNullable,
  /**
   * @since 1.0.0
   */
  fromNullable_,
  /**
   * @since 1.0.0
   */
  fromOption,
  /**
   * @since 1.0.0
   */
  fromOption_,
  /**
   * @since 1.0.0
   */
  fromPredicate,
  /**
   * @since 1.0.0
   */
  fromPredicate_,
  /**
   * @since 1.0.0
   */
  getOrElse,
  /**
   * @since 1.0.0
   */
  getOrElse_,
  /**
   * @since 1.0.0
   */
  isLeft,
  /**
   * @since 1.0.0
   */
  isRight,
  /**
   * @since 1.0.0
   */
  Left,
  /**
   * @since 1.0.0
   */
  left,
  /**
   * @since 1.0.0
   */
  map,
  /**
   * @since 1.0.0
   */
  mapLeft,
  /**
   * @since 1.0.0
   */
  mapLeft_,
  /**
   * @since 1.0.0
   */
  map_,
  /**
   * @since 1.0.0
   */
  merge,
  /**
   * @since 1.0.0
   */
  orElse,
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
  orElse_,
  /**
   * @since 1.0.0
   */
  parseJSON,
  /**
   * @since 1.0.0
   */
  parseJSON_,
  /**
   * @since 1.0.0
   */
  Right,
  /**
   * @since 1.0.0
   */
  right,
  /**
   * @since 1.0.0
   */
  stringifyJSON,
  /**
   * @since 1.0.0
   */
  swap,
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
  toError,
  /**
   * @since 1.0.0
   */
  tryCatch,
  /**
   * @since 1.0.0
   */
  tryCatch_,
  /**
   * @since 1.0.0
   */
  widenA,
  /**
   * @since 1.0.0
   */
  widenE,
  /**
   * @since 1.0.0
   */
  zip,
  /**
   * @since 1.0.0
   */
  zipFirst,
  /**
   * @since 1.0.0
   */
  zipFirst_,
  /**
   * @since 1.0.0
   */
  zipSecond,
  /**
   * @since 1.0.0
   */
  zipSecond_,
  /**
   * @since 1.0.0
   */
  zip_
} from "@effect-ts/system/Either"
