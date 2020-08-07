import * as E from "../../../Either"
import { tuple, pipe } from "../../../Function"
import { Failure } from "../Newtype"
import { Any2 } from "../abstract/Any"
import { Applicative2 } from "../abstract/Applicative"
import { AssociativeBoth2 } from "../abstract/AssociativeBoth"
import { AssociativeEither2 } from "../abstract/AssociativeEither"
import { AssociativeFlatten2 } from "../abstract/AssociativeFlatten"
import { Covariant2 } from "../abstract/Covariant"
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

/**
 * The `Covariant` instance for `Either`.
 */
export const Covariant: Covariant2<URI> = {
  URI,
  Covariant: "Covariant",
  map: E.map
}

/**
 * The `Any` instance for `Either`.
 */
export const Any: Any2<URI> = {
  URI,
  Any: "Any",
  any: () => E.right({})
}

/**
 * The `AssociativeBoth` instance for `Either`.
 */
export const AssociativeBoth: AssociativeBoth2<URI> = {
  URI,
  AssociativeBoth: "AssociativeBoth",
  both: (fb) => (fa) => E.chain_(fa, (a) => E.map_(fb, (b) => tuple(a, b)))
}

/**
 * The `AssociativeBoth` instance for a failed `Either`
 */
export const AssociativeFailureBoth: AssociativeBoth2<FailureEitherURI> = {
  URI: FailureEitherURI,
  AssociativeBoth: "AssociativeBoth",
  both: <E, B>(fb: FailureEither<E, B>) => <A>(
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
}

/**
 * The `AssociativeEither` instance for `Either`.
 */
export const AssociativeEither: AssociativeEither2<URI> = {
  URI,
  AssociativeEither: "AssociativeEither",
  either: <E, B>(fb: E.Either<E, B>) => <A>(
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
}

/**
 * The `AssociativeEither` instance for a failed `Either`
 */
export const AssociativeFailureEither: AssociativeEither2<FailureEitherURI> = {
  URI: FailureEitherURI,
  AssociativeEither: "AssociativeEither",
  either: <E, B>(fb: Failure<E.Either<B, E>>) => <A>(
    fa: Failure<E.Either<A, E>>
  ): Failure<E.Either<E.Either<A, B>, E>> =>
    pipe(
      fa,
      Failure.unwrap,
      E.swap,
      E.map(E.left),
      E.chain(() => pipe(fb, Failure.unwrap, E.swap, E.map(E.right))),
      E.swap,
      Failure.wrap
    )
}

export const AssociativeFlatten: AssociativeFlatten2<URI> = {
  URI,
  AssociativeFlatten: "AssociativeFlatten",
  flatten: E.flatten
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
