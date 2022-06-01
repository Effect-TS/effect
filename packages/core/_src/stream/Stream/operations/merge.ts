import { TerminationStrategy } from "@effect/core/stream/Stream/TerminationStrategy"

/**
 * Merges this stream and the specified stream together.
 *
 * New produced stream will terminate when both specified stream terminate if
 * no termination strategy is specified.
 *
 * @tsplus fluent ets/Stream merge
 */
export function merge_<R, E, A, R2, E2, A2>(
  self: Stream<R, E, A>,
  that: LazyArg<Stream<R2, E2, A2>>,
  strategy: LazyArg<TerminationStrategy> = () => TerminationStrategy.Both,
  __tsplusTrace?: string
): Stream<R | R2, E | E2, A | A2> {
  return self.mergeWith(
    that,
    (a): A | A2 => a,
    (a): A | A2 => a,
    strategy
  )
}

/**
 * Merges this stream and the specified stream together.
 *
 * New produced stream will terminate when both specified stream terminate if
 * no termination strategy is specified.
 *
 * @tsplus static ets/Stream/Aspects merge
 */
export const merge = Pipeable(merge_)
