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
  any: () => E.right({})
}

export const AssociativeBoth: P.AssociativeBoth<EitherURI> = {
  both: E.zip
}

export const AssociativeEither: P.AssociativeEither<EitherURI> = {
  either: (fb) => (fa) =>
    fa._tag === "Right"
      ? E.right(E.left(fa.right))
      : fb._tag === "Right"
      ? E.right(fb)
      : fb
}

export const AssociativeFlatten: P.AssociativeFlatten<EitherURI> = {
  flatten: E.flatten
}

export const Covariant: P.Covariant<EitherURI> = {
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
