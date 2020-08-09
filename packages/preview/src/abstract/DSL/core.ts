import { pipe } from "../../system/Function"
import { AnyK, AnyF } from "../Any"
import { CovariantK, CovariantF } from "../Covariant"
import { URIS, HKT8, HKT, Kind } from "../HKT"

/**
 * Model (F: F[_]) => (a: A) => F[A] with default params
 */
export function succeedF<F extends URIS>(
  F: AnyK<F> & CovariantK<F>
): <A, S, SI, SO = SI>(
  a: () => A
) => Kind<F, SI, SO, never, unknown, S, unknown, never, A>
export function succeedF<F>(
  F: AnyF<F> & CovariantF<F>
): <A, S, SI, SO = SI>(
  a: () => A
) => HKT8<F, SI, SO, never, unknown, S, unknown, never, A>
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
export function anyF<F extends URIS>(
  F: AnyK<F> & CovariantK<F>
): <SI, SO, X, In, S, R, E, A>(a: A) => Kind<F, SI, SO, X, In, S, R, E, A>
export function anyF<F>(
  F: AnyF<F> & CovariantF<F>
): <SI, SO, X, In, S, R, E, A>(a: A) => HKT8<F, SI, SO, X, In, S, R, E, A>
export function anyF<F>(F: AnyF<F> & CovariantF<F>): <A>(a: A) => HKT<F, A> {
  return (a) =>
    pipe(
      F.any(),
      F.map(() => a)
    )
}
