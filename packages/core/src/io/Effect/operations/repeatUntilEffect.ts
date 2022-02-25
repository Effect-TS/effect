import { Effect } from "../definition"

/**
 * Repeats this effect until its value satisfies the specified effectful
 * predicate or until the first failure.
 *
 * @tsplus fluent ets/Effect repeatUntilEffect
 */
export function repeatUntilEffect_<R, E, A, R1>(
  self: Effect<R, E, A>,
  f: (a: A) => Effect<R1, never, boolean>,
  __tsplusTrace?: string
): Effect<R & R1, E, A> {
  return self.flatMap((a) =>
    f(a).flatMap((b) =>
      b ? Effect.succeedNow(a) : Effect.yieldNow.zipRight(repeatUntilEffect_(self, f))
    )
  )
}

/**
 * Repeats this effect until its value satisfies the specified effectful
 * predicate or until the first failure.
 *
 * @ets_data_first repeatUntilEffect_
 */
export function repeatUntilEffect<A, R1>(
  f: (a: A) => Effect<R1, never, boolean>,
  __tsplusTrace?: string
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R & R1, E, A> =>
    self.repeatUntilEffect(f)
}
