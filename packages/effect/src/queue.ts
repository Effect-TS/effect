/*
  based on: https://github.com/rzeigler/waveguide/blob/master/src/queue.ts
  credits to original author
 */

import { either as E, function as F, option as O, pipeable as P } from "fp-ts";
import { Deferred, makeDeferred } from "./deferred";
import { makeRef, Ref } from "./ref";
import { natNumber } from "./sanity";
import { makeSemaphore } from "./semaphore";
import { Dequeue, empty, of } from "./original/support/dequeue";
import { makeTicket, ticketExit, ticketUse } from "./ticket";
import * as T from "./effect";
import { effect } from "./effect";

export interface ConcurrentQueue<A> {
  readonly take: T.Effect<T.AsyncRT, never, A>;
  offer(a: A): T.Effect<T.AsyncRT, never, void>;
}

type State<A> = E.Either<Dequeue<Deferred<T.NoEnv, never, A>>, Dequeue<A>>;
const initial = <A>(): State<A> => E.right(empty());

const poption = P.pipeable(O.option);

const unboundedOffer = <A>(queue: Dequeue<A>, a: A): Dequeue<A> => queue.offer(a);

// TODO: Need a better way of checking for this
// Possibly predicates that allow testing if the queue is at least of some size
const slidingOffer = (n: number) => <A>(queue: Dequeue<A>, a: A): Dequeue<A> =>
  queue.size() >= n
    ? P.pipe(
        queue.take(),
        poption.map((t) => t[1]),
        O.getOrElse(() => queue)
      ).offer(a)
    : queue.offer(a);

const droppingOffer = (n: number) => <A>(queue: Dequeue<A>, a: A): Dequeue<A> =>
  queue.size() >= n ? queue : queue.offer(a);

function makeConcurrentQueueImpl<A>(
  state: Ref<State<A>>,
  factory: T.Effect<T.NoEnv, never, Deferred<T.NoEnv, never, A>>,
  overflowStrategy: F.FunctionN<[Dequeue<A>, A], Dequeue<A>>,
  // This is effect that precedes offering
  // in the case of a boudned queue it is responsible for acquiring the semaphore
  offerGate: T.Effect<T.AsyncRT, never, void>,
  // This is the function that wraps the constructed take IO action
  // In the case of a bounded queue, it is responsible for releasing the
  // semaphore and re-acquiring it on interrupt
  takeGate: F.FunctionN<[T.Effect<T.AsyncRT, never, A>], T.Effect<T.AsyncRT, never, A>>
): ConcurrentQueue<A> {
  function cleanupLatch(latch: Deferred<T.NoEnv, never, A>): T.Effect<T.NoEnv, never, void> {
    return T.asUnit(
      state.update((current) =>
        P.pipe(
          current,
          E.fold(
            (waiting) => E.left(waiting.filter((item) => item !== latch)),
            (available) => E.right(available) as State<A>
          )
        )
      )
    );
  }

  const take = takeGate(
    T.bracketExit(
      effect.chain(factory, (latch) =>
        state.modify((current) =>
          P.pipe(
            current,
            E.fold(
              (waiting) =>
                [
                  makeTicket(latch.wait, cleanupLatch(latch)),
                  E.left(waiting.offer(latch)) as State<A>
                ] as const,
              (ready) =>
                P.pipe(
                  ready.take(),
                  poption.map(
                    ([next, q]) =>
                      [makeTicket(T.pure(next), T.unit), E.right(q) as State<A>] as const
                  ),
                  O.getOrElse(
                    () =>
                      [
                        makeTicket(latch.wait, cleanupLatch(latch)),
                        E.left(of(latch)) as State<A>
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

  const offer = (a: A): T.Effect<T.AsyncRT, never, void> =>
    T.applySecond(
      offerGate,
      T.uninterruptible(
        T.flatten(
          state.modify((current) =>
            P.pipe(
              current,
              E.fold(
                (waiting) =>
                  P.pipe(
                    waiting.take(),
                    poption.map(([next, q]) => [next.done(a), E.left(q) as State<A>] as const),
                    O.getOrElse(
                      () => [T.unit, E.right(overflowStrategy(empty(), a)) as State<A>] as const
                    )
                  ),
                (available) =>
                  [T.unit, E.right(overflowStrategy(available, a)) as State<A>] as const
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
export function unboundedQueue<A>(): T.Effect<T.NoEnv, never, ConcurrentQueue<A>> {
  return effect.map(makeRef(initial<A>()), (ref) =>
    makeConcurrentQueueImpl(
      ref,
      makeDeferred<T.NoEnv, never, A>(),
      unboundedOffer,
      T.unit,
      F.identity
    )
  );
}

const natCapacity = natNumber(new Error("Die: capacity must be a natural number"));

/**
 * Create a bounded queue with the given capacity that drops older offers
 * @param capacity
 */
export function slidingQueue<A>(capacity: number): T.Effect<T.NoEnv, never, ConcurrentQueue<A>> {
  return T.applySecond(
    natCapacity(capacity),
    effect.map(makeRef(initial<A>()), (ref) =>
      makeConcurrentQueueImpl(
        ref,
        makeDeferred<T.NoEnv, never, A>(),
        slidingOffer(capacity),
        T.unit,
        F.identity
      )
    )
  );
}

/**
 * Create a dropping queue with the given capacity that drops offers on full
 * @param capacity
 */
export function droppingQueue<A>(capacity: number): T.Effect<T.NoEnv, never, ConcurrentQueue<A>> {
  return T.applySecond(
    natCapacity(capacity),
    effect.map(makeRef(initial<A>()), (ref) =>
      makeConcurrentQueueImpl(
        ref,
        makeDeferred<T.NoEnv, never, A>(),
        droppingOffer(capacity),
        T.unit,
        F.identity
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
): T.Effect<T.AsyncRT, never, ConcurrentQueue<A>> {
  return T.applySecond(
    natCapacity(capacity),
    T.effect.zipWith(makeRef(initial<A>()), makeSemaphore(capacity), (ref, sem) =>
      makeConcurrentQueueImpl(
        ref,
        makeDeferred<T.NoEnv, never, A>(),
        unboundedOffer,
        sem.acquire,
        (inner) =>
          // Before take, we must release the semaphore. If we are interrupted we should re-acquire the item
          T.bracketExit(
            sem.release,
            (_, exit) => (exit._tag === "Interrupt" ? sem.acquire : T.unit),
            () => inner
          )
      )
    )
  );
}
