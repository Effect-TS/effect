/**
 * @tsplus static ets/Channel/Ops fromEither
 */
export function fromEither<E, A>(
  either: LazyArg<Either<E, A>>
): Channel<unknown, unknown, unknown, unknown, E, never, A> {
  return Channel.suspend(either().fold(Channel.failNow, Channel.succeedNow));
}
