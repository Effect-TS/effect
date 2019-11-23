/*
  based on: https://github.com/rzeigler/waveguide/blob/master/src/queue.ts
  credits to original author
  small adaptations to extend Monad3E and support contravariance on R
 */

/* tested in wave */
/* istanbul ignore file */

import { Either, fold, left, right } from "fp-ts/lib/Either";
import { FunctionN, identity } from "fp-ts/lib/function";
import { getOrElse, option } from "fp-ts/lib/Option";
import { pipe } from "fp-ts/lib/pipeable";
import { pipeable } from "fp-ts/lib/pipeable";
import { Deferred, makeDeferred } from "./deferred";
import * as io from "waveguide/lib/wave";
import * as ior from "waveguide/lib/waver";
import { makeRef, Ref } from "./ref";
import { natNumber } from "./sanity";
import * as S from "./semaphore";
import { Dequeue, empty, of } from "waveguide/lib/support/dequeue";
import { makeTicket, ticketExit, ticketUse } from "waveguide/lib/ticket";
import { ExitTag } from "waveguide/lib/exit";

import * as T from "./";

export interface ConcurrentQueue<A> {
  readonly take: T.Effect<T.NoEnv, T.NoErr, A>;
  offer(a: A): T.Effect<T.NoEnv, T.NoErr, void>;
}

type State<A> = Either<Dequeue<Deferred<T.NoEnv, T.NoErr, A>>, Dequeue<A>>;
const initial = <A>(): State<A> => right(empty());

const poption = pipeable(option);

const unboundedOffer = <A>(queue: Dequeue<A>, a: A): Dequeue<A> =>
  queue.offer(a);

// TODO: Need a better way of checking for this
// Possibly predicates that allow testing if the queue is at least of some size
const slidingOffer = (n: number) => <A>(queue: Dequeue<A>, a: A): Dequeue<A> =>
  queue.size() >= n
    ? pipe(
        queue.take(),
        poption.map(t => t[1]),
        getOrElse(() => queue)
      ).offer(a)
    : queue.offer(a);

const droppingOffer = (n: number) => <A>(queue: Dequeue<A>, a: A): Dequeue<A> =>
  queue.size() >= n ? queue : queue.offer(a);

function makeConcurrentQueueImpl<A>(
  state: Ref<State<A>>,
  factory: T.Effect<T.NoEnv, T.NoErr, Deferred<T.NoEnv, T.NoErr, A>>,
  overflowStrategy: FunctionN<[Dequeue<A>, A], Dequeue<A>>,
  // This is effect that precedes offering
  // in the case of a boudned queue it is responsible for acquiring the semaphore
  offerGate: T.Effect<T.NoEnv, T.NoErr, void>,
  // This is the function that wraps the constructed take IO action
  // In the case of a bounded queue, it is responsible for releasing the
  // semaphore and re-acquiring it on interrupt
  takeGate: FunctionN<
    [T.Effect<T.NoEnv, T.NoErr, A>],
    T.Effect<T.NoEnv, T.NoErr, A>
  >
): ConcurrentQueue<A> {
  function cleanupLatch(
    latch: Deferred<T.NoEnv, T.NoErr, A>
  ): T.Effect<T.NoEnv, T.NoErr, void> {
    return ior.asUnit(
      state.update(current =>
        pipe(
          current,
          fold(
            waiting => left(waiting.filter(item => item !== latch)),
            available => right(available) as State<A>
          )
        )
      )
    );
  }

  const take = takeGate(
    ior.bracketExit(
      ior.chain(factory, latch =>
        state.modify(current =>
          pipe(
            current,
            fold(
              waiting =>
                [
                  makeTicket(latch.wait(T.noEnv), cleanupLatch(latch)(T.noEnv)),
                  left(waiting.offer(latch)) as State<A>
                ] as const,
              ready =>
                pipe(
                  ready.take(),
                  poption.map(
                    ([next, q]) =>
                      [
                        makeTicket(io.pure(next), io.unit),
                        right(q) as State<A>
                      ] as const
                  ),
                  getOrElse(
                    () =>
                      [
                        makeTicket(
                          latch.wait(T.noEnv),
                          cleanupLatch(latch)(T.noEnv)
                        ),
                        left(of(latch)) as State<A>
                      ] as const
                  )
                )
            )
          )
        )
      ),
      (a, b) => _ => ticketExit(a, b),
      x => _ => ticketUse(x)
    )
  );

  const offer = (a: A): T.Effect<T.NoEnv, T.NoErr, void> =>
    ior.applySecond(
      offerGate,
      ior.uninterruptible(
        ior.flatten(
          state.modify(current =>
            pipe(
              current,
              fold(
                waiting =>
                  pipe(
                    waiting.take(),
                    poption.map(
                      ([next, q]) =>
                        [next.done(a), left(q) as State<A>] as const
                    ),
                    getOrElse(
                      () =>
                        [
                          ior.unit,
                          right(overflowStrategy(empty(), a)) as State<A>
                        ] as const
                    )
                  ),
                available =>
                  [
                    ior.unit,
                    right(overflowStrategy(available, a)) as State<A>
                  ] as const
              )
            )
          )
        )
      )
    );
  return {
    take,
    offer
  };
}

