import { constant, flow } from "../../Function"
import { Any } from "../Any"
import { Monad } from "../Combined"
import { Covariant } from "../Covariant"
import { Access } from "../FX"
import {
  Auto,
  F_,
  F___,
  Kind,
  OrE,
  OrI,
  OrK,
  OrN,
  OrR,
  OrS,
  OrX,
  UF_,
  UF___,
  URIS
} from "../HKT"

export function succeedF<F extends URIS, C = Auto>(
  F: Any<F, C> & Covariant<F, C>
): <A, SI, SO, S, K, N extends string>(
  a: A
) => Kind<
  F,
  OrN<C, N>,
  OrK<C, K>,
  SI,
  SO,
  OrX<C, never>,
  OrI<C, unknown>,
  OrS<C, S>,
  OrR<C, unknown>,
  OrE<C, never>,
  A
>
export function succeedF(F: Any<UF_> & Covariant<UF_>): <A>(a: A) => F_<A> {
  return <A>(a: A) => F.map(constant(a))(F.any())
}

export function chainF<F extends URIS, C = Auto>(
  F: Monad<F, C>
): <N2 extends string, K2, SO, SO2, X2, I2, S, R2, E2, A, B>(
  f: (
    a: A
  ) => Kind<
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
) => <N extends string, K, SI, X, I, R, E>(
  fa: Kind<
    F,
    OrN<C, N>,
    OrK<C, K>,
    SI,
    SO,
    OrX<C, X>,
    OrI<C, I>,
    OrS<C, S>,
    OrR<C, R>,
    OrE<C, E>,
    A
  >
) => Kind<
  F,
  OrN<C, N2>,
  OrK<C, K2>,
  SI,
  SO2,
  OrX<C, X | X2>,
  OrI<C, I & I2>,
  OrS<C, S>,
  OrR<C, R & R2>,
  OrE<C, E | E2>,
  B
>
export function chainF(F: Monad<UF_>) {
  return <A, B>(f: (a: A) => F_<B>) => flow(F.map(f), F.flatten)
}

export function accessMF<F extends URIS, C = Auto>(
  F: Access<F, C> & Monad<F, C>
): <N extends string, K, SI, SO, X, I, S, R, E, A>(
  f: (
    r: OrR<C, R>
  ) => Kind<
    F,
    OrN<C, N>,
    OrK<C, K>,
    SI,
    SO,
    OrX<C, X>,
    OrI<C, I>,
    OrS<C, S>,
    OrR<C, R>,
    OrE<C, E>,
    A
  >
) => Kind<
  F,
  OrN<C, N>,
  OrK<C, K>,
  SI,
  SO,
  OrX<C, X>,
  OrI<C, I>,
  OrS<C, S>,
  OrR<C, R>,
  OrE<C, E>,
  A
>
export function accessMF(
  F: Access<UF___> & Monad<UF___>
): <R, E, A>(f: (r: R) => F___<R, E, A>) => F___<R, E, A> {
  return flow(F.access, F.flatten)
}
