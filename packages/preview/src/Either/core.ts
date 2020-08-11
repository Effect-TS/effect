import * as Equal from "../Equal"
import { pipe, tuple } from "../Function"
import { Failure } from "../Newtype"
import { intersect } from "../Utils"
import { makeAny } from "../_abstract/Any"
import { makeApplicative } from "../_abstract/Applicative"
import { makeAssociativeBoth } from "../_abstract/AssociativeBoth"
import { makeAssociativeEither } from "../_abstract/AssociativeEither"
import { makeAssociativeFlatten } from "../_abstract/AssociativeFlatten"
import { makeCovariant } from "../_abstract/Covariant"
import { sequenceSF } from "../_abstract/DSL"
import { makeFail } from "../_abstract/FX/Fail"
import { makeIdentityBoth } from "../_abstract/IdentityBoth"
import { makeIdentityFlatten } from "../_abstract/IdentityFlatten"
import { makeMonad } from "../_abstract/Monad"
import * as E from "../_system/Either"

export const EitherURI = "Either"
export type EitherURI = typeof EitherURI

export const FailureEitherURI = "FailureEither"
export type FailureEitherURI = typeof FailureEitherURI

export type FailureEither<E, A> = Failure<E.Either<A, E>>

declare module "../_abstract/HKT" {
  interface URItoKind<
    Fix0,
    Fix1,
    Fix2,
    Fix3,
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
    [EitherURI]: E.Either<Err, Out>
    [FailureEitherURI]: FailureEither<Err, Out>
  }
}

/**
 * The `Covariant` instance for `Either`.
 */
export const Covariant = makeCovariant(EitherURI)({
  map: E.map
})

/**
 * The `Any` instance for `Either`.
 */
export const Any = makeAny(EitherURI)({
  any: () => E.right({})
})

/**
 * The `AssociativeBoth` instance for `Either`.
 */
export const AssociativeBoth = makeAssociativeBoth(EitherURI)({
  both: E.zip
})

export const zipFailure = <E, B>(fb: FailureEither<E, B>) => <E1, A>(
  fa: FailureEither<E1, A>
): FailureEither<E | E1, readonly [A, B]> =>
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
export const AssociativeFailureBoth = makeAssociativeBoth(FailureEitherURI)({
  both: zipFailure
})

/**
 * Alternatively `E.Either<E, A>` or, `E.Either<E, B>`
 */
export const either = <E1, B>(fb: E.Either<E1, B>) => <E, A>(
  fa: E.Either<E, A>
): E.Either<E1, E.Either<A, B>> =>
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
export const AssociativeEither = makeAssociativeEither(EitherURI)({
  either
})

/**
 * AssociativeEither's either for Failure<Either<x, A>>
 */
export const eitherFailure = <E1, B>(fb: FailureEither<E1, B>) => <E, A>(
  fa: FailureEither<E, A>
): FailureEither<E1, E.Either<A, B>> =>
  pipe(
    fa,
    Failure.unwrap,
    E.swap,
    E.map(E.left),
    E.swap,
    E.chain(() => pipe(fb, Failure.unwrap, E.swap, E.map(E.right), E.swap)),
    Failure.wrap
  )

/**
 * The `AssociativeEither` instance for a failed `Either`
 */
export const AssociativeFailureEither = makeAssociativeEither(FailureEitherURI)({
  either: eitherFailure
})

/**
 * The `AssociativeFlatten` instance for `Either`.
 */
export const AssociativeFlatten = makeAssociativeFlatten(EitherURI)({
  flatten: E.flatten
})

/**
 * The `IdentityBoth` instance for `Either`.
 */
export const IdentityBoth = makeIdentityBoth(EitherURI)(intersect(Any, AssociativeBoth))

/**
 * The `Applicative` instance for `Either`.
 */
export const Applicative = makeApplicative(EitherURI)(
  intersect(Covariant, IdentityBoth)
)

/**
 * The `Fail` instance for `Either`.
 */
export const Fail = makeFail(EitherURI)({
  fail: E.left
})

/**
 * The `IdentityFlatten` instance for `Either`.
 */
export const IdentityFlatten = makeIdentityFlatten(EitherURI)(
  intersect(Any, AssociativeFlatten)
)

/**
 * The `Monad` instance for `Either`.
 */
export const Monad = makeMonad(EitherURI)(intersect(Covariant, IdentityFlatten))

/**
 * Struct based applicative
 */
export const sequenceS = sequenceSF(Applicative)()

/**
 * The `Equal` instance for `Either`
 */
export const getEqual = Equal.either
