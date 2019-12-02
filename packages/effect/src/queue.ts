/*
  based on: https://github.com/rzeigler/waveguide/blob/master/src/queue.ts
  credits to original author
 */

import { Either, fold, left, right } from "fp-ts/lib/Either";
import { FunctionN, identity } from "fp-ts/lib/function";
import { getOrElse, option } from "fp-ts/lib/Option";
import { pipe } from "fp-ts/lib/pipeable";
import { pipeable } from "fp-ts/lib/pipeable";
import { Deferred, makeDeferred } from "./deferred";
import { makeRef, Ref } from "./ref";
import { natNumber } from "./sanity";
import { makeSemaphore } from "./semaphore";
import { Dequeue, empty, of } from "./original/support/dequeue";
import { makeTicket, ticketExit, ticketUse } from "./ticket";
import { ExitTag } from "./original/exit";
import * as T from "./effect";
import { effect } from "./effect";

export interface ConcurrentQueue<A> {
  readonly take: T.Effect<T.NoEnv, never, A>;
  offer(a: A): T.Effect<T.NoEnv, never, void>;
}

type State<A> = Either<Dequeue<Deferred<T.NoEnv, never, A>>, Dequeue<A>>;
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
  factory: T.Effect<T.NoEnv, never, Deferred<T.NoEnv, never, A>>,
  overflowStrategy: FunctionN<[Dequeue<A>, A], Dequeue<A>>,
  // This is effect that precedes offering
  // in the case of a boudned queue it is responsible for acquiring the semaphore
  offerGate: T.Effect<T.NoEnv, never, void>,
  // This is the function that wraps the constructed take IO action
  // In the case of a bounded queue, it is responsible for releasing the
  // semaphore and re-acquiring it on interrupt
  takeGate: FunctionN<
    [T.Effect<T.NoEnv, never, A>],
    T.Effect<T.NoEnv, never, A>
  >
): ConcurrentQueue<A> {
  function cleanupLatch(
    latch: Deferred<T.NoEnv, never, A>
  ): T.Effect<T.NoEnv, never, void> {
    return T.asUnit(
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
    T.bracketExit(
      effect.chain(factory, latch =>
        state.modify(current =>
          pipe(
            current,
            fold(
              waiting =>
                [
                  makeTicket(latch.wait, cleanupLatch(latch)),
                  left(waiting.offer(latch)) as State<A>
                ] as const,
              ready =>
                pipe(
                  ready.take(),
                  poption.map(
                    ([next, q]) =>
                      [
                        makeTicket(T.pure(next), T.unit),
                        right(q) as State<A>
                      ] as const
                  ),
                  getOrElse(
                    () =>
                      [
                        makeTicket(latch.wait, cleanupLatch(latch)),
                        left(of(latch)) as State<A>
                      ] as const
                  )
                )
            )
          )
        )
      ),
      ticketExit,
      ticketUse
    )
  );

  const offer = (a: A): T.Effect<T.NoEnv, never, void> =>
    T.applySecond(
      offerGate,
      T.uninterruptible(
        T.flatten(
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
                          T.unit,
                          right(overflowStrategy(empty(), a)) as State<A>
                        ] as const
                    )
                  ),
                available =>
                  [
                    T.unit,
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
  never,
  ConcurrentQueue<A>
> {
  return effect.map(makeRef(initial<A>()), ref =>
    makeConcurrentQueueImpl(
      ref,
      makeDeferred<T.NoEnv, never, A>(),
      unboundedOffer,
      T.unit,
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
): T.Effect<T.NoEnv, never, ConcurrentQueue<A>> {
  return T.applySecond(
    natCapacity(capacity),
    effect.map(makeRef(initial<A>()), ref =>
      makeConcurrentQueueImpl(
        ref,
        makeDeferred<T.NoEnv, never, A>(),
        slidingOffer(capacity),
        T.unit,
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
): T.Effect<T.NoEnv, never, ConcurrentQueue<A>> {
  return T.applySecond(
    natCapacity(capacity),
    effect.map(makeRef(initial<A>()), ref =>
      makeConcurrentQueueImpl(
        ref,
        makeDeferred<T.NoEnv, never, A>(),
        droppingOffer(capacity),
        T.unit,
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
): T.Effect<T.NoEnv, never, ConcurrentQueue<A>> {
  return T.applySecond(
    natCapacity(capacity),
    T.zipWith(makeRef(initial<A>()), makeSemaphore(capacity), (ref, sem) =>
      makeConcurrentQueueImpl(
        ref,
        makeDeferred<T.NoEnv, never, A>(),
        unboundedOffer,
        sem.acquire,
        inner =>
          // Before take, we must release the semaphore. If we are interrupted we should re-acquire the item
          T.bracketExit(
            sem.release,
            (_, exit) =>
              exit._tag === ExitTag.Interrupt ? sem.acquire : T.unit,
            () => inner
          )
      )
    )
  );
}
