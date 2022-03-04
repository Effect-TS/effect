import { STM } from "../definition"

/**
 * Keeps none of the errors, and terminates the fiber running the `STM` effect
 * with them, using the specified function to convert the `E` into a
 * `unknown` defect.
 *
 * @tsplus fluent ets/STM orDieWith
 */
export function orDieWith_<R, E, A>(
  self: STM<R, E, A>,
  f: (e: E) => unknown
): STM<R, never, A> {
  return self.mapError(f).catchAll((e) => STM.die(e))
}

/**
 * Keeps none of the errors, and terminates the fiber running the `STM` effect
 * with them, using the specified function to convert the `E` into a
 * `unknown` defect.
 *
 * @ets_data_first orDieWith_
 */
export function orDieWith<E>(f: (e: E) => unknown) {
  return <R, A>(self: STM<R, E, A>): STM<R, never, A> => self.orDieWith(f)
}
