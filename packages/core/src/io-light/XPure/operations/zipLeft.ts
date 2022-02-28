import type { LazyArg } from "../../../data/Function"
import type { XPure } from "../definition"

/**
 * A variant of `flatMap` that ignores the value produced by that computation.
 *
 * @tsplus operator ets/XPure <
 * @tsplus fluent ets/XPure zipLeft
 */
export function zipLeft_<W, W1, S1, S2, R, E, A, S3, R1, E1, B>(
  self: XPure<W, S1, S2, R, E, A>,
  that: LazyArg<XPure<W1, S2, S3, R1, E1, B>>
): XPure<W | W1, S1, S3, R & R1, E | E1, A> {
  return self.flatMap((a) => that().as(a))
}

/**
 * A variant of `flatMap` that ignores the value produced by that computation.
 *
 * @ets_data_first zipLeft_
 */
export function zipLeft<W, S2, S3, R1, E1, B>(
  that: LazyArg<XPure<W, S2, S3, R1, E1, B>>
) {
  return <W1, S1, R, E, A>(
    self: XPure<W1, S1, S2, R, E, A>
  ): XPure<W | W1, S1, S3, R & R1, E | E1, A> => self.zipLeft(that)
}
