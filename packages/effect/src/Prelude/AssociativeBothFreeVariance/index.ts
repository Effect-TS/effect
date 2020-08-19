import { Auto, Base, Kind, OrE, OrI, OrK, OrN, OrR, OrS, OrX, URIS } from "../HKT"
import { Def, Mix } from "../HKT/variance"

//
// Experiment
//

export interface AssociativeBothFreeVariance<F extends URIS, C = Auto>
  extends Base<F, C> {
  readonly both: <N2 extends string, K2, SO, SO2, X2, I2, S, R2, E2, B>(
    fb: Kind<
      F,
      OrN<C, N2>,
      OrK<C, K2>,
      SO,
      SO2,
      OrX<C, X2>,
      OrI<C, I2>,
      OrS<C, S>,
      OrR<C, R2>,
      OrE<C, E2>,
      B
    >
  ) => <N extends string, K, SI, X, I, R, E, A>(
    fa: Kind<
      F,
      OrN<C, N>,
      OrK<C, K>,
      SI,
      SO,
      OrX<C, Def<C, "X", X2, X>>,
      OrI<C, Def<C, "I", I2, I>>,
      OrS<C, S>,
      OrR<C, Def<C, "R", R2, R>>,
      OrE<C, Def<C, "E", E2, E>>,
      A
    >
  ) => Kind<
    F,
    OrN<C, N2>,
    OrK<C, K2>,
    SI,
    SO2,
    OrX<C, Mix<C, "X", X2, X>>,
    OrI<C, Mix<C, "I", I2, I>>,
    OrS<C, S>,
    OrR<C, Mix<C, "R", R2, R>>,
    OrE<C, Mix<C, "E", E2, E>>,
    readonly [A, B]
  >
}
