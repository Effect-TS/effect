// ets_tracing: off

import * as Cause from "../../Cause/definition"
import * as E from "../../Either"
import type { Exit } from "../../Exit"
import * as Ex from "../../Exit/operations/foldEffect"
import { join } from "../../Fiber/operations/join"
import { pipe } from "../../Function"
import type { Effect } from "../definition"
import { as_ } from "./as"
import { chain } from "./chain"
import { descriptorWith } from "./descriptorWith"
import { done } from "./done"
import { exit } from "./exit"
import { uninterruptibleMask } from "./interruption"
import { map_ } from "./map"
import { mapErrorCause_ } from "./mapErrorCause"
import { raceWith_ } from "./raceWith"

/**
 * Returns an effect that races this effect with the specified effect,
 * returning the first successful `A` from the faster side. If one effect
 * succeeds, the other will be interrupted. If neither succeeds, then the
 * effect will fail with some error.
 *
 * WARNING: The raced effect will safely interrupt the "loser", but will not
 * resume until the loser has been cleanly terminated. If early return is
 * desired
 */
export function race_<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  that: Effect<R2, E2, A2>,
  __trace?: string
): Effect<R & R2, E | E2, A | A2> {
  return descriptorWith((descriptor) => {
    const parentFiberId = descriptor.id
    const maybeDisconnect = <R, E, A>(io: Effect<R, E, A>) =>
      uninterruptibleMask((interruptible) => interruptible.force(io))

    return raceWith_(
      maybeDisconnect(self),
      maybeDisconnect(that),
      (exit, right) =>
        Ex.foldEffect_(
          exit,
          (cause) => mapErrorCause_(join(right), (_) => Cause.both(cause, _)),
          (a) => as_(right.interruptAs(parentFiberId), a)
        ),
      (exit, left) =>
        Ex.foldEffect_(
          exit,
          (cause) => mapErrorCause_(join(left), (_) => Cause.both(_, cause)),
          (a) => as_(left.interruptAs(parentFiberId), a)
        ),
      __trace
    )
  })
}

/**
 * Returns an effect that races this effect with the specified effect,
 * returning the first successful `A` from the faster side. If one effect
 * succeeds, the other will be interrupted. If neither succeeds, then the
 * effect will fail with some error.
 *
 * WARNING: The raced effect will safely interrupt the "loser", but will not
 * resume until the loser has been cleanly terminated.
 *
 * @ets_data_first race_
 */
export function race<R2, E2, A2>(that: Effect<R2, E2, A2>, __trace?: string) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R & R2, E | E2, A | A2> =>
    race_(self, that, __trace)
}

/**
 * Returns an effect that races this effect with the specified effect,
 * yielding the first result to succeed. If neither effect succeeds, then the
 * composed effect will fail with some error.
 *
 * WARNING: The raced effect will safely interrupt the "loser", but will not
 * resume until the loser has been cleanly terminated.
 */
export function raceEither_<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  that: Effect<R2, E2, A2>,
  __trace?: string
): Effect<R & R2, E | E2, E.Either<A, A2>> {
  return race_(map_(self, E.left), map_(that, E.right), __trace)
}

/**
 * Returns an effect that races this effect with the specified effect,
 * yielding the first result to succeed. If neither effect succeeds, then the
 * composed effect will fail with some error.
 *
 * WARNING: The raced effect will safely interrupt the "loser", but will not
 * resume until the loser has been cleanly terminated.
 *
 * @ets_data_first raceEither_
 */
export function raceEither<R2, E2, A2>(that: Effect<R2, E2, A2>, __trace?: string) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R & R2, E | E2, E.Either<A, A2>> =>
    raceEither_(self, that, __trace)
}

/**
 * Returns an effect that races this effect with the specified effect,
 * yielding the first result to complete, whether by success or failure. If
 * neither effect completes, then the composed effect will not complete.
 *
 * WARNING: The raced effect will safely interrupt the "loser", but will not
 * resume until the loser has been cleanly terminated. If early return is
 * desired, then instead of performing `l raceFirst r`, perform
 * `l.disconnect raceFirst r.disconnect`, which disconnects left and right
 * interrupt signal, allowing a fast return, with interruption performed
 * in the background.
 */
export function raceFirst_<R, R2, E, E2, A, A2>(
  self: Effect<R, E, A>,
  that: Effect<R2, E2, A2>,
  __trace?: string
): Effect<R & R2, E2 | E, A2 | A> {
  return pipe(
    race_(exit(self), exit(that), __trace),
    chain((a) => done(a as Exit<E | E2, A | A2>))
  )
}

/**
 * Returns an effect that races this effect with the specified effect,
 * yielding the first result to complete, whether by success or failure. If
 * neither effect completes, then the composed effect will not complete.
 *
 * WARNING: The raced effect will safely interrupt the "loser", but will not
 * resume until the loser has been cleanly terminated. If early return is
 * desired, then instead of performing `l raceFirst r`, perform
 * `l.disconnect raceFirst r.disconnect`, which disconnects left and right
 * interrupt signal, allowing a fast return, with interruption performed
 * in the background.
 *
 * @ets_data_first raceFirst_
 */
export function raceFirst<R2, E2, A2>(that: Effect<R2, E2, A2>, __trace?: string) {
  return <R, E, A>(self: Effect<R, E, A>) => raceFirst_(self, that, __trace)
}
