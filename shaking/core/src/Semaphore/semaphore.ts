import { Either, left, fold, right } from "fp-ts/lib/Either"
import { fold as foldOption } from "fp-ts/lib/Option"
import { not, constant, identity } from "fp-ts/lib/function"
import { pipe } from "fp-ts/lib/pipeable"

import { Deferred, makeDeferred } from "../Deferred"
import {
  Async,
  Effect,
  AsyncRE,
  Sync,
  raiseAbort,
  unit,
  AsyncE,
  applySecond,
  uninterruptible,
  flatten,
  applyFirst,
  effect,
  bracketExit,
  interruptible,
  bracket
} from "../Effect"
import { makeRef, Ref } from "../Ref"
import { Dequeue, empty } from "../Support/Dequeue"
import { makeTicket, Ticket, ticketExit, ticketUse } from "../Ticket"

export interface Semaphore {
  /**
   * Acquire a permit, blocking if not all are vailable
   */
  readonly acquire: Async<void>
  /**
   * Release a permit
   */
  readonly release: Async<void>
  /**
   * Get the number of available permits
   */
  readonly available: Async<number>

  /**
   * Acquire multiple permits blocking if not all are available
   * @param n
   */
  acquireN(n: number): Async<void>
  /**
   * Release mutliple permits
   * @param n
   */
  releaseN(n: number): Async<void>
  /**
   * Bracket the given io with acquireN/releaseN calls
   * @param n
   * @param io
   */
  withPermitsN<S, R, E, A>(n: number, io: Effect<S, R, E, A>): AsyncRE<R, E, A>
  /**
   * withPermitN(1, _)
   * @param n
   */
  withPermit<S, R, E, A>(n: Effect<S, R, E, A>): AsyncRE<R, E, A>
}

type Reservation = readonly [number, Deferred<unknown, unknown, never, void>]
type State = Either<Dequeue<Reservation>, number>

const isReservationFor = (latch: Deferred<unknown, unknown, never, void>) => (
  rsv: readonly [number, Deferred<unknown, unknown, never, void>]
): boolean => rsv[1] === latch

function sanityCheck(n: number): Sync<void> {
  if (n < 0) {
    return raiseAbort(new Error("Die: semaphore permits must be non negative"))
  }
  if (Math.round(n) !== n) {
    return raiseAbort(new Error("Die: semaphore permits may not be fractional"))
  }
  return unit
}

function makeSemaphoreImpl(ref: Ref<State>): Semaphore {
  const releaseN = <E = never>(n: number): AsyncE<E, void> =>
    applySecond(
      sanityCheck(n),
      uninterruptible(
        n === 0
          ? unit
          : flatten(
              ref.modify((current) =>
                pipe(
                  current,
                  fold(
                    (waiting) =>
                      pipe(
                        waiting.take(),
                        foldOption(
                          () => [unit, right(n) as State] as const,
                          ([[needed, latch], q]) =>
                            n >= needed
                              ? ([
                                  applyFirst(
                                    latch.done(undefined),
                                    n > needed ? releaseN(n - needed) : unit
                                  ),
                                  left(q) as State
                                ] as const)
                              : ([
                                  unit,
                                  left(q.push([needed - n, latch] as const)) as State
                                ] as const)
                        )
                      ),
                    (ready) => [unit, right(ready + n) as State] as const
                  )
                )
              )
            )
      )
    )

  const cancelWait = (
    n: number,
    latch: Deferred<unknown, unknown, never, void>
  ): Async<void> =>
    uninterruptible(
      flatten(
        ref.modify((current) =>
          pipe(
            current,
            fold(
              (waiting) =>
                pipe(
                  waiting.find(isReservationFor(latch)),
                  foldOption(
                    () => [releaseN(n), left(waiting) as State] as const,
                    ([pending]) =>
                      [
                        releaseN(n - pending),
                        left(waiting.filter(not(isReservationFor(latch)))) as State
                      ] as const
                  )
                ),
              (ready) => [unit, right(ready + n) as State] as const
            )
          )
        )
      )
    )

  const ticketN = (n: number): Async<Ticket<unknown, unknown, void>> =>
    effect.chain(makeDeferred<unknown, unknown, never, void>(), (latch) =>
      ref.modify((current) =>
        pipe(
          current,
          fold(
            (waiting) =>
              [
                makeTicket(latch.wait, cancelWait(n, latch)),
                left(waiting.offer([n, latch] as const)) as State
              ] as const,
            (ready) =>
              ready >= n
                ? ([makeTicket(unit, releaseN(n)), right(ready - n) as State] as const)
                : ([
                    makeTicket(latch.wait, cancelWait(n, latch)),
                    left(empty().offer([n - ready, latch] as const)) as State
                  ] as const)
          )
        )
      )
    )

  const acquireN = (n: number): Async<void> =>
    applySecond(
      sanityCheck(n),
      n === 0 ? unit : bracketExit(ticketN(n), ticketExit, ticketUse)
    )

  const withPermitsN = <S, R, E, A>(
    n: number,
    inner: Effect<S, R, E, A>
  ): AsyncRE<R, E, A> => {
    const acquire = interruptible(acquireN(n))
    const release = releaseN(n)
    return bracket(acquire, constant(release), () => inner)
  }

  const available = effect.map(
    ref.get,
    fold((q) => -1 * q.size(), identity)
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

/**
 * Allocate a semaphore.
 *
 * @param n the number of permits
 * This must be non-negative
 */
export function makeSemaphore(n: number): Sync<Semaphore> {
  return applySecond(
    sanityCheck(n),
    effect.map(makeRef(right(n) as State), makeSemaphoreImpl)
  )
}
