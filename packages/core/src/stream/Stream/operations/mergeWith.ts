import type { LazyArg } from "../../../data/Function"
import { Effect } from "../../../io/Effect"
import type { Exit } from "../../../io/Exit"
import { Channel } from "../../Channel"
import { MergeDecision } from "../../Channel/MergeDecision"
import type { Stream } from "../definition"
import { TerminationStrategy } from "../TerminationStrategy"
import { concreteStream, StreamInternal } from "./_internal/StreamInternal"

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
      const leftStream = self.map(left)
      const rightStream = that().map(right)
      concreteStream(leftStream)
      concreteStream(rightStream)
      return leftStream.channel.mergeWith(
        rightStream.channel,
        handler<R & R2, E | E2>(strategy._tag === "Either" || strategy._tag === "Left"),
        handler<R & R2, E | E2>(strategy._tag === "Either" || strategy._tag === "Right")
      )
    })
  )
}

/**
 * Merges this stream and the specified stream together to a common element
 * type with the specified mapping functions.
 *
 * New produced stream will terminate when both specified stream terminate if
 * no termination strategy is specified.
 */
export const mergeWith = Pipeable(mergeWith_)

function handler<R, E>(terminate: boolean) {
  return (
    exit: Exit<E, unknown>,
    __tsplusTrace?: string
  ): MergeDecision<R, E, unknown, E, unknown> =>
    terminate || !exit.isSuccess()
      ? MergeDecision.done(Effect.done(exit))
      : MergeDecision.await((exit) => Effect.done(exit))
}
