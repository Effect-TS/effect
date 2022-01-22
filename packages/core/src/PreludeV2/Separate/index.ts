// ets_tracing: off

import type { Either } from "@effect-ts/system/Either"

import type * as Tp from "../../Collections/Immutable/Tuple/index.js"
import type * as HKT from "../HKT/index.js"

export interface Separate<F extends HKT.HKT> extends HKT.Typeclass<F> {
  readonly separate: <R, E, A, B>(
    fa: HKT.Kind<F, R, E, Either<A, B>>
  ) => Tp.Tuple<[HKT.Kind<F, R, E, A>, HKT.Kind<F, R, E, B>]>
}
