import { pipe } from "@effect-ts/system/Function"

import type { Augmented, Has } from "../../Has"
import { HasURI } from "../../Has"
import type { AnyF, AnyK } from "../Any"
import type { CovariantF, CovariantK } from "../Covariant"
import type { EnvironmentalF, EnvironmentalK } from "../FX/Environmental"
import type { FailF, FailK } from "../FX/Fail"
import type { RunF, RunK } from "../FX/Run"
import type { ErrFor, HKT_, HKT3_, HKTFull, KindFull, URIS } from "../HKT"
import type { MonadF, MonadK } from "../Monad"

/**
 * Model (F: F[_]) => (a: A) => F[A] with default params
 */
export function succeedF<F extends URIS, TL0 = any, TL1 = any, TL2 = any, TL3 = any>(
  F: AnyK<F, TL0, TL1, TL2, TL3> & CovariantK<F, TL0, TL1, TL2, TL3>
): <A, S, SI, SO = SI>(
  a: () => A
) => KindFull<
  F,
  TL0,
  TL1,
  TL2,
  TL3,
  never,
  never,
  SI,
  SO,
  never,
  unknown,
  S,
  unknown,
  never,
  A
>
export function succeedF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>(
  F: AnyF<F, TL0, TL1, TL2, TL3> & CovariantF<F, TL0, TL1, TL2, TL3>
): <A, S, SI, SO = SI>(
  a: () => A
) => HKTFull<
  F,
  TL0,
  TL1,
  TL2,
  TL3,
  never,
  never,
  SI,
  SO,
  never,
  unknown,
  S,
  unknown,
  never,
  A
>
export function succeedF<F>(F: AnyF<F> & CovariantF<F>): <A>(a: () => A) => HKT_<F, A> {
  return (a) =>
    pipe(
      F.any(),
      F.map(() => a())
    )
}

/**
 * Model (F: F[_]) => (a: A) => F[A] with generic params
 */
export function anyF<F extends URIS, TL0 = any, TL1 = any, TL2 = any, TL3 = any>(
  F: AnyK<F, TL0, TL1, TL2, TL3> & CovariantK<F, TL0, TL1, TL2, TL3>
): <A>(
  a: A
) => KindFull<F, TL0, TL1, TL2, TL3, any, any, any, any, any, any, any, any, any, A>
export function anyF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>(
  F: AnyF<F> & CovariantF<F>
): <A>(
  a: A
) => HKTFull<F, TL0, TL1, TL2, TL3, any, any, any, any, any, any, any, any, any, A>
export function anyF<F>(F: AnyF<F> & CovariantF<F>): <A>(a: A) => HKT_<F, A> {
  return (a) =>
    pipe(
      F.any(),
      F.map(() => a)
    )
}

/**
 * Generic pipeable "do" (used to begin do-like pipe)
 */
export function doF<F extends URIS, TL0 = any, TL1 = any, TL2 = any, TL3 = any>(
  F: MonadK<F, TL0, TL1, TL2, TL3>
): <S, I, O = I>() => KindFull<
  F,
  TL0,
  TL1,
  TL2,
  TL3,
  never,
  never,
  I,
  O,
  never,
  unknown,
  S,
  unknown,
  never,
  {}
>
export function doF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>(
  F: MonadF<F, TL0, TL1, TL2, TL3>
): <S, I, O = I>() => HKTFull<
  F,
  TL0,
  TL1,
  TL2,
  TL3,
  never,
  never,
  I,
  O,
  never,
  unknown,
  S,
  unknown,
  never,
  {}
>
export function doF<F>(F: MonadF<F>): () => HKT_<F, {}> {
  return () =>
    pipe(
      F.any(),
      F.map(() => ({}))
    )
}

/**
 * Generic pipeable "bind"
 */
