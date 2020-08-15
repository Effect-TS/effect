import { Augmented, Has, HasURI } from "../../Has"
import { pipe } from "../../_system/Function"
import { AnyF, AnyK, AnyKE } from "../Any"
import { CovariantF, CovariantK, CovariantKE } from "../Covariant"
import { EnvironmentalF, EnvironmentalK, EnvironmentalKE } from "../FX/Environmental"
import { FailF, FailK, FailKE } from "../FX/Fail"
import { RunF, RunK, RunKE } from "../FX/Run"
import { HKT, HKT3, HKTTL, KindTL, URIS } from "../HKT"
import { MonadF, MonadK, MonadKE } from "../Monad"

/**
 * Model (F: F[_]) => (a: A) => F[A] with default params
 */
export function succeedF<F extends URIS, E, TL0 = any, TL1 = any, TL2 = any, TL3 = any>(
  F: AnyKE<F, E, TL0, TL1, TL2, TL3> & CovariantKE<F, E, TL0, TL1, TL2, TL3>
): <A, S, SI, SO = SI>(
  a: () => A
) => KindTL<
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
  E,
  A
>
export function succeedF<F extends URIS, TL0 = any, TL1 = any, TL2 = any, TL3 = any>(
  F: AnyK<F, TL0, TL1, TL2, TL3> & CovariantK<F, TL0, TL1, TL2, TL3>
): <A, S, SI, SO = SI>(
  a: () => A
) => KindTL<
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
) => HKTTL<
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
export function anyF<F extends URIS, E, TL0 = any, TL1 = any, TL2 = any, TL3 = any>(
  F: AnyKE<F, E, TL0, TL1, TL2, TL3> & CovariantKE<F, E, TL0, TL1, TL2, TL3>
): <A>(
  a: A
) => KindTL<F, TL0, TL1, TL2, TL3, any, any, any, any, any, any, any, any, E, A>
export function anyF<F extends URIS, TL0 = any, TL1 = any, TL2 = any, TL3 = any>(
  F: AnyK<F, TL0, TL1, TL2, TL3> & CovariantK<F, TL0, TL1, TL2, TL3>
): <A>(
  a: A
) => KindTL<F, TL0, TL1, TL2, TL3, any, any, any, any, any, any, any, any, any, A>
export function anyF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>(
  F: AnyF<F> & CovariantF<F>
): <A>(
  a: A
) => HKTTL<F, TL0, TL1, TL2, TL3, any, any, any, any, any, any, any, any, any, A>
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
export function doF<F extends URIS, E, TL0 = any, TL1 = any, TL2 = any, TL3 = any>(
  F: MonadKE<F, E, TL0, TL1, TL2, TL3>
): <S, I, O = I>() => KindTL<
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
  E,
  {}
>
export function doF<F extends URIS, TL0 = any, TL1 = any, TL2 = any, TL3 = any>(
  F: MonadK<F, TL0, TL1, TL2, TL3>
): <S, I, O = I>() => KindTL<
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
): <S, I, O = I>() => HKTTL<
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
export function bindF<F extends URIS, E, TL0 = any, TL1 = any, TL2 = any, TL3 = any>(
  F: MonadKE<F, E, TL0, TL1, TL2, TL3>
): <TK, TKN extends string, SO, SO2, X, I, S, R, A, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => KindTL<F, TL0, TL1, TL2, TL3, TK, TKN, SO, SO2, X, I, S, R, E, A>
) => <SK, SKN extends string, SI, X2, I2, R2>(
  mk: KindTL<F, TL0, TL1, TL2, TL3, SK, SKN, SI, SO, X2, I2, S, R2, E, K>
) => KindTL<
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
  E,
  K & { [k in N]: A }
