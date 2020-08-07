import * as E from "../../../Either"
import { tuple, pipe } from "../../../Function"
import { Failure } from "../Newtype"
import { Any2 } from "../abstract/Any"
import { Applicative2 } from "../abstract/Applicative"
import { AssociativeBoth2 } from "../abstract/AssociativeBoth"
import { AssociativeEither2 } from "../abstract/AssociativeEither"
import { AssociativeFlatten2 } from "../abstract/AssociativeFlatten"
import { Covariant2 } from "../abstract/Covariant"
import { HasURI } from "../abstract/HKT"
import { Monad2 } from "../abstract/Monad"

export const URI = "Either"
export type URI = typeof URI

export const FailureEitherURI = "FailureEither"
export type FailureEitherURI = typeof FailureEitherURI

export type FailureEither<E, A> = Failure<E.Either<A, E>>

declare module "../abstract/HKT" {
  interface URItoKind2<E, A> {
    [URI]: E.Either<E, A>
    [FailureEitherURI]: FailureEither<E, A>
  }
}

export const HasEitherURI: HasURI<URI> = {
  URI
}

export const HasFailureEitherURI: HasURI<FailureEitherURI> = {
  URI: FailureEitherURI
}

/**
 * The `Covariant` instance for `Either`.
 */
export const Covariant: Covariant2<URI> = {
  Covariant: "Covariant",
  map: E.map,
  ...HasEitherURI
}

/**
 * The `Any` instance for `Either`.
 */
export const Any: Any2<URI> = {
  Any: "Any",
  any: () => E.right({}),
  ...HasEitherURI
}

export const associativeBoth: <E, B>(
  fb: E.Either<E, B>
) => <A>(fa: E.Either<E, A>) => E.Either<E, readonly [A, B]> = (fb) => (fa) =>
  E.chain_(fa, (a) => E.map_(fb, (b) => tuple(a, b)))

/**
 * The `AssociativeBoth` instance for `Either`.
 */
export const AssociativeBoth: AssociativeBoth2<URI> = {
  AssociativeBoth: "AssociativeBoth",
  both: associativeBoth,
  ...HasEitherURI
}

export const associativeFailureBoth = <E, B>(fb: FailureEither<E, B>) => <A>(
  fa: FailureEither<E, A>
): FailureEither<E, [A, B]> =>
  pipe(
    fa,
    Failure.unwrap,
    E.swap,
    E.chain((a) =>
      pipe(
        fb,
        Failure.unwrap,
        E.swap,
        E.map((b) => tuple(a, b))
      )
    ),
    E.swap,
    Failure.wrap
  )

/**
 * The `AssociativeBoth` instance for a failed `Either`
 */
export const AssociativeFailureBoth: AssociativeBoth2<FailureEitherURI> = {
  AssociativeBoth: "AssociativeBoth",
  both: associativeFailureBoth,
  ...HasFailureEitherURI
}

export const associativeEither = <E, B>(fb: E.Either<E, B>) => <A>(
  fa: E.Either<E, A>
): E.Either<E, E.Either<A, B>> =>
  pipe(
    fa,
    E.map((a) => E.left(a)),
    E.swap,
    E.chain(() =>
      pipe(
        fb,
        E.map((a) => E.right(a)),
        E.swap
      )
    ),
    E.swap
  )
/**
 * The `AssociativeEither` instance for `Either`.
 */
export const AssociativeEither: AssociativeEither2<URI> = {
  AssociativeEither: "AssociativeEither",
  either: associativeEither,
  ...HasEitherURI
}

export const associativeFailureEither = <E, B>(fb: FailureEither<E, B>) => <A>(
  fa: FailureEither<E, A>
): FailureEither<E, E.Either<A, B>> =>
  pipe(
    fa,
    Failure.unwrap,
    E.swap,
    E.map(E.left),
    E.chain(() => pipe(fb, Failure.unwrap, E.swap, E.map(E.right))),
    E.swap,
    Failure.wrap
  )

/**
 * The `AssociativeEither` instance for a failed `Either`
 */
export const AssociativeFailureEither: AssociativeEither2<FailureEitherURI> = {
  AssociativeEither: "AssociativeEither",
  either: associativeFailureEither,
  ...HasFailureEitherURI
}

export const AssociativeFlatten: AssociativeFlatten2<URI> = {
  AssociativeFlatten: "AssociativeFlatten",
  flatten: E.flatten,
  ...HasEitherURI
}

/**
 * The `Applicative` instance for `Either`.
 */
export const Applicative: Applicative2<URI> = {
  ...Any,
  ...Covariant,
  ...AssociativeBoth
}

/**
 * The `Monad` instance for `Either`.
 */
export const Monad: Monad2<URI> = {
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
}
