import * as E from "../../Either"
import { Both } from "../Cause/cause"
import { interruptedOnly } from "../Cause/interruptedOnly"
import { Exit } from "../Exit/exit"
import { foldM_ } from "../Exit/foldM_"
import { join } from "../Fiber/join"

import { chain_ } from "./chain_"
import { checkDescriptor } from "./checkDescriptor"
import { Effect } from "./effect"
import { halt } from "./halt"
import { mapErrorCause_ } from "./mapErrorCause"
import { map_ } from "./map_"
import { raceWith } from "./raceWith"
import { succeedNow } from "./succeedNow"

function mergeInterruption<A, E2, A2>(
  a: A
): (a: Exit<E2, A2>) => Effect<never, unknown, E2, A> {
  return (x) => {
    switch (x._tag) {
      case "Success": {
        return succeedNow(a)
      }
      case "Failure": {
        return interruptedOnly(x.cause) ? succeedNow(a) : halt(x.cause)
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
export const race_ = <S, R, E, A, S2, R2, E2, A2>(
  self: Effect<S, R, E, A>,
  that: Effect<S2, R2, E2, A2>
): Effect<unknown, R & R2, E | E2, A | A2> =>
  checkDescriptor((d) =>
    raceWith(
      self,
      that,
      (exit, right) =>
        foldM_(
          exit,
          (cause) => mapErrorCause_(join(right), (_) => Both(cause, _)),
          (a) => chain_(right.interruptAs(d.id), mergeInterruption(a))
        ),
      (exit, left) =>
        foldM_(
          exit,
          (cause) => mapErrorCause_(join(left), (_) => Both(_, cause)),
          (a) => chain_(left.interruptAs(d.id), mergeInterruption(a))
        )
    )
  )

/**
 * Returns an effect that races this effect with the specified effect,
 * returning the first successful `A` from the faster side. If one effect
 * succeeds, the other will be interrupted. If neither succeeds, then the
 * effect will fail with some error.
 *
 * WARNING: The raced effect will safely interrupt the "loser", but will not
 * resume until the loser has been cleanly terminated.
 */
export const race = <S2, R2, E2, A2>(that: Effect<S2, R2, E2, A2>) => <S, R, E, A>(
  self: Effect<S, R, E, A>
): Effect<unknown, R & R2, E | E2, A | A2> => race_(self, that)

/**
 * Returns an effect that races this effect with the specified effect,
 * yielding the first result to succeed. If neither effect succeeds, then the
 * composed effect will fail with some error.
 *
 * WARNING: The raced effect will safely interrupt the "loser", but will not
 * resume until the loser has been cleanly terminated.
 */
export const raceEither_ = <S, R, E, A, S2, R2, E2, A2>(
  self: Effect<S, R, E, A>,
  that: Effect<S2, R2, E2, A2>
): Effect<unknown, R & R2, E | E2, E.Either<A, A2>> =>
  race_(map_(self, E.left), map_(that, E.right))

/**
 * Returns an effect that races this effect with the specified effect,
 * yielding the first result to succeed. If neither effect succeeds, then the
 * composed effect will fail with some error.
 *
 * WARNING: The raced effect will safely interrupt the "loser", but will not
 * resume until the loser has been cleanly terminated.
 */
export const raceEither = <S2, R2, E2, A2>(that: Effect<S2, R2, E2, A2>) => <
  S,
  R,
  E,
  A
>(
  self: Effect<S, R, E, A>
): Effect<unknown, R & R2, E | E2, E.Either<A, A2>> => raceEither_(self, that)
