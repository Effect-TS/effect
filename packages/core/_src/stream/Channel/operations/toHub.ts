/**
 * @tsplus getter effect/core/stream/Channel toHub
 * @tsplus static effect/core/stream/Channel.Ops toHub
 */
export function toHub<Err, Done, Elem>(
  hub: LazyArg<Hub<Either<Exit<Err, Done>, Elem>>>
): Channel<never, Err, Elem, Done, never, never, unknown> {
  return Channel.toQueue(hub)
}
