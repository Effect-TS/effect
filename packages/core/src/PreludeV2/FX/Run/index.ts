import type { Either } from "@effect-ts/system/Either"

import type * as HKT from "../../HKT/index.js"

export interface Run<F extends HKT.HKT> extends HKT.Typeclass<F> {
  readonly either: <A, R, E>(
    fa: HKT.Kind<F, R, E, A>
  ) => HKT.Kind<F, R, never, Either<E, A>>
}
