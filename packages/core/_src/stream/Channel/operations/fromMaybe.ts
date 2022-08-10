/**
 * @tsplus static effect/core/stream/Channel.Ops fromMaybe
 */
export function fromMaybe<A>(
  option: Maybe<A>
): Channel<never, unknown, unknown, unknown, Maybe<never>, never, A> {
  return Channel.suspend(option.fold(Channel.failSync(Maybe.none), Channel.succeed))
}
