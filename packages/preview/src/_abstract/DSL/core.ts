import { Augmented, Has, HasURI } from "../../Has"
import { pipe } from "../../_system/Function"
import { AnyF, AnyK } from "../Any"
import { CovariantF, CovariantK } from "../Covariant"
import { EnvironmentalF, EnvironmentalK } from "../FX/Environmental"
import { FailF, FailK } from "../FX/Fail"
import { RecoverF, RecoverK } from "../FX/Recover"
import { ErrFor, HKT, HKT3, HKTFix, KindFix, URIS } from "../HKT"
import { MonadF, MonadK } from "../Monad"

/**
 * Model (F: F[_]) => (a: A) => F[A] with default params
 */
export function succeedF<
  F extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
>(
  F: AnyK<F, Fix0, Fix1, Fix2, Fix3> & CovariantK<F, Fix0, Fix1, Fix2, Fix3>
): <A, S, SI, SO = SI>(
  a: () => A
) => KindFix<
  F,
  Fix0,
  Fix1,
  Fix2,
  Fix3,
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
export function succeedF<F, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>(
  F: AnyF<F, Fix0, Fix1, Fix2, Fix3> & CovariantF<F, Fix0, Fix1, Fix2, Fix3>
): <A, S, SI, SO = SI>(
  a: () => A
) => HKTFix<
  F,
  Fix0,
  Fix1,
  Fix2,
  Fix3,
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
export function succeedF<F>(F: AnyF<F> & CovariantF<F>): <A>(a: () => A) => HKT<F, A> {
  return (a) =>
    pipe(
      F.any(),
      F.map(() => a())
    )
}

/**
 * Model (F: F[_]) => (a: A) => F[A] with generic params
 */
export function anyF<F extends URIS, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>(
  F: AnyK<F, Fix0, Fix1, Fix2, Fix3> & CovariantK<F, Fix0, Fix1, Fix2, Fix3>
): <A>(
  a: A
) => KindFix<F, Fix0, Fix1, Fix2, Fix3, any, any, any, any, any, any, any, any, any, A>
export function anyF<F, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>(
  F: AnyF<F> & CovariantF<F>
): <A>(
  a: A
) => HKTFix<F, Fix0, Fix1, Fix2, Fix3, any, any, any, any, any, any, any, any, any, A>
export function anyF<F>(F: AnyF<F> & CovariantF<F>): <A>(a: A) => HKT<F, A> {
  return (a) =>
    pipe(
      F.any(),
      F.map(() => a)
    )
}

/**
 * Generic pipeable "do" (used to begin do-like pipe)
 */
export function doF<F extends URIS, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>(
  F: MonadK<F, Fix0, Fix1, Fix2, Fix3>
): <S, I, O = I>() => KindFix<
  F,
  Fix0,
  Fix1,
  Fix2,
  Fix3,
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
export function doF<F, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>(
  F: MonadF<F, Fix0, Fix1, Fix2, Fix3>
): <S, I, O = I>() => HKTFix<
  F,
  Fix0,
  Fix1,
  Fix2,
  Fix3,
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
export function doF<F>(F: MonadF<F>): () => HKT<F, {}> {
  return () =>
    pipe(
      F.any(),
      F.map(() => ({}))
    )
}

/**
 * Generic pipeable "bind"
 */
export function bindF<F extends URIS, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>(
  F: MonadK<F, Fix0, Fix1, Fix2, Fix3>
): <TK, TKN extends string, SO, SO2, X, I, S, R, E, A, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => KindFix<F, Fix0, Fix1, Fix2, Fix3, TK, TKN, SO, SO2, X, I, S, R, E, A>
) => <SK, SKN extends string, SI, X2, I2, R2, E2>(
  mk: KindFix<F, Fix0, Fix1, Fix2, Fix3, SK, SKN, SI, SO, X2, I2, S, R2, E2, K>
) => KindFix<
  F,
  Fix0,
  Fix1,
  Fix2,
  Fix3,
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
export function bindF<F, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>(
  F: MonadF<F, Fix0, Fix1, Fix2, Fix3>
): <TK, TKN extends string, SO, SO2, X, I, S, R, E, A, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => HKTFix<F, Fix0, Fix1, Fix2, Fix3, TK, TKN, SO, SO2, X, I, S, R, E, A>
) => <SK, SKN extends string, SI, X2, I2, R2, E2>(
  mk: HKTFix<F, Fix0, Fix1, Fix2, Fix3, SK, SKN, SI, SO, X2, I2, S, R2, E2, K>
) => HKTFix<
  F,
  Fix0,
  Fix1,
  Fix2,
  Fix3,
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
  return <A, K, N extends string>(tag: Exclude<N, keyof K>, f: (_: K) => HKT<F, A>) => (
    mk: HKT<F, K>
  ): HKT<F, K & { [k in N]: A }> =>
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
export function chainF<F extends URIS, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>(
  F: MonadK<F, Fix0, Fix1, Fix2, Fix3>
): <TK, TKN extends string, SO, SO2, X, I, S, R, E, A, B>(
  f: (_: A) => KindFix<F, Fix0, Fix1, Fix2, Fix3, TK, TKN, SO, SO2, X, I, S, R, E, B>
) => <SK, SKN extends string, SI, X2, I2, R2, E2>(
  mk: KindFix<F, Fix0, Fix1, Fix2, Fix3, SK, SKN, SI, SO, X2, I2, S, R2, E2, A>
) => KindFix<
  F,
  Fix0,
  Fix1,
  Fix2,
  Fix3,
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
export function chainF<F, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>(
  F: MonadF<F, Fix0, Fix1, Fix2, Fix3>
): <TK, TKN extends string, SO, SO2, X, I, S, R, E, A, B>(
  f: (_: A) => HKTFix<F, Fix0, Fix1, Fix2, Fix3, TK, TKN, SO, SO2, X, I, S, R, E, B>
) => <SK, SKN extends string, SI, X2, I2, R2, E2>(
  mk: HKTFix<F, Fix0, Fix1, Fix2, Fix3, SK, SKN, SI, SO, X2, I2, S, R2, E2, A>
) => HKTFix<
  F,
  Fix0,
  Fix1,
  Fix2,
  Fix3,
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
  return <A, B>(f: (_: A) => HKT<F, B>) => (mk: HKT<F, A>): HKT<F, B> =>
    pipe(mk, F.map(f), F.flatten)
}

