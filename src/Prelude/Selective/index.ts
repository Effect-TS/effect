import * as E from "@effect-ts/system/Either"

import { constant, flow, identity, pipe } from "../../Function"
import * as HKT from "../../Prelude/HKT"
import type { Applicative } from "../Applicative"
import { chainF, succeedF } from "../DSL"
import type { Monad } from "../Monad"

export interface Select<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly select: <N2 extends string, K2, Q2, W2, X2, I2, S2, R2, E2, A, B>(
    fab: HKT.Kind<F, C, N2, K2, Q2, W2, X2, I2, S2, R2, E2, (a: A) => B>
  ) => <N extends string, K, Q, W, X, I, S, R, E, B2>(
    fa: HKT.Kind<
      F,
      C,
      HKT.Intro<C, "N", N2, N>,
      HKT.Intro<C, "K", K2, K>,
      HKT.Intro<C, "Q", Q2, Q>,
      HKT.Intro<C, "W", W2, W>,
      HKT.Intro<C, "X", X2, X>,
      HKT.Intro<C, "I", I2, I>,
      HKT.Intro<C, "S", S2, S>,
      HKT.Intro<C, "R", R2, R>,
      HKT.Intro<C, "E", E2, E>,
      E.Either<A, B2>
    >
  ) => HKT.Kind<
    F,
    C,
    HKT.Mix<C, "N", [N2, N]>,
    HKT.Mix<C, "K", [K2, K]>,
    HKT.Mix<C, "Q", [Q2, Q]>,
    HKT.Mix<C, "W", [W2, W]>,
    HKT.Mix<C, "X", [X2, X]>,
    HKT.Mix<C, "I", [I2, I]>,
    HKT.Mix<C, "S", [S2, S]>,
    HKT.Mix<C, "R", [R2, R]>,
    HKT.Mix<C, "X", [E2, E]>,
    B | B2
  >
}

export type Selective<F extends HKT.URIS, C = HKT.Auto> = Applicative<F, C> &
  Select<F, C>

export type SelectiveMonad<F extends HKT.URIS, C = HKT.Auto> = Selective<F, C> &
  Monad<F, C>

export function selectM<F extends HKT.URIS, C = HKT.Auto>(
  F: Monad<F, C> & Applicative<F, C>
): SelectiveMonad<F, C>
export function selectM<F>(
  F: Monad<HKT.UHKT<F>> & Applicative<HKT.UHKT<F>>
): SelectiveMonad<HKT.UHKT<F>, HKT.Auto> {
  return HKT.instance<SelectiveMonad<HKT.UHKT<F>>>({
    ...F,
    select: <A, B>(fab: HKT.HKT<F, (a: A) => B>) => <B2>(
      fa: HKT.HKT<F, E.Either<A, B2>>
    ): HKT.HKT<F, B | B2> =>
      pipe(
        fa,
        chainF(F)(
          E.fold(
            (a) =>
              pipe(
                fab,
                F.map((g) => g(a) as B | B2)
              ),
            (b) => succeedF(F)(b as B | B2)
          )
        )
      )
  })
}

export function selectA<F extends HKT.URIS, C = HKT.Auto>(
  F: Applicative<F, C>
): SelectiveMonad<F, C>
export function selectA<F>(
  F: Applicative<HKT.UHKT<F>>
): Selective<HKT.UHKT<F>, HKT.Auto> {
  return HKT.instance<Selective<HKT.UHKT<F>>>({
    ...F,
    select: <A, B>(fab: HKT.HKT<F, (a: A) => B>) => <B2>(
      fa: HKT.HKT<F, E.Either<A, B2>>
    ): HKT.HKT<F, B | B2> =>
      pipe(
        fa,
        F.both(fab),
        F.map(([ea, f]) => E.fold_(ea, f, identity))
      )
  })
}

