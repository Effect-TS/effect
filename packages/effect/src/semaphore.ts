/*
  based on: https://github.com/rzeigler/waveguide/blob/master/src/semaphore.ts
  credits to original author
  small adaptations to extend Monad3E and support contravariance on R
 */

import * as T from "./";

import * as e from "fp-ts/lib/Either";
import { Either, left, right } from "fp-ts/lib/Either";
import { constant, identity, not } from "fp-ts/lib/function";
import * as o from "fp-ts/lib/Option";
import { pipe } from "fp-ts/lib/pipeable";
import { Deferred, makeDeferred } from "./deferred";
import { makeRef, Ref } from "./ref";
import { Dequeue, empty } from "waveguide/lib/support/dequeue";
import { makeTicket, Ticket, ticketExit, ticketUse } from "./ticket";

export interface Semaphore {
  /**
   * Acquire a permit, blocking if not all are vailable
   */
  readonly acquire: T.Effect<T.NoEnv, T.NoErr, void>;
  /**
   * Release a permit
   */
  readonly release: T.Effect<T.NoEnv, T.NoErr, void>;
  /**
   * Get the number of available permits
   */
  readonly available: T.Effect<T.NoEnv, T.NoErr, number>;

  /**
   * Acquire multiple permits blocking if not all are available
   * @param n
   */
  acquireN(n: number): T.Effect<T.NoEnv, T.NoErr, void>;
  /**
   * Release mutliple permits
   * @param n
   */
  releaseN(n: number): T.Effect<T.NoEnv, T.NoErr, void>;
  /**
   * Bracket the given io with acquireN/releaseN calls
   * @param n
   * @param io
   */
  withPermitsN<R, E, A>(n: number, io: T.Effect<R, E, A>): T.Effect<R, E, A>;
  /**
   * withPermitN(1, _)
   * @param n
   */
  withPermit<R, E, A>(n: T.Effect<R, E, A>): T.Effect<R, E, A>;
}

type Reservation = readonly [number, Deferred<never, void>];
type State = Either<Dequeue<Reservation>, number>;

const isReservationFor = (latch: Deferred<never, void>) => (
  rsv: readonly [number, Deferred<never, void>]
): boolean => rsv[1] === latch;

function sanityCheck(n: number): T.Effect<T.NoEnv, T.NoErr, void> {
  if (n < 0) {
    return T.raiseAbort(
      new Error("Die: semaphore permits must be non negative")
    );
  }
  if (Math.round(n) !== n) {
    return T.raiseAbort(
      new Error("Die: semaphore permits may not be fractional")
    );
  }
  return T.unit;
}

function makeSemaphoreImpl(ref: Ref<State>): Semaphore {
  const releaseN = <R = T.NoEnv, E = never>(n: number): T.Effect<R, E, void> =>
    pipe(
      sanityCheck(n),
      T.apSecond(
        T.uninterruptible(
          n === 0
            ? T.unit
            : pipe(
                ref.modify(current =>
                  pipe(
                    current,
                    e.fold(
                      waiting =>
                        pipe(
                          waiting.take(),
                          o.fold(
                            () => [T.unit, right(n) as State] as const,
                            ([[needed, latch], q]) =>
                              n >= needed
                                ? ([
                                    pipe(
                                      latch.done(undefined),
                                      T.apFirst(
                                        n > needed
                                          ? releaseN(n - needed)
                                          : T.unit
                                      )
                                    ),
                                    left(q) as State
                                  ] as const)
                                : ([
                                    T.unit,
                                    left(
                                      q.push([needed - n, latch] as const)
                                    ) as State
                                  ] as const)
                          )
                        ),
                      ready => [T.unit, right(ready + n) as State] as const
                    )
                  )
                ),
                T.flatten
              )
        )
      )
    );

  const cancelWait = (
    n: number,
    latch: Deferred<never, void>
  ): T.Effect<T.NoEnv, T.NoErr, void> =>
    T.uninterruptible(
      T.flatten(
        ref.modify(current =>
          pipe(
            current,
            e.fold(
              waiting =>
                pipe(
                  waiting.find(isReservationFor(latch)),
                  o.fold(
                    () => [releaseN(n), left(waiting) as State] as const,
                    ([pending]) =>
                      [
                        releaseN(n - pending),
                        left(
                          waiting.filter(not(isReservationFor(latch)))
                        ) as State
                      ] as const
                  )
                ),
              ready => [T.unit, right(ready + n) as State] as const
            )
          )
        )
      )
    );

  const ticketN = (n: number): T.Effect<T.NoEnv, T.NoErr, Ticket<void>> =>
    T.effectMonad.chain(makeDeferred<never, void>(), latch =>
      ref.modify(current =>
        pipe(
          current,
          e.fold(
            waiting =>
              [
                makeTicket(latch.wait, cancelWait(n, latch)),
                left(waiting.offer([n, latch] as const)) as State
              ] as const,
            ready =>
              ready >= n
                ? ([
                    makeTicket(T.unit, releaseN(n)),
                    right(ready - n) as State
                  ] as const)
                : ([
                    makeTicket(latch.wait, cancelWait(n, latch)),
                    left(empty().offer([n - ready, latch] as const)) as State
                  ] as const)
          )
        )
      )
    );

  const acquireN = <R = T.NoEnv, E = never>(n: number): T.Effect<R, E, void> =>
    pipe(
      sanityCheck(n),
      T.apSecond(
        n === 0 ? T.unit : T.bracketExit(ticketN(n), ticketExit, ticketUse)
      )
    );

  const withPermitsN = <R, E, A>(
    n: number,
    inner: T.Effect<R, E, A>
  ): T.Effect<R, E, A> => {
    const acquire = T.interruptible(acquireN<R, E>(n)) as T.Effect<R, E, void>;
    const release = releaseN(n) as T.Effect<R, E, void>;
    return T.bracket(acquire, constant(release), () => inner);
  };

  const available = pipe(ref.get, T.map(e.fold(q => -1 * q.size(), identity)));

  return {
    acquireN,
    acquire: acquireN(1),
    releaseN,
    release: releaseN(1),
    withPermitsN,
    withPermit: inner => withPermitsN(1, inner),
    available
  };
}

/**
 * Allocate a semaphore.
 *
 * @param n the number of permits
 * This must be non-negative
 */
export function makeSemaphore(
  n: number
): T.Effect<T.NoEnv, T.NoErr, Semaphore> {
  return pipe(
    sanityCheck(n),
    T.apSecond(pipe(makeRef(right(n) as State), T.map(makeSemaphoreImpl)))
  );
}
