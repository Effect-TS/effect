import {
  AssociativeEither,
  AssociativeEither1,
  AssociativeEither2,
  AssociativeEither3,
  AssociativeEither4,
  AssociativeEither5,
  AssociativeEither6
} from "../AssociativeEither"
import { URIS, URIS2, URIS3, URIS4, URIS5, URIS6 } from "../HKT"

/**
 * A commutative binary operator that combines two values of types `F[A]` and
 * `F[B]` to produce an `F[Either[A, B]]`.
 */
export interface CommutativeEither<F> extends AssociativeEither<F> {
  readonly CommutativeEither: "CommutativeEither"
}

export interface CommutativeEither1<F extends URIS> extends AssociativeEither1<F> {
  readonly CommutativeEither: "CommutativeEither"
}

export interface CommutativeEither2<F extends URIS2> extends AssociativeEither2<F> {
  readonly CommutativeEither: "CommutativeEither"
}

export interface CommutativeEither3<F extends URIS3> extends AssociativeEither3<F> {
  readonly CommutativeEither: "CommutativeEither"
}

export interface CommutativeEither4<F extends URIS4> extends AssociativeEither4<F> {
  readonly CommutativeEither: "CommutativeEither"
}

export interface CommutativeEither5<F extends URIS5> extends AssociativeEither5<F> {
  readonly CommutativeEither: "CommutativeEither"
}

export interface CommutativeEither6<F extends URIS6> extends AssociativeEither6<F> {
  readonly CommutativeEither: "CommutativeEither"
}