export function bindF<F extends URIS, TL0 = any, TL1 = any, TL2 = any, TL3 = any>(
  F: MonadK<F, TL0, TL1, TL2, TL3>
): <TK, TKN extends string, SO, SO2, X, I, S, R, E, A, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => KindFull<F, TL0, TL1, TL2, TL3, TK, TKN, SO, SO2, X, I, S, R, E, A>
) => <SK, SKN extends string, SI, X2, I2, R2, E2>(
  mk: KindFull<F, TL0, TL1, TL2, TL3, SK, SKN, SI, SO, X2, I2, S, R2, E2, K>
) => KindFull<
  F,
  TL0,
  TL1,
  TL2,
  TL3,
  TK,
  TKN,
  SI,
  SO2,
  X | X2,
  I & I2,
  S,
  R & R2,
  E | E2,
  K & { [k in N]: A }
>
export function bindF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>(
  F: MonadF<F, TL0, TL1, TL2, TL3>
): <TK, TKN extends string, SO, SO2, X, I, S, R, E, A, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => HKTFull<F, TL0, TL1, TL2, TL3, TK, TKN, SO, SO2, X, I, S, R, E, A>
) => <SK, SKN extends string, SI, X2, I2, R2, E2>(
  mk: HKTFull<F, TL0, TL1, TL2, TL3, SK, SKN, SI, SO, X2, I2, S, R2, E2, K>
) => HKTFull<
  F,
  TL0,
  TL1,
  TL2,
  TL3,
  TK,
  TKN,
  SI,
  SO2,
  X | X2,
  I & I2,
  S,
  R & R2,
  E | E2,
  K & { [k in N]: A }
