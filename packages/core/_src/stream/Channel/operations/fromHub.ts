/**
 * @tsplus static effect/core/stream/Channel.Ops fromHub
 */
export function fromHub<Err, Done, Elem>(
  hub: LazyArg<Hub<Either<Exit<Err, Done>, Elem>>>
): Channel<never, unknown, unknown, unknown, Err, Elem, Done> {
  return Channel.unwrapScoped(hub().subscribe.map((queue) => Channel.fromQueue(queue)))
}
