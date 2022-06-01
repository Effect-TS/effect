/**
 * @tsplus static ets/Channel/Ops toHub
 */
export function toHub<Err, Done, Elem>(
  hub: LazyArg<Hub<Either<Exit<Err, Done>, Elem>>>
): Channel<never, Err, Elem, Done, never, never, unknown> {
  return Channel.toQueue(hub)
}
