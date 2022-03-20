// ets_tracing: off

import type { Either } from "@effect-ts/system/Either"

import type * as Tp from "../../Collections/Immutable/Tuple/index.js"
import type { Applicative } from "../Applicative/index.js"
import type * as HKT from "../HKT/index.js"

export interface Wilt<F extends HKT.HKT> {
  <G extends HKT.HKT>(F: Applicative<G>): <GX, GI, GR, GE, A, B, B2>(
    f: (a: A) => HKT.Kind<G, GX, GI, GR, GE, Either<B, B2>>
  ) => <FX, FI, FR, FE>(
    ta: HKT.Kind<F, FX, FI, FR, FE, A>
  ) => HKT.Kind<
    G,
    GX,
    GI,
    GR,
    GE,
    Tp.Tuple<[HKT.Kind<F, FX, FI, FR, FE, B>, HKT.Kind<F, FX, FI, FR, FE, B2>]>
  >
}

export interface Wiltable<F extends HKT.HKT> extends HKT.Typeclass<F> {
  readonly separateF: Wilt<F>
}
