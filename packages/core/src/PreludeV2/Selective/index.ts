// ets_tracing: off

import * as EI from "@effect-ts/system/Either"

import { constant, identity, pipe } from "../../Function"
import * as HKT from "../../PreludeV2/HKT"
import type { Any } from "../Any"
import type { Applicative } from "../Applicative"
import type { Covariant } from "../Covariant"
import { chainF, succeedF } from "../DSL"
import type { Monad } from "../Monad"

export interface Select<F extends HKT.HKT> {
  readonly select: <X, I2, R2, E2, A, B>(
    fab: HKT.Kind<F, X, I2, R2, E2, (a: A) => B>
  ) => <I, R, E, B2>(
    fa: HKT.Kind<F, X, I, R, E, EI.Either<A, B2>>
  ) => HKT.Kind<F, X, I2 & I, R2 & R, E2 | E, B | B2>
}

export type Selective<F extends HKT.HKT> = Select<F> & Covariant<F> & Any<F>

export type SelectiveMonad<F extends HKT.HKT> = Selective<F> & Monad<F>

export function monad<F extends HKT.HKT>(F_: Monad<F>): SelectiveMonad<F> {
  return HKT.instance<SelectiveMonad<F>>({
    ...F_,
    select:
      <X, I2, R2, E2, A, B>(fab: HKT.Kind<F, X, I2, R2, E2, (a: A) => B>) =>
      <I, R, E, B2>(
        fa: HKT.Kind<F, X, I, R, E, EI.Either<A, B2>>
      ): HKT.Kind<F, X, I2 & I, R2 & R, E2 | E, B | B2> =>
        pipe(
          fa,
          chainF(F_)(
            EI.fold(
              (a) =>
                pipe(
                  fab,
                  F_.map((g) => g(a))
                ),
              (b) => succeedF(F_)<B | B2, X, I & I2, R & R2, E | E2>(b)
            )
          )
        )
  })
}

export function applicative<F extends HKT.HKT>(F_: Applicative<F>): Selective<F> {
  return HKT.instance<Selective<F>>({
    ...F_,
    select: (fab) => (fa) =>
      pipe(
        fa,
        F_.both(fab),
        F_.map(({ tuple: [ea, f] }) => EI.fold_(ea, f, identity))
      )
  })
}

export const branchF =
  <F extends HKT.HKT>(F_: Selective<F>) =>
  <X2, I2, R2, E2, A, D1, X3, I3, R3, E3, B, D2>(
    lhs: HKT.Kind<F, X2, I2, R2, E2, (a: A) => D1>,
    rhs: HKT.Kind<F, X3, I3, R3, E3, (a: B) => D2>
  ) =>
  <X, I, R, E>(
    fe: HKT.Kind<F, X, I, R, E, EI.Either<A, B>>
  ): HKT.Kind<F, X, I & I2 & I3, R & R2 & R3, E | E2 | E3, D1 | D2> => {
    return pipe(
      fe,
      F_.map(EI.map(EI.left)),
      F_.select(
        pipe(
          lhs,
          F_.map((fac) => (x) => pipe(x, fac, EI.right, EI.widenE<B>()))
        )
      ),
      F_.select(rhs)
    )
  }

export function ifF<F extends HKT.URIS, C = HKT.Auto>(
  F: Selective<F, C>
): <K2, Q2, W2, X2, I2, S2, R2, E2, A, K3, Q3, W3, X3, I3, S3, R3, E3, B>(
  then_: HKT.Kind<F, X2, I2, S2, R2, E2, A>,
  else_: HKT.Kind<F, C, K3, Q3, W3, X3, I3, S3, R3, E3, B>
) => <K, Q, W, X, I, S, R, E>(
  if_: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, boolean>
) => HKT.Kind<
  F,
  C,
  HKT.Mix<C, "K", [K, K2, K3]>,
  HKT.Mix<C, "Q", [Q, Q2, Q3]>,
  HKT.Mix<C, "W", [W, W2, W3]>,
  HKT.Mix<C, "X", [X, X2, X3]>,
  HKT.Mix<C, "I", [I, I2, I3]>,
  HKT.Mix<C, "S", [S, S2, S3]>,
  HKT.Mix<C, "R", [R, R2, R3]>,
  HKT.Mix<C, "X", [E, E2, E3]>,
  A | B
>
export function ifF<F>(F: Selective<HKT.UHKT<F>>) {
  return <A, B>(
      then_: HKT.HKT<F, A>,
      else_: HKT.HKT<F, B>
    ): ((if_: HKT.HKT<F, boolean>) => HKT.HKT<F, A | B>) =>
    (x) =>
      pipe(
        x,
        F.map((x) => (x ? E.left(undefined) : E.right(undefined))),
        branchF(F)(pipe(then_, F.map(constant)), pipe(else_, F.map(constant)))
      )
}

export function whenF<F extends HKT.URIS, C = HKT.Auto>(
  F: Selective<F, C>
): <K2, Q2, W2, X2, I2, S2, R2, E2>(
  act: HKT.Kind<F, X2, I2, S2, R2, E2, void>
) => <K, Q, W, X, I, S, R, E>(
  if_: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, boolean>
) => HKT.Kind<
  F,
  C,
  HKT.Mix<C, "K", [K, K2]>,
  HKT.Mix<C, "Q", [Q, Q2]>,
  HKT.Mix<C, "W", [W, W2]>,
  HKT.Mix<C, "X", [X, X2]>,
  HKT.Mix<C, "I", [I, I2]>,
  HKT.Mix<C, "S", [S, S2]>,
  HKT.Mix<C, "R", [R, R2]>,
  HKT.Mix<C, "X", [E, E2]>,
  void
>
export function whenF<F>(F: Selective<HKT.UHKT<F>>) {
  return (act: HKT.HKT<F, void>): ((if_: HKT.HKT<F, boolean>) => HKT.HKT<F, void>) =>
    ifF(F)(act, succeedF(F)(undefined))
}
