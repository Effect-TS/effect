/**
 * Dies with specified defect if the predicate fails.
 *
 * @tsplus static effect/core/io/Effect.Aspects filterOrDieMessage
 * @tsplus pipeable effect/core/io/Effect filterOrDieMessage
 */
export function filterOrDieMessage<A, B extends A>(
  f: Refinement<A, B>,
  message: LazyArg<string>,
  __tsplusTrace?: string
): <R, E>(self: Effect<R, E, A>) => Effect<R, E, A>
export function filterOrDieMessage<A>(
  f: Predicate<A>,
  message: LazyArg<string>,
  __tsplusTrace?: string
): <R, E>(self: Effect<R, E, A>) => Effect<R, E, A>
export function filterOrDieMessage<A>(
  f: Predicate<A>,
  message: LazyArg<string>,
  __tsplusTrace?: string
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R, E, A> => Effect.$.filterOrElse(f, Effect.dieMessage(message))(self)
}
