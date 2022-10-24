import * as Option from "@fp-ts/data/Option"

/**
 * @tsplus static effect/core/stream/Channel.Ops read
 * @category constructors
 * @since 1.0.0
 */
export function read<In>(): Channel<
  never,
  unknown,
  In,
  unknown,
  Option.Option<never>,
  never,
  In
> {
  return Channel.readOrFail(Option.none)
}
