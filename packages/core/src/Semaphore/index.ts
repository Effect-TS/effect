/* adapted from https://github.com/rzeigler/waveguide */

import { Deferred, makeDeferred } from "../Deferred"
import * as T from "../Effect"
import * as E from "../Either"
import * as F from "../Function"
import { pipe } from "../Function"
import * as O from "../Option"
import { makeRef, Ref } from "../Ref"
import { Dequeue, empty } from "../Support/Dequeue"
import { Ticket, makeTicket, ticketExit, ticketUse } from "../Ticket"

export const isReservationFor = (latch: Deferred<unknown, unknown, never, void>) => (
  rsv: readonly [number, Deferred<unknown, unknown, never, void>]
): boolean => rsv[1] === latch

/**
 * Allocate a semaphore.
 *
 * @param n the number of permits
 * This must be non-negative
 */
export function makeSemaphore(n: number): T.Sync<Semaphore> {
  return T.applySecond(
    sanityCheck(n),
    T.map_(makeRef(E.right(n) as State), makeSemaphoreImpl)
  )
}

export function makeSemaphoreImpl(ref: Ref<State>): Semaphore {
  const releaseN = <E = never>(n: number): T.AsyncE<E, void> =>
    T.applySecond(
      sanityCheck(n),
      T.uninterruptible(
        n === 0
          ? T.unit
          : T.flatten(
              ref.modify((current) =>
                pipe(
                  current,
                  E.fold(
                    (waiting) =>
                      pipe(
                        waiting.take(),
                        O.fold(
                          () => [T.unit, E.right(n) as State] as const,
                          ([[needed, latch], q]) =>
                            n >= needed
                              ? ([
                                  T.applyFirst(
                                    latch.done(undefined),
                                    n > needed ? releaseN(n - needed) : T.unit
                                  ),
                                  E.left(q) as State
                                ] as const)
                              : ([
                                  T.unit,
                                  E.left(q.push([needed - n, latch] as const)) as State
                                ] as const)
                        )
                      ),
                    (ready) => [T.unit, E.right(ready + n) as State] as const
                  )
                )
              )
            )
      )
    )

  const cancelWait = (
    n: number,
    latch: Deferred<unknown, unknown, never, void>
  ): T.Async<void> =>
    T.uninterruptible(
      T.flatten(
        ref.modify((current) =>
          pipe(
            current,
            E.fold(
              (waiting) =>
                pipe(
                  waiting.find(isReservationFor(latch)),
                  O.fold(
                    () => [releaseN(n), E.left(waiting) as State] as const,
                    ([pending]) =>
                      [
                        releaseN(n - pending),
                        E.left(waiting.filter(F.not(isReservationFor(latch)))) as State
                      ] as const
                  )
                ),
              (ready) => [T.unit, E.right(ready + n) as State] as const
            )
          )
        )
      )
    )

  const ticketN = (n: number): T.Async<Ticket<unknown, unknown, void>> =>
    T.chain_(makeDeferred<unknown, unknown, never, void>(), (latch) =>
      ref.modify((current) =>
        pipe(
          current,
          E.fold(
            (waiting) =>
              [
                makeTicket(latch.wait, cancelWait(n, latch)),
                E.left(waiting.offer([n, latch] as const)) as State
              ] as const,
            (ready) =>
              ready >= n
                ? ([
                    makeTicket(T.unit, releaseN(n)),
                    E.right(ready - n) as State
                  ] as const)
                : ([
                    makeTicket(latch.wait, cancelWait(n, latch)),
                    E.left(empty().offer([n - ready, latch] as const)) as State
                  ] as const)
          )
        )
      )
    )

  const acquireN = (n: number): T.Async<void> =>
    T.applySecond(
      sanityCheck(n),
      n === 0 ? T.unit : T.bracketExit(ticketN(n), ticketExit, ticketUse)
    )

  const withPermitsN = <S, R, E, A>(
    n: number,
    inner: T.Effect<S, R, E, A>
  ): T.AsyncRE<R, E, A> => {
    const acquire = T.interruptible(acquireN(n))
    const release = releaseN(n)
    return T.bracket(acquire, F.constant(release), () => inner)
  }

  const available = T.map_(
    ref.get,
    E.fold((q) => -1 * q.size(), F.identity)
  )

  return {
    acquireN,
    acquire: acquireN(1),
    releaseN,
    release: releaseN(1),
    withPermitsN,
    withPermit: (inner) => withPermitsN(1, inner),
    available
  }
}

export type Reservation = readonly [number, Deferred<unknown, unknown, never, void>]

export function sanityCheck(n: number): T.Sync<void> {
  if (n < 0) {
    return T.raiseAbort(new Error("Die: semaphore permits must be non negative"))
  }
  if (Math.round(n) !== n) {
    return T.raiseAbort(new Error("Die: semaphore permits may not be fractional"))
  }
  return T.unit
}

export interface Semaphore {
  /**
   * Acquire a permit, blocking if not all are vailable
   */
  readonly acquire: T.Async<void>
  /**
   * Release a permit
   */
  readonly release: T.Async<void>
  /**
   * Get the number of available permits
   */
  readonly available: T.Async<number>

  /**
   * Acquire multiple permits blocking if not all are available
   * @param n
   */
  acquireN(n: number): T.Async<void>
  /**
   * Release mutliple permits
   * @param n
   */
  releaseN(n: number): T.Async<void>
  /**
   * Bracket the given io with acquireN/releaseN calls
   * @param n
   * @param io
   */
  withPermitsN<S, R, E, A>(n: number, io: T.Effect<S, R, E, A>): T.AsyncRE<R, E, A>
  /**
   * withPermitN(1, _)
   * @param n
   */
  withPermit<S, R, E, A>(n: T.Effect<S, R, E, A>): T.AsyncRE<R, E, A>
}

export type State = E.Either<Dequeue<Reservation>, number>
