import { MergeDecision } from "@effect-ts/core/stream/Channel/MergeDecision";
import { concreteStream, StreamInternal } from "@effect-ts/core/stream/Stream/operations/_internal/StreamInternal";
import { TerminationStrategy } from "@effect-ts/core/stream/Stream/TerminationStrategy";

/**
 * Merges this stream and the specified stream together to a common element
 * type with the specified mapping functions.
 *
 * New produced stream will terminate when both specified stream terminate if
 * no termination strategy is specified.
 *
 * @tsplus fluent ets/Stream mergeWith
 */
export function mergeWith_<R, E, A, R2, E2, A2, A3>(
  self: Stream<R, E, A>,
  that: LazyArg<Stream<R2, E2, A2>>,
  left: (a: A) => A3,
  right: (a2: A2) => A3,
  strategy: LazyArg<TerminationStrategy> = () => TerminationStrategy.Both,
  __tsplusTrace?: string
): Stream<R & R2, E | E2, A3> {
  return new StreamInternal(
    Channel.succeed(strategy).flatMap((strategy) => {
      const leftStream = self.map(left);
      const rightStream = that().map(right);
      concreteStream(leftStream);
      concreteStream(rightStream);
      return leftStream.channel.mergeWith(
        rightStream.channel,
        handler<R & R2, E | E2>(strategy._tag === "Either" || strategy._tag === "Left"),
        handler<R & R2, E | E2>(strategy._tag === "Either" || strategy._tag === "Right")
      );
    })
  );
}

/**
 * Merges this stream and the specified stream together to a common element
 * type with the specified mapping functions.
 *
 * New produced stream will terminate when both specified stream terminate if
 * no termination strategy is specified.
 *
 * @tsplus static ets/Stream/Aspects mergeWith
 */
export const mergeWith = Pipeable(mergeWith_);

function handler<R, E>(terminate: boolean) {
  return (
    exit: Exit<E, unknown>,
    __tsplusTrace?: string
  ): MergeDecision<R, E, unknown, E, unknown> =>
    terminate || !exit.isSuccess()
      ? MergeDecision.done(Effect.done(exit))
      : MergeDecision.await((exit) => Effect.done(exit));
}