/**
 * Generic accessM
 */
export function accessMF<
  F extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
>(
  F: EnvironmentalK<F, Fix0, Fix1, Fix2, Fix3>
): <TK, TKN extends string, SI, SO, Y, X, S, R, R1, E, A>(
  f: (r: R) => KindFix<F, Fix0, Fix1, Fix2, Fix3, TK, TKN, SI, SO, Y, X, S, R1, E, A>
) => KindFix<F, Fix0, Fix1, Fix2, Fix3, TK, TKN, SI, SO, Y, X, S, R & R1, E, A>
export function accessMF<F, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>(
  F: EnvironmentalF<F, Fix0, Fix1, Fix2, Fix3>
): <TK, TKN extends string, SI, SO, X, I, S, R, E, R0, A>(
  f: (r: R0) => HKTFix<F, Fix0, Fix1, Fix2, Fix3, TK, TKN, SI, SO, X, I, S, R, E, A>
) => HKTFix<F, Fix0, Fix1, Fix2, Fix3, TK, TKN, SI, SO, X, I, S, R & R0, E, A>
export function accessMF<F, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>(
  F: EnvironmentalF<F, Fix0, Fix1, Fix2, Fix3>
): <E, R, R1, A>(f: (r: R) => HKT3<F, R1, E, A>) => HKT3<F, R & R1, E, A> {
  return <R, R1, E, A>(f: (r: R) => HKT3<F, R1, E, A>): HKT3<F, R & R1, E, A> =>
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
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
>(
  F: EnvironmentalK<F, Fix0, Fix1, Fix2, Fix3>
): <R0, R>(
  f: (r: R0) => R
) => <TK, TKN extends string, SI, SO, X, I, S, E, A>(
  fa: KindFix<F, Fix0, Fix1, Fix2, Fix3, TK, TKN, SI, SO, X, I, S, R, E, A>
) => KindFix<F, Fix0, Fix1, Fix2, Fix3, TK, TKN, SI, SO, X, I, S, R0, E, A>
export function provideSomeF<F, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>(
  F: EnvironmentalF<F, Fix0, Fix1, Fix2, Fix3>
): <R0, R>(
  f: (r: R0) => R
) => <TK, TKN extends string, SI, SO, X, I, S, E, A>(
  fa: HKTFix<F, Fix0, Fix1, Fix2, Fix3, TK, TKN, SI, SO, X, I, S, R, E, A>
) => HKTFix<F, Fix0, Fix1, Fix2, Fix3, TK, TKN, SI, SO, X, I, S, R0, E, A>
export function provideSomeF<F>(
  F: EnvironmentalF<F>
): <R0, R>(f: (r: R0) => R) => <E, A>(fa: HKT3<F, R, E, A>) => HKT3<F, R0, E, A> {
  return <R0, R>(f: (r: R0) => R) => <E, A>(fa: HKT3<F, R, E, A>) =>
    accessMF(F)((r: R0) => F.provide(f(r))(fa))
}

/**
 * Generic provideSome
 */
export function provideServiceF<
  F extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
>(
  F: EnvironmentalK<F, Fix0, Fix1, Fix2, Fix3>
): <SR>(
  Has: Augmented<SR>
) => (
  Service: SR
) => <TK, TKN extends string, SI, SO, X, I, S, R, E, A>(
  fa: KindFix<F, Fix0, Fix1, Fix2, Fix3, TK, TKN, SI, SO, X, I, S, R & Has<SR>, E, A>
) => KindFix<F, Fix0, Fix1, Fix2, Fix3, TK, TKN, SI, SO, X, I, S, R, E, A>
export function provideServiceF<F, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>(
  F: EnvironmentalF<F, Fix0, Fix1, Fix2, Fix3>
): <SR>(
  Has: Augmented<SR>
) => (
  Service: SR
) => <TK, TKN extends string, SI, SO, X, I, S, R, E, A>(
  fa: HKTFix<F, Fix0, Fix1, Fix2, Fix3, TK, TKN, SI, SO, X, I, S, R & Has<SR>, E, A>
) => HKTFix<F, Fix0, Fix1, Fix2, Fix3, TK, TKN, SI, SO, X, I, S, R, E, A>
export function provideServiceF<F>(
  F: EnvironmentalF<F>
): <SR>(
  Has: Augmented<SR>
) => (Service: SR) => <R, E, A>(fa: HKT3<F, R & Has<SR>, E, A>) => HKT3<F, R, E, A> {
  return (Has) => (Service) =>
    provideSomeF(F)((r) => ({ ...r, [Has[HasURI].key]: Service } as any))
}

/**
 * Generic accessServiceM
 */
export function accessServiceMF<
  F extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
>(
  F: EnvironmentalK<F, Fix0, Fix1, Fix2, Fix3>
): <SR>(
  Has: Augmented<SR>
) => <TK, TKN extends string, SI, SO, Y, X, S, R1, E, A>(
  f: (r: SR) => KindFix<F, Fix0, Fix1, Fix2, Fix3, TK, TKN, SI, SO, Y, X, S, R1, E, A>
) => KindFix<F, Fix0, Fix1, Fix2, Fix3, TK, TKN, SI, SO, Y, X, S, R1 & Has<SR>, E, A>
export function accessServiceMF<F, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>(
  F: EnvironmentalF<F, Fix0, Fix1, Fix2, Fix3>
): <SR>(
  Has: Augmented<SR>
) => <TK, TKN extends string, SI, SO, Y, X, S, R1, E, A>(
  f: (r: SR) => HKTFix<F, Fix0, Fix1, Fix2, Fix3, TK, TKN, SI, SO, Y, X, S, R1, E, A>
) => HKTFix<F, Fix0, Fix1, Fix2, Fix3, TK, TKN, SI, SO, Y, X, S, R1 & Has<SR>, E, A>
export function accessServiceMF<F, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>(
  F: EnvironmentalF<F, Fix0, Fix1, Fix2, Fix3>
): <SR>(
  Has: Augmented<SR>
) => <E, R1, A>(f: (r: SR) => HKT3<F, R1, E, A>) => HKT3<F, R1 & Has<SR>, E, A> {
  return <SR>(Has: Augmented<SR>) => <R1, E, A>(
    f: (r: SR) => HKT3<F, R1, E, A>
  ): HKT3<F, R1 & Has<SR>, E, A> =>
    pipe(
      F.access((r: Has<SR>) => f(r[Has[HasURI].key as any])),
      F.flatten
    )
}
export function mapErrorF<
  F extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
>(
  F: FailK<F, Fix0, Fix1, Fix2, Fix3> & RecoverK<F, Fix0, Fix1, Fix2, Fix3>
): <E, E1>(
  f: (e: ErrFor<F, Fix0, Fix1, Fix2, Fix3, E>) => ErrFor<F, Fix0, Fix1, Fix2, Fix3, E1>
) => <K, NK extends string, SI, SO, X, In, St, Env, A>(
  fa: KindFix<F, Fix0, Fix1, Fix2, Fix3, K, NK, SI, SO, X, In, St, Env, E, A>
) => KindFix<F, Fix0, Fix1, Fix2, Fix3, K, NK, SI, SO, X, In, St, Env, E1, A>
export function mapErrorF<F, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>(
  F: FailF<F, Fix0, Fix1, Fix2, Fix3> & RecoverF<F, Fix0, Fix1, Fix2, Fix3>
): <E, E1>(
  f: (e: ErrFor<F, Fix0, Fix1, Fix2, Fix3, E>) => ErrFor<F, Fix0, Fix1, Fix2, Fix3, E1>
) => <K, NK extends string, SI, SO, X, In, St, Env, A>(
  fa: HKTFix<F, Fix0, Fix1, Fix2, Fix3, K, NK, SI, SO, X, In, St, Env, E, A>
) => HKTFix<F, Fix0, Fix1, Fix2, Fix3, K, NK, SI, SO, X, In, St, Env, E1, A>
export function mapErrorF<F, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>(
  F: FailF<F, Fix0, Fix1, Fix2, Fix3> & RecoverF<F, Fix0, Fix1, Fix2, Fix3>
): <E, E1>(
  f: (e: ErrFor<F, Fix0, Fix1, Fix2, Fix3, E>) => ErrFor<F, Fix0, Fix1, Fix2, Fix3, E1>
) => <K, NK extends string, SI, SO, X, In, St, Env, A>(
  fa: HKTFix<F, Fix0, Fix1, Fix2, Fix3, K, NK, SI, SO, X, In, St, Env, E, A>
) => HKTFix<F, Fix0, Fix1, Fix2, Fix3, K, NK, SI, SO, X, In, St, Env, E1, A> {
  return (f) => (fa) =>
    pipe(
      fa,
      F.recover((e) => F.fail(f(e)))
    )
}
