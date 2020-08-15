import { Associative } from "../Associative"
import * as Equal from "../Equal"
import { flow, pipe, tuple } from "../Function"
import { Failure } from "../Newtype"
import { intersect } from "../Utils"
import { makeAny } from "../_abstract/Any"
import { ApplicativeK, makeApplicative } from "../_abstract/Applicative"
import { makeAssociativeBoth } from "../_abstract/AssociativeBoth"
import { makeAssociativeEither } from "../_abstract/AssociativeEither"
import { makeAssociativeFlatten } from "../_abstract/AssociativeFlatten"
import { makeCovariant } from "../_abstract/Covariant"
import { sequenceSF, validationAssociativeBothF } from "../_abstract/DSL"
import { makeFail } from "../_abstract/FX/Fail"
import { makeIdentityErr } from "../_abstract/FX/IdentityErr"
import { makeRecover } from "../_abstract/FX/Recover"
import { makeRun } from "../_abstract/FX/Run"
import { makeIdentityBoth } from "../_abstract/IdentityBoth"
import { makeIdentityFlatten } from "../_abstract/IdentityFlatten"
import { makeMonad } from "../_abstract/Monad"
import * as E from "../_system/Either"

export const EitherURI = "Either"
export type EitherURI = typeof EitherURI

export const FailureEitherURI = "FailureEither"
export type FailureEitherURI = typeof FailureEitherURI

export const ValidationURI = "EitherValidation"
export type ValidationURI = typeof ValidationURI

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
    [FailureEitherURI]: Failure<E.Either<Out, Err>>
    [ValidationURI]: E.Either<Fix0, Out>
  }
  interface URItoErr<Fix0, Fix1, Fix2, Fix3, Err> {
    [ValidationURI]: Fix0
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

export const zipFailure = <B, EB>(fb: Failure<E.Either<EB, B>>) => <A, EA>(
  fa: Failure<E.Either<EA, A>>
): Failure<E.Either<readonly [EA, EB], B | A>> => {
  const ea = Failure.unwrap(fa)
  const eb = Failure.unwrap(fb)

  return pipe(
    ea,
    E.fold(
      (la) =>
        pipe(
          eb,
          E.fold(
            (lb) => pipe(E.left(tuple(la, lb)), E.widenA<B | A>(), Failure.wrap),
            flow(
              E.right,
              E.widenE<readonly [EA, EB]>(),
              E.widenA<B | A>(),
              Failure.wrap
            )
          )
        ),
      flow(E.right, E.widenE<readonly [EA, EB]>(), E.widenA<B | A>(), Failure.wrap)
    )
  )
}

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
export const eitherFailure = <B, EB>(fb: Failure<E.Either<EB, B>>) => <A, EA>(
  fa: Failure<E.Either<EA, A>>
): Failure<E.Either<E.Either<EA, EB>, B>> =>
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
 * The `Recover` instance for `Either`.
 */
export const Recover = makeRecover(EitherURI)({
  recover: (f) => (e) => (e._tag === "Right" ? e : f(e.left))
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

/**
 * Zips two eithers, merges lefts with `Associative<E>`
 */
export function makeValidationZip<E>(
  A: Associative<E>
): <B>(fb: E.Either<E, B>) => <A>(fa: E.Either<E, A>) => E.Either<E, readonly [A, B]> {
  const F = getValidationAssociativeBoth(A)
  return F.both
}

/**
 * The `Any` instance for `Validation<E, *>`
 */
export function getValidationAny<E>() {
  return makeAny<ValidationURI, E>(ValidationURI)({
    any: () => E.right({})
  })
}

/**
 * The `Covariant` instance for `Validation<E, *>`
 */
export function getValidationCovariant<E>() {
  return makeCovariant<ValidationURI, E>(ValidationURI)({
    map: E.map
  })
}

/**
 * The `IdentityBoth` instance for `Validation<E, *>`
 */
export function getValidationIdentityBoth<E>(A: Associative<E>) {
  return makeIdentityBoth<ValidationURI, E>(ValidationURI)(
    intersect(getValidationAny<E>(), getValidationAssociativeBoth(A))
  )
}

/**
 * The `Applicative` instance for `Validation<E, *>`
 */
export function getValidationApplicative<E>(A: Associative<E>) {
  return makeApplicative<ValidationURI, E>(ValidationURI)(
    intersect(getValidationCovariant<E>(), getValidationIdentityBoth(A))
  )
}

/**
 * The `Fail` instance for `Validation<E, *>`
 */
export function getValidationFail<E>() {
  return makeFail<ValidationURI, E>(ValidationURI)({
    fail: makeValidationFail<E>()
  })
}

/**
 * Fail's fail for `Validation<E, *>`
 */
export function makeValidationFail<E>(): (e: E) => E.Either<E, never> {
  return E.left
}

/**
 * The `Recover` instance for `Validation<E, *>`
 */
export function getValidationRecover<Z>() {
  return makeRecover<ValidationURI, Z>(ValidationURI)({
    recover: makeValidationRecover<Z>()
  })
}

/**
 * The `Run` instance for `Validation<E, *>`
 */
export function getValidationRun<Z>() {
  return makeRun<ValidationURI, Z>(ValidationURI)({
    run: E.right
  })
}

/**
 * Recover's recover for `Validation<E, *>`
 */
export function makeValidationRecover<E>(): <A2>(
  f: (e: E) => E.Either<E, A2>
) => <A>(fa: E.Either<E, A>) => E.Either<E, A2 | A> {
  return (f) => (fa) => {
    switch (fa._tag) {
      case "Left": {
        return f(fa.left)
      }
      case "Right": {
        return fa
      }
    }
  }
}

/**
 * The `IdentityErr` instance for `Validation<E, *>`
 */
export function getValidationIdentityErr<E>(A: Associative<E>) {
  return makeIdentityErr<ValidationURI, E>(ValidationURI)({
    combineErr: A.combine
  })
}

/**
 * The `AssociativeFlatten` instance for `Validation<E, *>`
 */
export function getValidationAssociativeFlatten<E>() {
  return makeAssociativeFlatten<ValidationURI, E>(ValidationURI)({
    flatten: E.flatten
  })
}

/**
 * The `IdentityFlatten` instance for `Validation<E, *>`
 */
export function getValidationIdentityFlatten<E>(A: Associative<E>) {
  return makeIdentityFlatten<ValidationURI, E>(ValidationURI)(
    intersect(getValidationAssociativeFlatten<E>(), getValidationAny<E>())
  )
}

/**
 * The `AssociativeBoth` instance for `Validation<E, *>`
 */
export function getValidationAssociativeBoth<E>(
  A: Associative<E>
): ApplicativeK<ValidationURI, E> {
  const F = intersect(
    getValidationAny<E>(),
    getValidationRun<E>(),
    getValidationFail<E>(),
    getValidationAssociativeFlatten<E>(),
    getValidationCovariant<E>(),
    getValidationIdentityErr(A),
    makeAssociativeBoth<ValidationURI, E>(ValidationURI)({
      both: E.zip
    })
  )

  return intersect(F, validationAssociativeBothF<ValidationURI, E>(F))
}

/**
 * The `Run` instance for `Either`
 */
export const Run = makeRun(EitherURI)({
  run: E.right
})
