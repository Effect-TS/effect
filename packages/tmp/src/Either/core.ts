import * as E from "@effect-ts/system/Either"

import type { AnyK } from "../_abstract/Any"
import type { ApplicativeK } from "../_abstract/Applicative"
import type { AssociativeBothK } from "../_abstract/AssociativeBoth"
import type { AssociativeEitherK } from "../_abstract/AssociativeEither"
import type { AssociativeFlattenK } from "../_abstract/AssociativeFlatten"
import type { CovariantK } from "../_abstract/Covariant"
import { sequenceSF, validationAssociativeBothF } from "../_abstract/DSL"
import type { FailK } from "../_abstract/FX/Fail"
import type { RecoverK } from "../_abstract/FX/Recover"
import type { RunK } from "../_abstract/FX/Run"
import { instance } from "../_abstract/HKT"
import type { IdentityBothK } from "../_abstract/IdentityBoth"
import type { IdentityFlattenK } from "../_abstract/IdentityFlatten"
import type { MonadK } from "../_abstract/Monad"
import type { Associative } from "../Associative"
import * as Equal from "../Equal"
import { flow, pipe, tuple } from "../Function"
import { Failure } from "../Newtype"
import { intersect } from "../Utils"

export const EitherURI = "Either"
export type EitherURI = typeof EitherURI

export const FailureEitherURI = "FailureEither"
export type FailureEitherURI = typeof FailureEitherURI

export const ValidationURI = "EitherValidation"
export type ValidationURI = typeof ValidationURI

declare module "../_abstract/HKT" {
  interface URItoKind<
    TL0,
    TL1,
    TL2,
    TL3,
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
    [ValidationURI]: E.Either<TL0, Out>
  }

  interface URItoErr<TL0, TL1, TL2, TL3, E> {
    [ValidationURI]: TL0
  }
}

/**
 * The `Covariant` instance for `Either`.
 */
export const Covariant = instance<CovariantK<EitherURI>>({
  map: E.map
})

/**
 * The `Any` instance for `Either`.
 */
export const Any = instance<AnyK<EitherURI>>({
  any: () => E.right({})
})

/**
 * The `AssociativeBoth` instance for `Either`.
 */
export const AssociativeBoth = instance<AssociativeBothK<EitherURI>>({
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
export const AssociativeFailureBoth = instance<AssociativeBothK<FailureEitherURI>>({
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
export const AssociativeEither = instance<AssociativeEitherK<EitherURI>>({
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
export const AssociativeFailureEither = instance<AssociativeEitherK<FailureEitherURI>>({
  either: eitherFailure
})

/**
 * The `AssociativeFlatten` instance for `Either`.
 */
export const AssociativeFlatten = instance<AssociativeFlattenK<EitherURI>>({
  flatten: E.flatten
})

/**
 * The `IdentityBoth` instance for `Either`.
 */
export const IdentityBoth = instance<IdentityBothK<EitherURI>>(
  intersect(Any, AssociativeBoth)
)

/**
 * The `Applicative` instance for `Either`.
 */
export const Applicative = instance<ApplicativeK<EitherURI>>(
  intersect(Covariant, IdentityBoth)
)

/**
 * The `Fail` instance for `Either`.
 */
export const Fail = instance<FailK<EitherURI>>({
  fail: E.left
})

/**
 * The `Recover` instance for `Either`.
 */
export const Recover = instance<RecoverK<EitherURI>>({
  recover: (f) => (fa) => (fa._tag === "Left" ? f(fa.left) : fa)
})

/**
 * The `IdentityFlatten` instance for `Either`.
 */
export const IdentityFlatten = instance<IdentityFlattenK<EitherURI>>(
  intersect(Any, AssociativeFlatten)
)

/**
 * The `Monad` instance for `Either`.
 */
export const Monad = instance<MonadK<EitherURI>>(intersect(Covariant, IdentityFlatten))

/**
 * Struct based applicative
 */
export const sequenceS = sequenceSF(Applicative)()

/**
 * The `Equal` instance for `Either`
 */
export const getEqual = Equal.either

/**
 * The `Run` instance for `Either`
 */
export const Run = instance<RunK<EitherURI>>({
  run: E.right
})

/**
 * The `Applicative` instance for `Validation<E, *>`
 */
export function getValidationApplicative<Z>(
  A: Associative<Z>
): ApplicativeK<ValidationURI, Z> {
  return intersect(
    Applicative,
    validationAssociativeBothF<ValidationURI, Z>(
      instance({
        ...Applicative,
        ...Monad,
        ...Fail,
        ...Run,
        combineErr: A.combine
      })
    )
  )
}
