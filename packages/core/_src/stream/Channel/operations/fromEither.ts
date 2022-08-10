/**
 * @tsplus static effect/core/stream/Channel.Ops fromEither
 */
export function fromEither<E, A>(
  either: Either<E, A>
): Channel<never, unknown, unknown, unknown, E, never, A> {
  return Channel.suspend(either.fold(Channel.fail, Channel.succeed))
}
