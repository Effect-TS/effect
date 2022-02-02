// ets_tracing: off

import * as E from "../../Either/index.js"
import type { Stream } from "./definitions.js"
import type { TerminationStrategy } from "./mergeWith.js"
import { mergeWith_ } from "./mergeWith.js"

/**
 * Merges this stream and the specified stream together.
 *
 * New produced stream will terminate when both specified stream terminate if no termination
 * strategy is specified.
 */
export function merge_<R, E, A, R1, E1, B>(
  self: Stream<R, E, A>,
  that: Stream<R1, E1, B>,
  strategy: TerminationStrategy = "Both"
): Stream<R1 & R, E | E1, A | B> {
  return mergeWith_(
    self,
    that,
    (a: A): A | B => a,
    (b) => b,
    strategy
  )
}

/**
 * Merges this stream and the specified stream together.
 *
 * New produced stream will terminate when both specified stream terminate if no termination
 * strategy is specified.
 *
 * @ets_data_first merge_
 */
export function merge<R1, E1, B>(
  that: Stream<R1, E1, B>,
  strategy: TerminationStrategy = "Both"
) {
  return <R, E, A>(self: Stream<R, E, A>) => merge_(self, that, strategy)
}

/**
 * Merges this stream and the specified stream together. New produced stream will
 * terminate when either stream terminates.
 */
export function mergeTerminateEither_<R, E, A, R1, E1, B>(
  self: Stream<R, E, A>,
  that: Stream<R1, E1, B>
): Stream<R1 & R, E | E1, A | B> {
  return merge_(self, that, "Either")
}

/**
 * Merges this stream and the specified stream together. New produced stream will
 * terminate when either stream terminates.
 */
export function mergeTerminateEither<R1, E1, B>(that: Stream<R1, E1, B>) {
  return <R, E, A>(self: Stream<R, E, A>) => merge_(self, that, "Either")
}

/**
 * Merges this stream and the specified stream together. New produced stream will
 * terminate when this stream terminates.
 */
export function mergeTerminateLeft_<R, E, A, R1, E1, B>(
  self: Stream<R, E, A>,
  that: Stream<R1, E1, B>
): Stream<R1 & R, E | E1, A | B> {
  return merge_(self, that, "Left")
}

/**
 * Merges this stream and the specified stream together. New produced stream will
 * terminate when this stream terminates.
 */
export function mergeTerminateLeft<R1, E1, B>(that: Stream<R1, E1, B>) {
  return <R, E, A>(self: Stream<R, E, A>) => merge_(self, that, "Left")
}

/**
 * Merges this stream and the specified stream together. New produced stream will
 * terminate when the specified stream terminates.
 */
export function mergeTerminateRight_<R, E, A, R1, E1, B>(
  self: Stream<R, E, A>,
  that: Stream<R1, E1, B>
): Stream<R1 & R, E | E1, A | B> {
  return merge_(self, that, "Right")
}

/**
 * Merges this stream and the specified stream together. New produced stream will
 * terminate when the specified stream terminates.
 */
export function mergeTerminateRight<R1, E1, B>(that: Stream<R1, E1, B>) {
  return <R, E, A>(self: Stream<R, E, A>) => merge_(self, that, "Right")
}

/**
 * Merges this stream and the specified stream together to produce a stream of
 * eithers.
 */
export function mergeEither_<R, E, A, R1, E1, B>(
  self: Stream<R, E, A>,
  that: Stream<R1, E1, B>,
  strategy: TerminationStrategy = "Both"
): Stream<R & R1, E | E1, E.Either<A, B>> {
  return mergeWith_(self, that, (l: A) => E.left(l), E.right, strategy)
}

/**
 * Merges this stream and the specified stream together to produce a stream of
 * eithers.
 *
 * @ets_data_first mergeEither_
 */
export function mergeEither<R1, E1, B>(
  that: Stream<R1, E1, B>,
  strategy: TerminationStrategy = "Both"
) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R & R1, E | E1, E.Either<A, B>> =>
    mergeEither_(self, that, strategy)
}
