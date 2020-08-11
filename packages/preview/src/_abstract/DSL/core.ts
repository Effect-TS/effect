import { pipe } from "../../_system/Function"
import { AnyF, AnyK, AnyKE } from "../Any"
import { CovariantF, CovariantK, CovariantKE } from "../Covariant"
import { EnvironmentalF, EnvironmentalK, EnvironmentalKE } from "../FX/Environmental"
import { HKT, HKT10, HKT3, Kind, URIS } from "../HKT"
import { MonadF, MonadK, MonadKE } from "../Monad"

/**
 * Model (F: F[_]) => (a: A) => F[A] with default params
 */
export function succeedF<F extends URIS, E>(
  F: AnyKE<F, E> & CovariantKE<F, E>
): <A, S, SI, SO = SI>(
  a: () => A
) => Kind<F, never, never, SI, SO, never, unknown, S, unknown, E, A>
export function succeedF<F extends URIS>(
  F: AnyK<F> & CovariantK<F>
): <A, S, SI, SO = SI>(
  a: () => A
) => Kind<F, never, never, SI, SO, never, unknown, S, unknown, never, A>
export function succeedF<F>(
  F: AnyF<F> & CovariantF<F>
): <A, S, SI, SO = SI>(
  a: () => A
) => HKT10<F, never, never, SI, SO, never, unknown, S, unknown, never, A>
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
export function anyF<F extends URIS, E>(
  F: AnyKE<F, E> & CovariantKE<F, E>
): <A>(a: A) => Kind<F, any, any, any, any, any, any, any, any, any, A>
export function anyF<F extends URIS>(
  F: AnyK<F> & CovariantK<F>
): <A>(a: A) => Kind<F, any, any, any, any, any, any, any, any, any, A>
export function anyF<F>(
  F: AnyF<F> & CovariantF<F>
): <A>(a: A) => HKT10<F, any, any, any, any, any, any, any, any, any, A>
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
export function doF<F extends URIS, E>(
  F: MonadKE<F, E>
): <S, I, O = I>() => Kind<F, never, never, I, O, never, unknown, S, unknown, E, {}>
export function doF<F extends URIS>(
  F: MonadK<F>
): <S, I, O = I>() => Kind<F, never, never, I, O, never, unknown, S, unknown, never, {}>
export function doF<F>(
  F: MonadF<F>
): <S, I, O = I>() => HKT10<
  F,
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
export function bindF<F extends URIS, E>(
  F: MonadKE<F, E>
): <TK, TKN extends string, SO, SO2, X, I, S, R, A, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => Kind<F, TK, TKN, SO, SO2, X, I, S, R, E, A>
) => <SK, SKN extends string, SI, X2, I2, R2, E2>(
  mk: Kind<F, SK, SKN, SI, SO, X2, I2, S, R2, E2, K>
) => Kind<F, TK, TKN, SI, SO2, X | X2, I & I2, S, R & R2, E | E2, K & { [k in N]: A }>
export function bindF<F extends URIS>(
  F: MonadK<F>
): <TK, TKN extends string, SO, SO2, X, I, S, R, E, A, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => Kind<F, TK, TKN, SO, SO2, X, I, S, R, E, A>
) => <SK, SKN extends string, SI, X2, I2, R2, E2>(
  mk: Kind<F, SK, SKN, SI, SO, X2, I2, S, R2, E2, K>
) => Kind<F, TK, TKN, SI, SO2, X | X2, I & I2, S, R & R2, E | E2, K & { [k in N]: A }>
export function bindF<F>(
  F: MonadF<F>
): <TK, TKN extends string, SO, SO2, X, I, S, R, E, A, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => HKT10<F, TK, TKN, SO, SO2, X, I, S, R, E, A>
) => <SK, SKN extends string, SI, X2, I2, R2, E2>(
  mk: HKT10<F, SK, SKN, SI, SO, X2, I2, S, R2, E2, K>
) => HKT10<F, TK, TKN, SI, SO2, X | X2, I & I2, S, R & R2, E | E2, K & { [k in N]: A }>
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
export function chainF<F extends URIS, E>(
  F: MonadKE<F, E>
): <TK, TKN extends string, SO, SO2, X, I, S, R, A, B>(
  f: (_: A) => Kind<F, TK, TKN, SO, SO2, X, I, S, R, E, B>
) => <SK, SKN extends string, SI, X2, I2, R2>(
  mk: Kind<F, SK, SKN, SI, SO, X2, I2, S, R2, E, A>
) => Kind<F, TK, TKN, SI, SO2, X2 | X, I & I2, S, R & R2, E, B>
export function chainF<F extends URIS>(
  F: MonadK<F>
): <TK, TKN extends string, SO, SO2, X, I, S, R, E, A, B>(
  f: (_: A) => Kind<F, TK, TKN, SO, SO2, X, I, S, R, E, B>
) => <SK, SKN extends string, SI, X2, I2, R2, E2>(
  mk: Kind<F, SK, SKN, SI, SO, X2, I2, S, R2, E2, A>
) => Kind<F, TK, TKN, SI, SO2, X2 | X, I & I2, S, R & R2, E2 | E, B>
export function chainF<F>(
  F: MonadF<F>
): <TK, TKN extends string, SO, SO2, X, I, S, R, E, A, B>(
  f: (_: A) => HKT10<F, TK, TKN, SO, SO2, X, I, S, R, E, B>
) => <SK, SKN extends string, SI, X2, I2, R2, E2>(
  mk: HKT10<F, SK, SKN, SI, SO, X2, I2, S, R2, E2, A>
) => HKT10<F, TK, TKN, SI, SO2, X2 | X, I & I2, S, R & R2, E2 | E, B>
export function chainF<F>(F: MonadF<F>) {
  return <A, B>(f: (_: A) => HKT<F, B>) => (mk: HKT<F, A>): HKT<F, B> =>
    pipe(mk, F.map(f), F.flatten)
}

