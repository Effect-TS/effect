/**
 * @tsplus static ets/Channel/Ops read
 */
export function read<In>(): Channel<
  never,
  unknown,
  In,
  unknown,
  Maybe<never>,
  never,
  In
> {
  return Channel.readOrFail(Maybe.none)
}
