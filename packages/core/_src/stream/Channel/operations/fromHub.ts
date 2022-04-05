/**
 * @tsplus static ets/Channel/Ops fromHub
 */
export function fromHub<Err, Done, Elem>(
  hub: LazyArg<Hub<Either<Exit<Err, Done>, Elem>>>
): Channel<unknown, unknown, unknown, unknown, Err, Elem, Done> {
  return Channel.scoped(hub().subscribe, (queue) => Channel.fromQueue(queue));
}
