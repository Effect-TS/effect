import * as E from "@effect-ts/system/Either"

import { flow, identity, pipe } from "../../Function"
import * as HKT from "../../Prelude/HKT"
import type { Applicative, Monad } from "../Combined"
import { chainF, succeedF } from "../DSL"

export interface Select<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly select: <N2 extends string, K2, SO, SO2, X2, I2, S2, R2, E2, A, B>(
    fab: HKT.Kind<F, C, N2, K2, SO, SO2, X2, I2, S2, R2, E2, (a: A) => B>
  ) => <N extends string, K, SI, SO, X, I, S, R, E, B2>(
    fa: HKT.Kind<
      F,
      C,
      N,
      K,
      SI,
      SO,
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
    N2,
    K2,
    SI,
    SO2,
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
export function selectM(
  F: Monad<[HKT.UF_]> & Applicative<[HKT.UF_]>
): SelectiveMonad<[HKT.UF_], HKT.Auto> {
  return HKT.instance<SelectiveMonad<[HKT.UF_]>>({
    ...F,
    select: <A, B>(fab: HKT.F_<(a: A) => B>) => <B2>(
      fa: HKT.F_<E.Either<A, B2>>
    ): HKT.F_<B | B2> =>
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
export function selectA(F: Applicative<[HKT.UF_]>): Selective<[HKT.UF_], HKT.Auto> {
  return HKT.instance<Selective<[HKT.UF_]>>({
    ...F,
    select: <A, B>(fab: HKT.F_<(a: A) => B>) => <B2>(
      fa: HKT.F_<E.Either<A, B2>>
    ): HKT.F_<B | B2> =>
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
  SO,
  SO2,
  X2,
  I2,
  S2,
  R2,
  E2,
  A,
  C,
  N3 extends string,
  K3,
  SO3,
  X3,
  I3,
  S3,
  R3,
  E3,
  B,
  D
>(
  lhs: HKT.Kind<F, C, N2, K2, SO, SO2, X2, I2, S2, R2, E2, (a: A) => C>,
  rhs: HKT.Kind<F, C, N3, K3, SO, SO3, X3, I3, S3, R3, E3, (a: B) => D>
) => <N extends string, K, SI, SO, X, I, S, R, E>(
  fe: HKT.Kind<F, C, N, K, SI, SO, X, I, S, R, E, E.Either<A, B>>
) => HKT.Kind<
  F,
  C,
  N2 | N3,
  K2 | K3,
  SI,
  SO | SO2,
  HKT.Mix<C, "X", [X, X2, X3]>,
  HKT.Mix<C, "I", [I, I2, I3]>,
  HKT.Mix<C, "S", [S, S2, S3]>,
  HKT.Mix<C, "R", [R, R2, R3]>,
  HKT.Mix<C, "X", [E, E2, E3]>,
  C | D
>
export function branchF(
  F: Selective<[HKT.UF_]>
): <A, C, B, D>(
  lhs: HKT.F_<(a: A) => C>,
  rhs: HKT.F_<(a: B) => D>
) => (fe: HKT.F_<E.Either<A, B>>) => HKT.F_<C | D> {
  return <A, C, B, D>(lhs: HKT.F_<(a: A) => C>, rhs: HKT.F_<(a: B) => D>) => (
    fe: HKT.F_<E.Either<A, B>>
  ) =>
    pipe(
      fe,
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
