import { Auto, Base, Kind, OrE, OrI, OrK, OrN, OrR, OrS, OrX, URIS } from "../HKT"
import { Def, Mix } from "../HKT/variance"

//
// Experiment
//

export interface AssociativeBothFreeVariance<F extends URIS, C = Auto> extends Base<F> {
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
      OrX<C, X>,
      Def<C, "I", OrI<C, I2>, OrI<C, I>>,
      OrS<C, S>,
      Def<C, "R", OrR<C, R2>, OrR<C, R>>,
      Def<C, "E", OrE<C, E2>, OrE<C, E>>,
      A
    >
  ) => Kind<
    F,
    OrN<C, N2>,
    OrK<C, K2>,
    SI,
    SO2,
    OrX<C, X | X2>,
    Mix<C, "I", [I2, I]>,
    OrS<C, S>,
    Mix<C, "R", [R2, R]>,
    Mix<C, "E", [E2, E]>,
    readonly [A, B]
  >
}
