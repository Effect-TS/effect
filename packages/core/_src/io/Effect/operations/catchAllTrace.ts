/**
 * A version of `catchAll` that gives you the (optional) trace of the error.
 *
 * @tsplus fluent ets/Effect catchAllTrace
 */
export function catchAllTrace_<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  h: (tuple: Tuple<[E, Trace]>) => Effect<R2, E2, A2>,
  __tsplusTrace?: string
): Effect<R & R2, E2, A | A2> {
  return self.foldTraceEffect(h, Effect.succeedNow)
}

/**
 * A version of `catchAll` that gives you the (optional) trace of the error.
 *
 * @tsplus static ets/Effect/Aspects catchAllTrace
 */
export const catchAllTrace = Pipeable(catchAllTrace_)
