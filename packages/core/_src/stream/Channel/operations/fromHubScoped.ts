/**
 * @tsplus static ets/Channel/Ops fromHubManaged
 */
export function fromHubManaged<Err, Done, Elem>(
  hub: Hub<Either<Exit<Err, Done>, Elem>>
): Effect<
  HasScope,
  never,
  Channel<unknown, unknown, unknown, unknown, Err, Elem, Done>
> {
  return hub.subscribe.map((queue) => Channel.fromQueue(queue));
}