/**
 * Generic accessM
 */
export function accessMF<F extends URIS, E>(
  F: EnvironmentalKE<F, E>
): <TK, TKN extends string, SI, SO, Y, X, S, R, R1, A>(
  f: (r: R) => Kind<F, TK, TKN, SI, SO, Y, X, S, R1, E, A>
) => Kind<F, TK, TKN, SI, SO, Y, X, S, R & R1, E, A>
export function accessMF<F extends URIS>(
  F: EnvironmentalK<F>
): <TK, TKN extends string, SI, SO, Y, X, S, R, R1, E, A>(
  f: (r: R) => Kind<F, TK, TKN, SI, SO, Y, X, S, R1, E, A>
) => Kind<F, TK, TKN, SI, SO, Y, X, S, R & R1, E, A>
export function accessMF<F>(
  F: EnvironmentalF<F>
): <TK, TKN extends string, SI, SO, X, I, S, R, E, R0, A>(
  f: (r: R0) => HKT10<F, TK, TKN, SI, SO, X, I, S, R, E, A>
) => HKT10<F, TK, TKN, SI, SO, X, I, S, R & R0, E, A>
export function accessMF<F>(
  F: EnvironmentalF<F>
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
export function provideSomeF<F extends URIS, E>(
  F: EnvironmentalKE<F, E>
): <R0, R>(
  f: (r: R0) => R
) => <TK, TKN extends string, SI, SO, X, I, S, A>(
  fa: Kind<F, TK, TKN, SI, SO, X, I, S, R, E, A>
) => Kind<F, TK, TKN, SI, SO, X, I, S, R0, E, A>
export function provideSomeF<F extends URIS>(
  F: EnvironmentalK<F>
): <R0, R>(
  f: (r: R0) => R
) => <TK, TKN extends string, SI, SO, X, I, S, E, A>(
  fa: Kind<F, TK, TKN, SI, SO, X, I, S, R, E, A>
) => Kind<F, TK, TKN, SI, SO, X, I, S, R0, E, A>
export function provideSomeF<F>(
  F: EnvironmentalF<F>
): <R0, R>(
  f: (r: R0) => R
) => <TK, TKN extends string, SI, SO, X, I, S, E, A>(
  fa: HKT10<F, TK, TKN, SI, SO, X, I, S, R, E, A>
) => HKT10<F, TK, TKN, SI, SO, X, I, S, R0, E, A>
export function provideSomeF<F>(
  F: EnvironmentalF<F>
): <R0, R>(f: (r: R0) => R) => <E, A>(fa: HKT3<F, R, E, A>) => HKT3<F, R0, E, A> {
  return <R0, R>(f: (r: R0) => R) => <E, A>(fa: HKT3<F, R, E, A>) =>
    accessMF(F)((r: R0) => F.provide(f(r))(fa))
}
