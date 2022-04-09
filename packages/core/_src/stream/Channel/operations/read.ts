/**
 * @tsplus static ets/Channel/Ops read
 */
export function read<In>(): Channel<
  unknown,
  unknown,
  In,
  unknown,
  Option<never>,
  never,
  In
> {
  return Channel.readOrFail(Option.none);
}