>
export function bindF<F extends URIS, TL0 = any, TL1 = any, TL2 = any, TL3 = any>(
  F: MonadK<F, TL0, TL1, TL2, TL3>
): <TK, TKN extends string, SO, SO2, X, I, S, R, E, A, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => KindTL<F, TL0, TL1, TL2, TL3, TK, TKN, SO, SO2, X, I, S, R, E, A>
) => <SK, SKN extends string, SI, X2, I2, R2, E2>(
  mk: KindTL<F, TL0, TL1, TL2, TL3, SK, SKN, SI, SO, X2, I2, S, R2, E2, K>
) => KindTL<
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
  f: (_: K) => HKTTL<F, TL0, TL1, TL2, TL3, TK, TKN, SO, SO2, X, I, S, R, E, A>
) => <SK, SKN extends string, SI, X2, I2, R2, E2>(
  mk: HKTTL<F, TL0, TL1, TL2, TL3, SK, SKN, SI, SO, X2, I2, S, R2, E2, K>
) => HKTTL<
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
export function chainF<F extends URIS, E, TL0 = any, TL1 = any, TL2 = any, TL3 = any>(
  F: MonadKE<F, E, TL0, TL1, TL2, TL3>
): <TK, TKN extends string, SO, SO2, X, I, S, R, A, B>(
  f: (_: A) => KindTL<F, TL0, TL1, TL2, TL3, TK, TKN, SO, SO2, X, I, S, R, E, B>
) => <SK, SKN extends string, SI, X2, I2, R2>(
  mk: KindTL<F, TL0, TL1, TL2, TL3, SK, SKN, SI, SO, X2, I2, S, R2, E, A>
) => KindTL<F, TL0, TL1, TL2, TL3, TK, TKN, SI, SO2, X2 | X, I & I2, S, R & R2, E, B>
export function chainF<F extends URIS, TL0 = any, TL1 = any, TL2 = any, TL3 = any>(
  F: MonadK<F, TL0, TL1, TL2, TL3>
): <TK, TKN extends string, SO, SO2, X, I, S, R, E, A, B>(
  f: (_: A) => KindTL<F, TL0, TL1, TL2, TL3, TK, TKN, SO, SO2, X, I, S, R, E, B>
) => <SK, SKN extends string, SI, X2, I2, R2, E2>(
  mk: KindTL<F, TL0, TL1, TL2, TL3, SK, SKN, SI, SO, X2, I2, S, R2, E2, A>
) => KindTL<
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
  f: (_: A) => HKTTL<F, TL0, TL1, TL2, TL3, TK, TKN, SO, SO2, X, I, S, R, E, B>
) => <SK, SKN extends string, SI, X2, I2, R2, E2>(
  mk: HKTTL<F, TL0, TL1, TL2, TL3, SK, SKN, SI, SO, X2, I2, S, R2, E2, A>
) => HKTTL<
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
  return <A, B>(f: (_: A) => HKT<F, B>) => (mk: HKT<F, A>): HKT<F, B> =>
    pipe(mk, F.map(f), F.flatten)
}

/**
 * Generic accessM
 */
