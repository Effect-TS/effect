import { pipe } from "../../../../Function"
import { CovariantK, CovariantF } from "../Covariant"
import { HKT, HKT6, Kind, URIS } from "../HKT"
import { IdentityFlattenK, IdentityFlattenF } from "../IdentityFlatten"

export type MonadF<F> = IdentityFlattenF<F> & CovariantF<F>

export type MonadK<F extends URIS> = IdentityFlattenK<F> & CovariantK<F>

export function makeMonad<URI extends URIS>(
  _: URI
): (_: Omit<MonadK<URI>, "URI">) => MonadK<URI>
export function makeMonad<URI>(URI: URI): (_: Omit<MonadF<URI>, "URI">) => MonadF<URI> {
  return (_) => ({
    URI,
    ..._
  })
}

export function doF<F extends URIS>(
  F: MonadK<F>
): <In, S = In>() => Kind<F, never, In, S, unknown, never, {}>
export function doF<F>(
  F: MonadF<F>
): <In, S = In>() => HKT6<F, never, In, S, unknown, never, {}>
export function doF<F>(F: MonadF<F>): () => HKT<F, {}> {
  return () =>
    pipe(
      F.any(),
      F.map(() => ({}))
    )
}

export function bindF<F extends URIS>(
  F: MonadK<F>
): <X, I, S, R, E, A, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => Kind<F, X, I, S, R, E, A>
) => <X2, I2, R2, E2>(
  mk: Kind<F, X2, I2, S, R2, E2, K>
) => Kind<F, X | X2, I & I2, S, R & R2, E | E2, K & { [k in N]: A }>
export function bindF<F>(
  F: MonadF<F>
): <X, I, S, R, E, A, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => HKT6<F, X, I, S, R, E, A>
) => <X2, I2, R2, E2>(
  mk: HKT6<F, X2, I2, S, R2, E2, K>
) => HKT6<F, X | X2, I & I2, S, R & R2, E | E2, K & { [k in N]: A }>
export function bindF<F>(F: MonadF<F>) {
  return <X, I, S, R, E, A, K, N extends string>(
    tag: Exclude<N, keyof K>,
    f: (_: K) => HKT6<F, X, I, S, R, E, A>
  ) => <X2, I2, R2, E2>(
    mk: HKT6<F, X2, I2, S, R2, E2, K>
  ): HKT6<F, X | X2, I & I2, S, R & R2, E | E2, K & { [k in N]: A }> =>
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

export function chainF<F extends URIS>(
  F: MonadK<F>
): <X, I, S, R, E, A, B>(
  f: (_: A) => HKT6<F, X, I, S, R, E, B>
) => <X2, I2, R2, E2>(
  mk: Kind<F, X2, I2, S, R2, E2, A>
) => Kind<F, X2 | X, I & I2, S, R & R2, E2 | E, B>
export function chainF<F>(
  F: MonadF<F>
): <X, I, S, R, E, A, B>(
  f: (_: A) => HKT6<F, X, I, S, R, E, B>
) => <X2, I2, R2, E2>(
  mk: HKT6<F, X2, I2, S, R2, E2, A>
) => HKT6<F, X2 | X, I & I2, S, R & R2, E2 | E, B>
export function chainF<F>(F: MonadF<F>) {
  return <X, I, S, R, E, A, B>(f: (_: A) => HKT6<F, X, I, S, R, E, B>) => <
    X2,
    I2,
    R2,
    E2
  >(
    mk: HKT6<F, X2, I2, S, R2, E2, A>
  ): HKT6<F, X | X2, I & I2, S, R & R2, E | E2, B> => pipe(mk, F.map(f), F.flatten)
}