/**
 * Create an unbounded concurrent queue
 */
export function unboundedQueue<A>(): T.Effect<
  T.NoEnv,
  T.NoErr,
  ConcurrentQueue<A>
> {
  return ior.map(makeRef(initial<A>()), ref =>
    makeConcurrentQueueImpl(
      ref,
      makeDeferred<T.NoEnv, T.NoErr, A>(),
      unboundedOffer,
      ior.unit,
      identity
    )
  );
}

const natCapacity = natNumber(
  new Error("Die: capacity must be a natural number")
);

/**
 * Create a bounded queue with the given capacity that drops older offers
 * @param capacity
 */
export function slidingQueue<A>(
  capacity: number
): T.Effect<T.NoEnv, T.NoErr, ConcurrentQueue<A>> {
  return ior.applySecond(
    natCapacity(capacity),
    ior.map(makeRef(initial<A>()), ref =>
      makeConcurrentQueueImpl(
        ref,
        makeDeferred<T.NoEnv, T.NoErr, A>(),
        slidingOffer(capacity),
        ior.unit,
        identity
      )
    )
  );
}

/**
 * Create a dropping queue with the given capacity that drops offers on full
 * @param capacity
 */
export function droppingQueue<A>(
  capacity: number
): T.Effect<T.NoEnv, T.NoErr, ConcurrentQueue<A>> {
  return ior.applySecond(
    natCapacity(capacity),
    ior.map(makeRef(initial<A>()), ref =>
      makeConcurrentQueueImpl(
        ref,
        makeDeferred<T.NoEnv, T.NoErr, A>(),
        droppingOffer(capacity),
        ior.unit,
        identity
      )
    )
  );
}

/**
 * Create a bounded queue that blocks offers on capacity
 * @param capacity
 */
export function boundedQueue<A>(
  capacity: number
): T.Effect<T.NoEnv, T.NoErr, ConcurrentQueue<A>> {
  return ior.applySecond(
    natCapacity(capacity),
    ior.zipWith(makeRef(initial<A>()), S.makeSemaphore(capacity), (ref, sem) =>
      makeConcurrentQueueImpl(
        ref,
        makeDeferred<T.NoEnv, T.NoErr, A>(),
        unboundedOffer,
        sem.acquire,
        inner =>
          // Before take, we must release the semaphore. If we are interrupted we should re-acquire the item
          ior.bracketExit(
            sem.release,
            (_, exit) =>
              exit._tag === ExitTag.Interrupt ? sem.acquire : ior.unit,
            () => inner
          )
      )
    )
  );
}