export function accessMF<F extends URIS, E, TL0 = any, TL1 = any, TL2 = any, TL3 = any>(
  F: EnvironmentalKE<F, E, TL0, TL1, TL2, TL3>
): <TK, TKN extends string, SI, SO, Y, X, S, R, R1, A>(
  f: (r: R) => KindTL<F, TL0, TL1, TL2, TL3, TK, TKN, SI, SO, Y, X, S, R1, E, A>
) => KindTL<F, TL0, TL1, TL2, TL3, TK, TKN, SI, SO, Y, X, S, R & R1, E, A>
export function accessMF<F extends URIS, TL0 = any, TL1 = any, TL2 = any, TL3 = any>(
  F: EnvironmentalK<F, TL0, TL1, TL2, TL3>
): <TK, TKN extends string, SI, SO, Y, X, S, R, R1, E, A>(
  f: (r: R) => KindTL<F, TL0, TL1, TL2, TL3, TK, TKN, SI, SO, Y, X, S, R1, E, A>
) => KindTL<F, TL0, TL1, TL2, TL3, TK, TKN, SI, SO, Y, X, S, R & R1, E, A>
export function accessMF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>(
  F: EnvironmentalF<F, TL0, TL1, TL2, TL3>
): <TK, TKN extends string, SI, SO, X, I, S, R, E, R0, A>(
  f: (r: R0) => HKTTL<F, TL0, TL1, TL2, TL3, TK, TKN, SI, SO, X, I, S, R, E, A>
) => HKTTL<F, TL0, TL1, TL2, TL3, TK, TKN, SI, SO, X, I, S, R & R0, E, A>
export function accessMF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>(
  F: EnvironmentalF<F, TL0, TL1, TL2, TL3>
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
  E,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>(
  F: EnvironmentalKE<F, E, TL0, TL1, TL2, TL3>
): <R0, R>(
  f: (r: R0) => R
) => <TK, TKN extends string, SI, SO, X, I, S, A>(
  fa: KindTL<F, TL0, TL1, TL2, TL3, TK, TKN, SI, SO, X, I, S, R, E, A>
) => KindTL<F, TL0, TL1, TL2, TL3, TK, TKN, SI, SO, X, I, S, R0, E, A>
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
  fa: KindTL<F, TL0, TL1, TL2, TL3, TK, TKN, SI, SO, X, I, S, R, E, A>
) => KindTL<F, TL0, TL1, TL2, TL3, TK, TKN, SI, SO, X, I, S, R0, E, A>
export function provideSomeF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>(
  F: EnvironmentalF<F, TL0, TL1, TL2, TL3>
): <R0, R>(
  f: (r: R0) => R
) => <TK, TKN extends string, SI, SO, X, I, S, E, A>(
  fa: HKTTL<F, TL0, TL1, TL2, TL3, TK, TKN, SI, SO, X, I, S, R, E, A>
) => HKTTL<F, TL0, TL1, TL2, TL3, TK, TKN, SI, SO, X, I, S, R0, E, A>
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
  E,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>(
  F: EnvironmentalKE<F, E, TL0, TL1, TL2, TL3>
): <SR>(
  Has: Augmented<SR>
) => (
  Service: SR
) => <TK, TKN extends string, SI, SO, X, I, S, R, A>(
  fa: KindTL<F, TL0, TL1, TL2, TL3, TK, TKN, SI, SO, X, I, S, R & Has<SR>, E, A>
) => KindTL<F, TL0, TL1, TL2, TL3, TK, TKN, SI, SO, X, I, S, R, E, A>
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
  fa: KindTL<F, TL0, TL1, TL2, TL3, TK, TKN, SI, SO, X, I, S, R & Has<SR>, E, A>
) => KindTL<F, TL0, TL1, TL2, TL3, TK, TKN, SI, SO, X, I, S, R, E, A>
export function provideServiceF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>(
  F: EnvironmentalF<F, TL0, TL1, TL2, TL3>
): <SR>(
  Has: Augmented<SR>
) => (
  Service: SR
) => <TK, TKN extends string, SI, SO, X, I, S, R, E, A>(
  fa: HKTTL<F, TL0, TL1, TL2, TL3, TK, TKN, SI, SO, X, I, S, R & Has<SR>, E, A>
) => HKTTL<F, TL0, TL1, TL2, TL3, TK, TKN, SI, SO, X, I, S, R, E, A>
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
  E,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>(
  F: EnvironmentalKE<F, E, TL0, TL1, TL2, TL3>
): <SR>(
  Has: Augmented<SR>
) => <TK, TKN extends string, SI, SO, Y, X, S, R1, A>(
  f: (r: SR) => KindTL<F, TL0, TL1, TL2, TL3, TK, TKN, SI, SO, Y, X, S, R1, E, A>
) => KindTL<F, TL0, TL1, TL2, TL3, TK, TKN, SI, SO, Y, X, S, R1 & Has<SR>, E, A>
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
  f: (r: SR) => KindTL<F, TL0, TL1, TL2, TL3, TK, TKN, SI, SO, Y, X, S, R1, E, A>
) => KindTL<F, TL0, TL1, TL2, TL3, TK, TKN, SI, SO, Y, X, S, R1 & Has<SR>, E, A>
export function accessServiceMF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>(
  F: EnvironmentalF<F, TL0, TL1, TL2, TL3>
): <SR>(
  Has: Augmented<SR>
) => <TK, TKN extends string, SI, SO, Y, X, S, R1, E, A>(
  f: (r: SR) => HKTTL<F, TL0, TL1, TL2, TL3, TK, TKN, SI, SO, Y, X, S, R1, E, A>
) => HKTTL<F, TL0, TL1, TL2, TL3, TK, TKN, SI, SO, Y, X, S, R1 & Has<SR>, E, A>
export function accessServiceMF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>(
  F: EnvironmentalF<F, TL0, TL1, TL2, TL3>
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
  E,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>(
  F: FailKE<F, TL0, TL1, TL2, TL3> &
    RunKE<F, TL0, TL1, TL2, TL3> &
    MonadKE<F, TL0, TL1, TL2, TL3>
): (
  f: (e: E) => E
) => <K, NK extends string, SI, SO, X, In, St, Env, A>(
  fa: KindTL<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, St, Env, E, A>
) => KindTL<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, St, Env, E, A>
export function mapErrorF<F extends URIS, TL0 = any, TL1 = any, TL2 = any, TL3 = any>(
  F: FailK<F, TL0, TL1, TL2, TL3> &
    RunK<F, TL0, TL1, TL2, TL3> &
    MonadK<F, TL0, TL1, TL2, TL3>
): <E, E1>(
  f: (e: E) => E1
) => <K, NK extends string, SI, SO, X, In, St, Env, A>(
  fa: KindTL<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, St, Env, E, A>
) => KindTL<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, St, Env, E1, A>
export function mapErrorF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>(
  F: FailF<F, TL0, TL1, TL2, TL3> &
    RunF<F, TL0, TL1, TL2, TL3> &
    MonadF<F, TL0, TL1, TL2, TL3>
): <E, E1>(
  f: (e: E) => E1
) => <K, NK extends string, SI, SO, X, In, St, Env, A>(
  fa: HKTTL<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, St, Env, E, A>
) => HKTTL<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, St, Env, E1, A>
export function mapErrorF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>(
  F: FailF<F, TL0, TL1, TL2, TL3> &
    RunF<F, TL0, TL1, TL2, TL3> &
    MonadF<F, TL0, TL1, TL2, TL3>
): <E, E1>(
  f: (e: E) => E1
) => <K, NK extends string, SI, SO, X, In, St, Env, A>(
  fa: HKTTL<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, St, Env, E, A>
) => HKTTL<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, St, Env, E1, A> {
  return (f) => (fa) =>
    pipe(
      fa,
      F.run,
      chainF(F)((e) =>
        e._tag === "Left" ? F.fail(f(e.left)) : succeedF(F)(() => e.right)
      )
    )
}
