import type { Either } from "@effect-ts/system/Either"

import type * as HKT from "../../HKT"

// F<E, A> -> F<never, Either<E, A>>
export interface Run<F extends HKT.HKT> {
  readonly either: <A, X, I, R, E>(
    fa: HKT.Kind<F, X, I, R, E, A>
  ) => HKT.Kind<F, X, I, R, never, Either<E, A>>
}