>
export function bindF<F>(F: MonadF<F>) {
  return <A, K, N extends string>(
    tag: Exclude<N, keyof K>,
    f: (_: K) => HKT_<F, A>
  ) => (mk: HKT_<F, K>): HKT_<F, K & { [k in N]: A }> =>
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

/**
 * Generic pipeable chain
 */
export function chainF<F extends URIS, TL0 = any, TL1 = any, TL2 = any, TL3 = any>(
  F: MonadK<F, TL0, TL1, TL2, TL3>
): <TK, TKN extends string, SO, SO2, X, I, S, R, E, A, B>(
  f: (_: A) => KindFull<F, TL0, TL1, TL2, TL3, TK, TKN, SO, SO2, X, I, S, R, E, B>
) => <SK, SKN extends string, SI, X2, I2, R2, E2>(
  mk: KindFull<F, TL0, TL1, TL2, TL3, SK, SKN, SI, SO, X2, I2, S, R2, E2, A>
) => KindFull<
  F,
  TL0,
  TL1,
  TL2,
  TL3,
  TK,
  TKN,
  SI,
  SO2,
  X2 | X,
  I & I2,
  S,
  R & R2,
  E2 | E,
  B
>
export function chainF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>(
  F: MonadF<F, TL0, TL1, TL2, TL3>
): <TK, TKN extends string, SO, SO2, X, I, S, R, E, A, B>(
  f: (_: A) => HKTFull<F, TL0, TL1, TL2, TL3, TK, TKN, SO, SO2, X, I, S, R, E, B>
) => <SK, SKN extends string, SI, X2, I2, R2, E2>(
  mk: HKTFull<F, TL0, TL1, TL2, TL3, SK, SKN, SI, SO, X2, I2, S, R2, E2, A>
) => HKTFull<
  F,
  TL0,
  TL1,
  TL2,
  TL3,
  TK,
  TKN,
  SI,
  SO2,
  X2 | X,
  I & I2,
  S,
  R & R2,
  E2 | E,
  B
>
export function chainF<F>(F: MonadF<F>) {
  return <A, B>(f: (_: A) => HKT_<F, B>) => (mk: HKT_<F, A>): HKT_<F, B> =>
    pipe(mk, F.map(f), F.flatten)
}

/**
 * Generic accessM
 */
export function accessMF<F extends URIS, TL0 = any, TL1 = any, TL2 = any, TL3 = any>(
  F: EnvironmentalK<F, TL0, TL1, TL2, TL3>
): <TK, TKN extends string, SI, SO, Y, X, S, R, R1, E, A>(
  f: (r: R) => KindFull<F, TL0, TL1, TL2, TL3, TK, TKN, SI, SO, Y, X, S, R1, E, A>
) => KindFull<F, TL0, TL1, TL2, TL3, TK, TKN, SI, SO, Y, X, S, R & R1, E, A>
export function accessMF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>(
  F: EnvironmentalF<F, TL0, TL1, TL2, TL3>
): <TK, TKN extends string, SI, SO, X, I, S, R, E, R0, A>(
  f: (r: R0) => HKTFull<F, TL0, TL1, TL2, TL3, TK, TKN, SI, SO, X, I, S, R, E, A>
) => HKTFull<F, TL0, TL1, TL2, TL3, TK, TKN, SI, SO, X, I, S, R & R0, E, A>
export function accessMF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>(
  F: EnvironmentalF<F, TL0, TL1, TL2, TL3>
): <E, R, R1, A>(f: (r: R) => HKT3_<F, R1, E, A>) => HKT3_<F, R & R1, E, A> {
  return <R, R1, E, A>(f: (r: R) => HKT3_<F, R1, E, A>): HKT3_<F, R & R1, E, A> =>
    pipe(
      F.access((r: R) => f(r)),
      F.flatten
    )
}

/**
 * Generic provideSome
 */
export function provideSomeF<
  F extends URIS,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>(
  F: EnvironmentalK<F, TL0, TL1, TL2, TL3>
): <R0, R>(
  f: (r: R0) => R
) => <TK, TKN extends string, SI, SO, X, I, S, E, A>(
  fa: KindFull<F, TL0, TL1, TL2, TL3, TK, TKN, SI, SO, X, I, S, R, E, A>
) => KindFull<F, TL0, TL1, TL2, TL3, TK, TKN, SI, SO, X, I, S, R0, E, A>
export function provideSomeF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>(
  F: EnvironmentalF<F, TL0, TL1, TL2, TL3>
): <R0, R>(
  f: (r: R0) => R
) => <TK, TKN extends string, SI, SO, X, I, S, E, A>(
  fa: HKTFull<F, TL0, TL1, TL2, TL3, TK, TKN, SI, SO, X, I, S, R, E, A>
) => HKTFull<F, TL0, TL1, TL2, TL3, TK, TKN, SI, SO, X, I, S, R0, E, A>
export function provideSomeF<F>(
  F: EnvironmentalF<F>
): <R0, R>(f: (r: R0) => R) => <E, A>(fa: HKT3_<F, R, E, A>) => HKT3_<F, R0, E, A> {
  return <R0, R>(f: (r: R0) => R) => <E, A>(fa: HKT3_<F, R, E, A>) =>
    accessMF(F)((r: R0) => F.provide(f(r))(fa))
}

/**
 * Generic provideSome
 */
export function provideServiceF<
  F extends URIS,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>(
  F: EnvironmentalK<F, TL0, TL1, TL2, TL3>
): <SR>(
  Has: Augmented<SR>
) => (
  Service: SR
) => <TK, TKN extends string, SI, SO, X, I, S, R, E, A>(
  fa: KindFull<F, TL0, TL1, TL2, TL3, TK, TKN, SI, SO, X, I, S, R & Has<SR>, E, A>
) => KindFull<F, TL0, TL1, TL2, TL3, TK, TKN, SI, SO, X, I, S, R, E, A>
export function provideServiceF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>(
  F: EnvironmentalF<F, TL0, TL1, TL2, TL3>
): <SR>(
  Has: Augmented<SR>
) => (
  Service: SR
) => <TK, TKN extends string, SI, SO, X, I, S, R, E, A>(
  fa: HKTFull<F, TL0, TL1, TL2, TL3, TK, TKN, SI, SO, X, I, S, R & Has<SR>, E, A>
) => HKTFull<F, TL0, TL1, TL2, TL3, TK, TKN, SI, SO, X, I, S, R, E, A>
export function provideServiceF<F>(
  F: EnvironmentalF<F>
): <SR>(
  Has: Augmented<SR>
) => (Service: SR) => <R, E, A>(fa: HKT3_<F, R & Has<SR>, E, A>) => HKT3_<F, R, E, A> {
  return (Has) => (Service) =>
    provideSomeF(F)((r) => ({ ...r, [Has[HasURI].key]: Service } as any))
}

/**
 * Generic accessServiceM
 */
export function accessServiceMF<
  F extends URIS,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>(
  F: EnvironmentalK<F, TL0, TL1, TL2, TL3>
): <SR>(
  Has: Augmented<SR>
) => <TK, TKN extends string, SI, SO, Y, X, S, R1, E, A>(
  f: (r: SR) => KindFull<F, TL0, TL1, TL2, TL3, TK, TKN, SI, SO, Y, X, S, R1, E, A>
) => KindFull<F, TL0, TL1, TL2, TL3, TK, TKN, SI, SO, Y, X, S, R1 & Has<SR>, E, A>
export function accessServiceMF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>(
  F: EnvironmentalF<F, TL0, TL1, TL2, TL3>
): <SR>(
  Has: Augmented<SR>
) => <TK, TKN extends string, SI, SO, Y, X, S, R1, E, A>(
  f: (r: SR) => HKTFull<F, TL0, TL1, TL2, TL3, TK, TKN, SI, SO, Y, X, S, R1, E, A>
) => HKTFull<F, TL0, TL1, TL2, TL3, TK, TKN, SI, SO, Y, X, S, R1 & Has<SR>, E, A>
export function accessServiceMF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>(
  F: EnvironmentalF<F, TL0, TL1, TL2, TL3>
): <SR>(
  Has: Augmented<SR>
) => <E, R1, A>(f: (r: SR) => HKT3_<F, R1, E, A>) => HKT3_<F, R1 & Has<SR>, E, A> {
  return <SR>(Has: Augmented<SR>) => <R1, E, A>(
    f: (r: SR) => HKT3_<F, R1, E, A>
  ): HKT3_<F, R1 & Has<SR>, E, A> =>
    pipe(
      F.access((r: Has<SR>) => f(r[Has[HasURI].key as any])),
      F.flatten
    )
}

export function mapErrorF<F extends URIS, TL0 = any, TL1 = any, TL2 = any, TL3 = any>(
  F: FailK<F, TL0, TL1, TL2, TL3> &
    RunK<F, TL0, TL1, TL2, TL3> &
    MonadK<F, TL0, TL1, TL2, TL3>
): <E, E1>(
  f: (e: ErrFor<F, TL0, TL1, TL2, TL3, E>) => ErrFor<F, TL0, TL1, TL2, TL3, E1>
) => <K, NK extends string, SI, SO, X, In, St, Env, A>(
  fa: KindFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, St, Env, E, A>
) => KindFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, St, Env, E1, A>
export function mapErrorF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>(
  F: FailF<F, TL0, TL1, TL2, TL3> &
    RunF<F, TL0, TL1, TL2, TL3> &
    MonadF<F, TL0, TL1, TL2, TL3>
): <E, E1>(
  f: (e: ErrFor<F, TL0, TL1, TL2, TL3, E>) => ErrFor<F, TL0, TL1, TL2, TL3, E1>
) => <K, NK extends string, SI, SO, X, In, St, Env, A>(
  fa: HKTFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, St, Env, E, A>
) => HKTFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, St, Env, E1, A>
export function mapErrorF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>(
  F: FailF<F, TL0, TL1, TL2, TL3> &
    RunF<F, TL0, TL1, TL2, TL3> &
    MonadF<F, TL0, TL1, TL2, TL3>
): <E, E1>(
  f: (e: ErrFor<F, TL0, TL1, TL2, TL3, E>) => ErrFor<F, TL0, TL1, TL2, TL3, E1>
) => <K, NK extends string, SI, SO, X, In, St, Env, A>(
  fa: HKTFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, St, Env, E, A>
) => HKTFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, St, Env, E1, A> {
  return (f) => (fa) =>
    pipe(
      fa,
      F.run,
      chainF(F)((e) =>
        e._tag === "Left" ? F.fail(f(e.left)) : succeedF(F)(() => e.right)
      )
    )
}
