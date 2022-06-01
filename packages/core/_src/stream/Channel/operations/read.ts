/**
 * @tsplus static ets/Channel/Ops read
 */
export function read<In>(): Channel<
  never,
  unknown,
  In,
  unknown,
  Option<never>,
  never,
  In
> {
  return Channel.readOrFail(Option.none)
}
