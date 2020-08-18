import * as E from "../../_system/Either"
import { tuple } from "../../_system/Function"
import { Associative } from "../Associative"
import { getValidationF } from "../FX/Validation"
import * as P from "../Prelude"

export const EitherURI = "EitherURI"
export type EitherURI = typeof EitherURI

declare module "../HKT" {
  interface URItoKind<K, SI, SO, X, I, S, R, E, A> {
    [EitherURI]: E.Either<E, A>
  }
}

export const Any: P.Any<EitherURI> = {
  URI: EitherURI,
  any: () => E.right({})
}

export const AssociativeBoth: P.AssociativeBoth<EitherURI> = {
  URI: EitherURI,
  both: E.zip
}

export const AssociativeEither: P.AssociativeEither<EitherURI> = {
  URI: EitherURI,
  either: (fb) => (fa) =>
    fa._tag === "Right"
      ? E.right(E.left(fa.right))
      : fb._tag === "Right"
      ? E.right(fb)
      : fb
}

export const AssociativeFlatten: P.AssociativeFlatten<EitherURI> = {
  URI: EitherURI,
  flatten: E.flatten
}

export const Covariant: P.Covariant<EitherURI> = {
  URI: EitherURI,
  map: E.map
}

export const Applicative: P.Applicative<EitherURI> = {
  ...Any,
  ...Covariant,
  ...AssociativeBoth
}

export const Monad: P.Monad<EitherURI> = {
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
}

export const getValidationApplicative = getValidationF<EitherURI>({
  URI: EitherURI,
  any: Any.any,
  both: E.zip,
  fail: E.left,
  flatten: E.flatten,
  map: E.map,
  run: E.right
})

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

export {
  alt,
  alt_,
  ap,
  ap_,
  bimap,
  bimap_,
  chain,
  chain_,
  compact,
  duplicate,
  Either,
  exists,
  exists_,
  extend,
  extend_,
  filterOrElse,
  filterOrElse_,
  flatten,
  fold,
  fold_,
  fromNullable,
  fromNullable_,
  fromOption,
  fromOption_,
  fromPredicate,
  fromPredicate_,
  getOrElse,
  getOrElse_,
  isLeft,
  isRight,
  Left,
  left,
  map,
  mapLeft,
  mapLeft_,
  map_,
  merge,
  orElse,
  orElseEither,
  orElseEither_,
  orElse_,
  parseJSON,
  parseJSON_,
  Right,
  right,
  stringifyJSON,
  swap,
  tap,
  tap_,
  toError,
  tryCatch,
  tryCatch_,
  widenA,
  widenE,
  zip,
  zipFirst,
  zipFirst_,
  zipSecond,
  zipSecond_,
  zip_
} from "../../_system/Either"
