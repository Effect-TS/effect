import {
  AssociativeEither,
  AssociativeEither1,
  AssociativeEither2,
  AssociativeEither3,
  AssociativeEither4,
  AssociativeEither5,
  AssociativeEither6
} from "../AssociativeEither"
import {
  HKT,
  Kind,
  Kind2,
  Kind3,
  Kind4,
  Kind5,
  Kind6,
  URIS,
  URIS2,
  URIS3,
  URIS4,
  URIS5,
  URIS6
} from "../HKT"

/**
 * A binary operator that combines two values of types `F[A]` and `F[B]` to
 * produce an `F[Either[A, B]]` with an identity value.
 */
export interface IdentityEither<F> extends AssociativeEither<F> {
  readonly none: () => HKT<F, never>
}

export interface IdentityEither1<F extends URIS> extends AssociativeEither1<F> {
  readonly none: () => Kind<F, never>
}

export interface IdentityEither2<F extends URIS2> extends AssociativeEither2<F> {
  readonly none: <E>() => Kind2<F, E, never>
}

export interface IdentityEither3<F extends URIS3> extends AssociativeEither3<F> {
  readonly none: <R, E>() => Kind3<F, R, E, never>
}

export interface IdentityEither4<F extends URIS4> extends AssociativeEither4<F> {
  readonly none: <S, R, E>() => Kind4<F, S, R, E, never>
}

export interface IdentityEither5<F extends URIS5> extends AssociativeEither5<F> {
  readonly none: <X, S, R, E>() => Kind5<F, X, S, R, E, never>
}

export interface IdentityEither6<F extends URIS6> extends AssociativeEither6<F> {
  readonly none: <Y, X, S, R, E>() => Kind6<F, Y, X, S, R, E, never>
}
