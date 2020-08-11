import { pipe } from "../../_system/Function"
import { AnyF, AnyK } from "../Any"
import { CovariantF, CovariantK } from "../Covariant"
import { EnvironmentalF, EnvironmentalK } from "../FX/Environmental"
import { HKT, HKT3, HKTFix, KindFix, URIS } from "../HKT"
import { MonadF, MonadK } from "../Monad"

/**
 * Model (F: F[_]) => (a: A) => F[A] with default params
 */
export function succeedF<F extends URIS, Fix = any>(
  F: AnyK<F, Fix> & CovariantK<F, Fix>
): <A, S, SI, SO = SI>(
  a: () => A
) => KindFix<F, Fix, never, never, SI, SO, never, unknown, S, unknown, never, A>
export function succeedF<F, Fix = any>(
  F: AnyF<F, Fix> & CovariantF<F, Fix>
): <A, S, SI, SO = SI>(
  a: () => A
) => HKTFix<F, Fix, never, never, SI, SO, never, unknown, S, unknown, never, A>
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
export function anyF<F extends URIS, Fix = any>(
  F: AnyK<F, Fix> & CovariantK<F, Fix>
): <A>(a: A) => KindFix<F, Fix, any, any, any, any, any, any, any, any, any, A>
export function anyF<F, Fix = any>(
  F: AnyF<F> & CovariantF<F>
): <A>(a: A) => HKTFix<F, Fix, any, any, any, any, any, any, any, any, any, A>
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
export function doF<F extends URIS, Fix = any>(
  F: MonadK<F, Fix>
): <S, I, O = I>() => KindFix<
  F,
  Fix,
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
export function doF<F, Fix = any>(
  F: MonadF<F, Fix>
): <S, I, O = I>() => HKTFix<
  F,
  Fix,
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
export function bindF<F extends URIS, Fix = any>(
  F: MonadK<F, Fix>
): <TK, TKN extends string, SO, SO2, X, I, S, R, E, A, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => KindFix<F, Fix, TK, TKN, SO, SO2, X, I, S, R, E, A>
) => <SK, SKN extends string, SI, X2, I2, R2, E2>(
  mk: KindFix<F, Fix, SK, SKN, SI, SO, X2, I2, S, R2, E2, K>
) => KindFix<
  F,
  Fix,
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
export function bindF<F, Fix = any>(
  F: MonadF<F, Fix>
): <TK, TKN extends string, SO, SO2, X, I, S, R, E, A, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => HKTFix<F, Fix, TK, TKN, SO, SO2, X, I, S, R, E, A>
) => <SK, SKN extends string, SI, X2, I2, R2, E2>(
  mk: HKTFix<F, Fix, SK, SKN, SI, SO, X2, I2, S, R2, E2, K>
) => HKTFix<
  F,
  Fix,
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
export function chainF<F extends URIS, Fix = any>(
  F: MonadK<F, Fix>
): <TK, TKN extends string, SO, SO2, X, I, S, R, E, A, B>(
  f: (_: A) => KindFix<F, Fix, TK, TKN, SO, SO2, X, I, S, R, E, B>
) => <SK, SKN extends string, SI, X2, I2, R2, E2>(
  mk: KindFix<F, Fix, SK, SKN, SI, SO, X2, I2, S, R2, E2, A>
) => KindFix<F, Fix, TK, TKN, SI, SO2, X2 | X, I & I2, S, R & R2, E2 | E, B>
export function chainF<F, Fix = any>(
  F: MonadF<F, Fix>
): <TK, TKN extends string, SO, SO2, X, I, S, R, E, A, B>(
  f: (_: A) => HKTFix<F, Fix, TK, TKN, SO, SO2, X, I, S, R, E, B>
) => <SK, SKN extends string, SI, X2, I2, R2, E2>(
  mk: HKTFix<F, Fix, SK, SKN, SI, SO, X2, I2, S, R2, E2, A>
) => HKTFix<F, Fix, TK, TKN, SI, SO2, X2 | X, I & I2, S, R & R2, E2 | E, B>
export function chainF<F>(F: MonadF<F>) {
  return <A, B>(f: (_: A) => HKT<F, B>) => (mk: HKT<F, A>): HKT<F, B> =>
    pipe(mk, F.map(f), F.flatten)
}

/**
 * Generic accessM
 */
export function accessMF<F extends URIS, Fix = any>(
  F: EnvironmentalK<F, Fix>
): <TK, TKN extends string, SI, SO, Y, X, S, R, R1, E, A>(
  f: (r: R) => KindFix<F, Fix, TK, TKN, SI, SO, Y, X, S, R1, E, A>
) => KindFix<F, Fix, TK, TKN, SI, SO, Y, X, S, R & R1, E, A>
export function accessMF<F, Fix = any>(
  F: EnvironmentalF<F, Fix>
): <TK, TKN extends string, SI, SO, X, I, S, R, E, R0, A>(
  f: (r: R0) => HKTFix<F, Fix, TK, TKN, SI, SO, X, I, S, R, E, A>
) => HKTFix<F, Fix, TK, TKN, SI, SO, X, I, S, R & R0, E, A>
export function accessMF<F, Fix = any>(
  F: EnvironmentalF<F, Fix>
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
export function provideSomeF<F extends URIS, Fix = any>(
  F: EnvironmentalK<F, Fix>
): <R0, R>(
  f: (r: R0) => R
) => <TK, TKN extends string, SI, SO, X, I, S, E, A>(
  fa: KindFix<F, Fix, TK, TKN, SI, SO, X, I, S, R, E, A>
) => KindFix<F, Fix, TK, TKN, SI, SO, X, I, S, R0, E, A>
export function provideSomeF<F, Fix = any>(
  F: EnvironmentalF<F, Fix>
): <R0, R>(
  f: (r: R0) => R
) => <TK, TKN extends string, SI, SO, X, I, S, E, A>(
  fa: HKTFix<F, Fix, TK, TKN, SI, SO, X, I, S, R, E, A>
) => HKTFix<F, Fix, TK, TKN, SI, SO, X, I, S, R0, E, A>
export function provideSomeF<F>(
  F: EnvironmentalF<F>
): <R0, R>(f: (r: R0) => R) => <E, A>(fa: HKT3<F, R, E, A>) => HKT3<F, R0, E, A> {
  return <R0, R>(f: (r: R0) => R) => <E, A>(fa: HKT3<F, R, E, A>) =>
    accessMF(F)((r: R0) => F.provide(f(r))(fa))
}
