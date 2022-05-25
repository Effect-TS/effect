/**
 * Completes the deferred with the specified value.
 *
 * @tsplus fluent ets/Deferred succeed
 */
export function succeed_<E, A>(
  self: Deferred<E, A>,
  value: LazyArg<A>,
  __tsplusTrace?: string
): Effect.UIO<boolean> {
  return self.completeWith(Effect.succeed(value))
}

/**
 * Completes the deferred with the specified value.
 *
 * @tsplus static ets/Deferred/Aspects succeed
 */
export const succeed = Pipeable(succeed_)
