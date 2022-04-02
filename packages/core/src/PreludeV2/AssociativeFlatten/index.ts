import type * as HKT from "../HKT/index.js"

export interface AssociativeFlatten<F extends HKT.HKT> extends HKT.Typeclass<F> {
  readonly flatten: <R, E, A, R2, E2>(
    ffa: HKT.Kind<F, R2, E2, HKT.Kind<F, R, E, A>>
  ) => HKT.Kind<F, R2 & R, E2 | E, A>
}
