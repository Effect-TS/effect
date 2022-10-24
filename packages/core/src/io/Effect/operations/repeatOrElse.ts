import * as Either from "@fp-ts/data/Either"
import type { Option } from "@fp-ts/data/Option"

/**
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure, at which point, the failure value and
 * schedule output are passed to the specified handler.
 *
 * Scheduled recurrences are in addition to the first execution, so that
 * `io.repeat(Schedule.once)` yields an effect that executes `io`, and then if
 * that succeeds, executes `io` an additional time.
 *
 * @tsplus static effect/core/io/Effect.Aspects repeatOrElse
 * @tsplus pipeable effect/core/io/Effect repeatOrElse
 * @category repetititon
 * @since 1.0.0
 */
export function repeatOrElse<S, R1, A, B, E, R2, E2>(
  schedule: Schedule<S, R1, A, B>,
  orElse: (e: E, option: Option<B>) => Effect<R2, E2, B>
) {
  return <R>(self: Effect<R, E, A>): Effect<R | R1 | R2, E2, B> =>
    Effect.$.repeatOrElseEither(schedule, orElse)(self).map(Either.toUnion)
}
