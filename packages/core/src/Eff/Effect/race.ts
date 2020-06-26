import * as E from "../../Either"
import { Both } from "../Cause/cause"
import { foldM_ } from "../Exit/foldM_"
import { join } from "../Fiber/join"

import { checkDescriptor } from "./checkDescriptor"
import { Effect } from "./effect"
import { mapErrorCause_ } from "./mapErrorCause"
import { map_ } from "./map_"
import { raceWith } from "./raceWith"
import { uninterruptibleMask } from "./uninterruptibleMask"

const maybeDisconnect = <S, R, E, A>(effect: Effect<S, R, E, A>) =>
  uninterruptibleMask((i) => i.force(effect))

/**
 * Returns an effect that races this effect with the specified effect,
 * returning the first successful `A` from the faster side. If one effect
 * succeeds, the other will be interrupted. If neither succeeds, then the
 * effect will fail with some error.
 *
 * WARNING: The raced effect will safely interrupt the "loser", but will not
 * resume until the loser has been cleanly terminated. If early return is
 * desired
 *
 * Note that if the `race` is embedded into an uninterruptible region, then
 * because the loser cannot be interrupted, it will be allowed to continue
 * executing in the background, without delaying the return of the race.
 */
export const race_ = <S, R, E, A, S2, R2, E2, A2>(
  self: Effect<S, R, E, A>,
  that: Effect<S2, R2, E2, A2>
): Effect<unknown, R & R2, E | E2, A | A2> =>
  checkDescriptor((d) =>
    raceWith(
      maybeDisconnect(self),
      maybeDisconnect(that),
      (exit, right) =>
        foldM_(
          exit,
          (cause) => mapErrorCause_(join(right), (_) => Both(cause, _)),
          (a) => map_(right.interruptAs(d.id), () => a)
        ),
      (exit, left) =>
        foldM_(
          exit,
          (cause) => mapErrorCause_(join(left), (_) => Both(_, cause)),
          (a) => map_(left.interruptAs(d.id), () => a)
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
 * resume until the loser has been cleanly terminated. If early return is
 * desired
 *
 * Note that if the `race` is embedded into an uninterruptible region, then
 * because the loser cannot be interrupted, it will be allowed to continue
 * executing in the background, without delaying the return of the race.
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
