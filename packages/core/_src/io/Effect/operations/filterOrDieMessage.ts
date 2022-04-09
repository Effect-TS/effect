/**
 * Dies with a `RuntimeException` having the specified text message if the
 * predicate fails.
 *
 * @tsplus fluent ets/Effect filterOrDieMessage
 */
export function filterOrDieMessage_<R, E, A, B extends A>(
  self: Effect<R, E, A>,
  f: Refinement<A, B>,
  message: LazyArg<string>,
  __tsplusTrace?: string
): Effect<R, E, A>;
export function filterOrDieMessage_<R, E, A>(
  self: Effect<R, E, A>,
  f: Predicate<A>,
  message: LazyArg<string>,
  __tsplusTrace?: string
): Effect<R, E, A>;
export function filterOrDieMessage_<R, E, A>(
  self: Effect<R, E, A>,
  f: Predicate<A>,
  message: LazyArg<string>,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return self.filterOrElse(f, Effect.dieMessage(message));
}

/**
 * Dies with specified defect if the predicate fails.
 *
 * @tsplus static ets/Effect/Aspects filterOrDieMessage
 */
export function filterOrDieMessage<A, B extends A>(
  f: Refinement<A, B>,
  message: LazyArg<string>,
  __tsplusTrace?: string
): <R, E>(self: Effect<R, E, A>) => Effect<R, E, A>;
export function filterOrDieMessage<A>(
  f: Predicate<A>,
  message: LazyArg<string>,
  __tsplusTrace?: string
): <R, E>(self: Effect<R, E, A>) => Effect<R, E, A>;
export function filterOrDieMessage<A>(
  f: Predicate<A>,
  message: LazyArg<string>,
  __tsplusTrace?: string
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R, E, A> => self.filterOrDieMessage(f, message);
}
