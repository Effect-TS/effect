/*
  based on: https://github.com/rzeigler/waveguide/blob/master/src/semaphore.ts
  credits to original author
 */

import * as e from "fp-ts/lib/Either";
import { Either, left, right } from "fp-ts/lib/Either";
import { constant, identity, not } from "fp-ts/lib/function";
import * as o from "fp-ts/lib/Option";
import { pipe } from "fp-ts/lib/pipeable";
import { Dequeue, empty } from "waveguide/lib/support/dequeue";
import { Deferred, makeDeferred } from "./deferred";
import { makeRef, Ref } from "./ref";
import { makeTicket, Ticket, ticketExit, ticketUse } from "./ticket";
import * as T from "./";

export interface Semaphore {
  /**
   * Acquire a permit, blocking if not all are vailable
   */
  readonly acquire: T.Stack<T.NoEnv, never, void>;
  /**
   * Release a permit
   */
  readonly release: T.Stack<T.NoEnv, never, void>;
  /**
   * Get the number of available permits
   */
  readonly available: T.Stack<T.NoEnv, never, number>;

  /**
   * Acquire multiple permits blocking if not all are available
   * @param n
   */
  acquireN(n: number): T.Stack<T.NoEnv, never, void>;
  /**
   * Release mutliple permits
   * @param n
   */
  releaseN(n: number): T.Stack<T.NoEnv, never, void>;
  /**
   * Bracket the given io with acquireN/releaseN calls
   * @param n
   * @param io
   */
  withPermitsN<R, E, A>(n: number, io: T.Stack<R, E, A>): T.Stack<R, E, A>;
  /**
   * withPermitN(1, _)
   * @param n
   */
  withPermit<R, E, A>(n: T.Stack<R, E, A>): T.Stack<R, E, A>;
}

type Reservation = readonly [number, Deferred<unknown, never, void>];
type State = Either<Dequeue<Reservation>, number>;

const isReservationFor = (latch: Deferred<unknown, never, void>) => (
  rsv: readonly [number, Deferred<unknown, never, void>]
): boolean => rsv[1] === latch;

function sanityCheck(n: number): T.Stack<T.NoEnv, never, void> {
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
  const releaseN = <E = never>(n: number): T.Stack<T.NoEnv, E, void> =>
    T.applySecond(
      sanityCheck(n),
      T.uninterruptible(
        n === 0
          ? T.unit
          : T.flatten(
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
                                  T.applyFirst(
                                    latch.done(undefined),
                                    n > needed ? releaseN(n - needed) : T.unit
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
              )
            )
      )
    );

  const cancelWait = (
    n: number,
    latch: Deferred<unknown, never, void>
  ): T.Stack<T.NoEnv, never, void> =>
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

  const ticketN = (n: number): T.Stack<T.NoEnv, never, Ticket<void>> =>
    T.chain(makeDeferred<unknown, never, void>(), latch =>
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

  const acquireN = (n: number): T.Stack<T.NoEnv, never, void> =>
    T.applySecond(
      sanityCheck(n),
      n === 0 ? T.unit : T.bracketExit(ticketN(n), ticketExit, ticketUse)
    );

  const withPermitsN = <R, E, A>(
    n: number,
    inner: T.Stack<R, E, A>
  ): T.Stack<R, E, A> => {
    const acquire = T.interruptible(acquireN(n));
    const release = releaseN(n);
    return T.bracket(acquire, constant(release), () => inner);
  };

  const available = T.map(
    ref.get,
    e.fold(q => -1 * q.size(), identity)
  );

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
export function makeSemaphore(n: number): T.Stack<T.NoEnv, never, Semaphore> {
  return T.applySecond(
    sanityCheck(n),
    T.map(makeRef(right(n) as State), makeSemaphoreImpl)
  );
}