export function branchF<F extends HKT.URIS, C = HKT.Auto>(
  F: Selective<F, C>
): <
  N2 extends string,
  K2,
  Q2,
  W2,
  X2,
  I2,
  S2,
  R2,
  E2,
  A,
  C,
  N3 extends string,
  K3,
  Q3,
  W3,
  X3,
  I3,
  S3,
  R3,
  E3,
  B,
  D
>(
  lhs: HKT.Kind<F, C, N2, K2, Q2, W2, X2, I2, S2, R2, E2, (a: A) => C>,
  rhs: HKT.Kind<F, C, N3, K3, Q3, W3, X3, I3, S3, R3, E3, (a: B) => D>
) => <N extends string, K, Q, W, X, I, S, R, E>(
  fe: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, E.Either<A, B>>
) => HKT.Kind<
  F,
  C,
  HKT.Mix<C, "N", [N, N2, N3]>,
  HKT.Mix<C, "K", [K, K2, K3]>,
  HKT.Mix<C, "Q", [Q, Q2, Q3]>,
  HKT.Mix<C, "W", [W, W2, W3]>,
  HKT.Mix<C, "X", [X, X2, X3]>,
  HKT.Mix<C, "I", [I, I2, I3]>,
  HKT.Mix<C, "S", [S, S2, S3]>,
  HKT.Mix<C, "R", [R, R2, R3]>,
  HKT.Mix<C, "X", [E, E2, E3]>,
  C | D
>
export function branchF<F>(F: Selective<HKT.UHKT<F>>) {
  return <A, C, B, D>(
    lhs: HKT.HKT<F, (a: A) => C>,
    rhs: HKT.HKT<F, (a: B) => D>
  ): ((fe: HKT.HKT<F, E.Either<A, B>>) => HKT.HKT<F, C | D>) =>
    flow(
      F.map(E.map(E.left)),
      F.select(
        pipe(
          lhs,
          F.map((fac) => flow(fac, E.right, E.widenE<B>()))
        )
      ),
      F.select(rhs)
    )
}

export function ifF<F extends HKT.URIS, C = HKT.Auto>(
  F: Selective<F, C>
): <
  N2 extends string,
  K2,
  SO,
  SO2,
  X2,
  I2,
  S2,
  R2,
  E2,
  A,
  N3 extends string,
  K3,
  SO3,
  X3,
  I3,
  S3,
  R3,
  E3,
  B
>(
  then_: HKT.Kind<F, C, N2, K2, SO, SO2, X2, I2, S2, R2, E2, A>,
  else_: HKT.Kind<F, C, N3, K3, SO, SO3, X3, I3, S3, R3, E3, B>
) => <N extends string, K, SI, SO, X, I, S, R, E>(
  if_: HKT.Kind<F, C, N, K, SI, SO, X, I, S, R, E, boolean>
) => HKT.Kind<
  F,
  C,
  N | N2 | N3,
  K | K2 | K3,
  SI,
  SO2 | SO3,
  HKT.Mix<C, "X", [X, X2, X3]>,
  HKT.Mix<C, "I", [I, I2, I3]>,
  HKT.Mix<C, "S", [S, S2, S3]>,
  HKT.Mix<C, "R", [R, R2, R3]>,
  HKT.Mix<C, "X", [E, E2, E3]>,
  A | B
>
export function ifF(F: Selective<[HKT.UF_]>) {
  return <A, B>(
    then_: HKT.F_<A>,
    else_: HKT.F_<B>
  ): ((if_: HKT.F_<boolean>) => HKT.F_<A | B>) =>
    flow(
      F.map((x) => (x ? E.left(undefined) : E.right(undefined))),
      branchF(F)(pipe(then_, F.map(constant)), pipe(else_, F.map(constant)))
    )
}

export function whenF(F: Selective<[HKT.UF_]>) {
  return (act: HKT.F_<void>): ((if_: HKT.F_<boolean>) => HKT.F_<void>) =>
    ifF(F)(act, succeedF(F)(undefined))
}
