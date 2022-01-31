// ets_tracing: off

import { pipe } from "../../Function/index.js"
import type { Any } from "../Any/index.js"
import type { Covariant } from "../Covariant/index.js"
import type * as HKT from "../HKT/index.js"
import type { Monad } from "../Monad/index.js"
import { chainF } from "./chain.js"
import { succeedF } from "./succeed.js"

export function doF<F extends HKT.URIS, C = HKT.Auto>(
  F: Any<F, C> & Covariant<F, C>
): HKT.Kind<
  F,
  C,
  HKT.Initial<C, "K">,
  HKT.Initial<C, "Q">,
  HKT.Initial<C, "W">,
  HKT.Initial<C, "X">,
  HKT.Initial<C, "I">,
  HKT.Initial<C, "S">,
  HKT.Initial<C, "R">,
  HKT.Initial<C, "E">,
  {}
>
export function doF<F>(F: Any<HKT.UHKT<F>> & Covariant<HKT.UHKT<F>>): HKT.HKT<F, {}> {
  return succeedF(F)({})
}

export function bindF<F extends HKT.URIS, C = HKT.Auto>(
  F: Monad<F, C>
): <K2, Q2, W2, X2, I2, S2, R2, E2, BK, BN extends string, BA>(
  tag: Exclude<BN, keyof BK>,
  f: (a: BK) => HKT.Kind<F, C, K2, Q2, W2, X2, I2, S2, R2, E2, BA>
) => <K, Q, W, X, I, S, R, E>(
  fa: HKT.Kind<
    F,
    C,
    HKT.Intro<C, "K", K2, K>,
    HKT.Intro<C, "Q", Q2, Q>,
    HKT.Intro<C, "W", W2, W>,
    HKT.Intro<C, "X", X2, X>,
    HKT.Intro<C, "I", I2, I>,
    HKT.Intro<C, "S", S2, S>,
    HKT.Intro<C, "R", R2, R>,
    HKT.Intro<C, "E", E2, E>,
    BK
  >
) => HKT.Kind<
  F,
  C,
  HKT.Mix<C, "K", [K2, K]>,
  HKT.Mix<C, "Q", [Q2, Q]>,
  HKT.Mix<C, "W", [W2, W]>,
  HKT.Mix<C, "X", [X2, X]>,
  HKT.Mix<C, "I", [I2, I]>,
  HKT.Mix<C, "S", [S2, S]>,
  HKT.Mix<C, "R", [R2, R]>,
  HKT.Mix<C, "X", [E2, E]>,
  BK & { [k in BN]: BA }
>
export function bindF<F>(
  F: Monad<HKT.UHKT<F>>
): <A, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => HKT.HKT<F, A>
) => (mk: HKT.HKT<F, K>) => HKT.HKT<F, K & { [k in N]: A }> {
  return <A, K, N extends string>(
      tag: Exclude<N, keyof K>,
      f: (_: K) => HKT.HKT<F, A>
    ) =>
    (mk: HKT.HKT<F, K>): HKT.HKT<F, K & { [k in N]: A }> =>
      pipe(
        mk,
        chainF(F)((k) =>
          pipe(
            f(k),
            F.map((a) =>
              Object.assign({}, k, { [tag]: a } as {
                [k in N]: A
              })
            )
          )
        )
      )
}

export function letF<F extends HKT.URIS, C = HKT.Auto>(
  F: Monad<F, C>
): <BK, BN extends string, BA>(
  tag: Exclude<BN, keyof BK>,
  f: (a: BK) => BA
) => <K, Q, W, X, I, S, R, E>(
  fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, BK>
) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, BK & { [k in BN]: BA }>
export function letF<F>(
  F: Monad<HKT.UHKT<F>>
): <A, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => A
) => (mk: HKT.HKT<F, K>) => HKT.HKT<F, K & { [k in N]: A }> {
  return <A, K, N extends string>(tag: Exclude<N, keyof K>, f: (_: K) => A) =>
    (mk: HKT.HKT<F, K>): HKT.HKT<F, K & { [k in N]: A }> =>
      pipe(
        mk,
        F.map((k) =>
          Object.assign({}, k, { [tag]: f(k) } as {
            [k in N]: A
          })
        )
      )
}
