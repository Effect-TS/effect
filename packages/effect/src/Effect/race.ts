import * as Cause from "../Cause/core"
import * as E from "../Either"
import * as Exit from "../Exit/api"
import * as Fiber from "../Fiber/api"
import { pipe } from "../Function"
import { chain, chain_, checkDescriptor, halt, raceWith, succeed } from "./core"
import { done } from "./done"
import type { Effect, IO } from "./effect"
import { map_ } from "./map_"
import { mapErrorCause_ } from "./mapErrorCause"
import { result } from "./result"

function mergeInterruption<A, E2, A2>(a: A): (a: Exit.Exit<E2, A2>) => IO<E2, A> {
  return (x) => {
    switch (x._tag) {
      case "Success": {
        return succeed(a)
      }
      case "Failure": {
        return Cause.interruptedOnly(x.cause) ? succeed(a) : halt(x.cause)
      }
    }
  }
}

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
  that: Effect<R2, E2, A2>
): Effect<R & R2, E | E2, A | A2> {
  return checkDescriptor((d) =>
    raceWith(
      self,
      that,
      (exit, right) =>
        Exit.foldM_(
          exit,
          (cause) => mapErrorCause_(Fiber.join(right), (_) => Cause.Both(cause, _)),
          (a) => chain_(right.interruptAs(d.id), mergeInterruption(a))
        ),
      (exit, left) =>
        Exit.foldM_(
          exit,
          (cause) => mapErrorCause_(Fiber.join(left), (_) => Cause.Both(_, cause)),
          (a) => chain_(left.interruptAs(d.id), mergeInterruption(a))
        )
    )
  )
}

/**
 * Returns an effect that races this effect with the specified effect,
 * returning the first successful `A` from the faster side. If one effect
 * succeeds, the other will be interrupted. If neither succeeds, then the
 * effect will fail with some error.
 *
 * WARNING: The raced effect will safely interrupt the "loser", but will not
 * resume until the loser has been cleanly terminated.
 */
export function race<R2, E2, A2>(that: Effect<R2, E2, A2>) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R & R2, E | E2, A | A2> =>
    race_(self, that)
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
  that: Effect<R2, E2, A2>
): Effect<R & R2, E | E2, E.Either<A, A2>> {
  return race_(map_(self, E.left), map_(that, E.right))
}

/**
 * Returns an effect that races this effect with the specified effect,
 * yielding the first result to succeed. If neither effect succeeds, then the
 * composed effect will fail with some error.
 *
 * WARNING: The raced effect will safely interrupt the "loser", but will not
 * resume until the loser has been cleanly terminated.
 */
export function raceEither<R2, E2, A2>(that: Effect<R2, E2, A2>) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R & R2, E | E2, E.Either<A, A2>> =>
    raceEither_(self, that)
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
export function raceFirst<R2, E2, A2>(that: Effect<R2, E2, A2>) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R & R2, E2 | E, A2 | A> =>
    pipe(
      race_(result(self), result(that)),
      chain((a) => done(a as Exit.Exit<E | E2, A | A2>))
    )
}
