import { Auto, Kind, OrE, OrI, OrK, OrR, OrS, OrX, URIS } from "../../HKT"

export interface Fail<F extends URIS, C = Auto> {
  readonly fail: <SI, SO, S, E, A = never>(
    e: OrE<C, E>
  ) => Kind<
    F,
    OrK<C, never>,
    SI,
    SO,
    OrX<C, never>,
    OrI<C, unknown>,
    OrS<C, S>,
    OrR<C, unknown>,
    OrE<C, E>,
    A
  >
}
