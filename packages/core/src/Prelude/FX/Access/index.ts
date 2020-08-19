import { Auto, Kind, OrE, OrI, OrK, OrR, OrS, OrX, URIS, Base, OrN } from "../../HKT"

export interface Access<F extends URIS, C = Auto> extends Base<F, C> {
  readonly access: <R, A, SI, SO, S>(
    f: (_: OrR<C, R>) => A
  ) => Kind<
    F,
    OrN<C, never>,
    OrK<C, never>,
    SI,
    SO,
    OrX<C, never>,
    OrI<C, unknown>,
    OrS<C, S>,
    OrR<C, R>,
    OrE<C, never>,
    A
  >
}
