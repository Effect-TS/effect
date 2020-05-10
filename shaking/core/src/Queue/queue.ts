import { Either, fold, left, right } from "fp-ts/lib/Either"
import { getOrElse, option } from "fp-ts/lib/Option"
import { FunctionN, identity } from "fp-ts/lib/function"
import { pipe, pipeable } from "fp-ts/lib/pipeable"

import { Deferred, makeDeferred } from "../Deferred"
import {
  applySecond,
  asUnit,
  Async,
  bracketExit,
  chain_,
  flatten,
  map_,
  pure,
  raiseAbort,
  Sync,
  uninterruptible,
  unit,
  zipWith_
} from "../Effect"
import { makeRef, Ref } from "../Ref"
import { makeSemaphore } from "../Semaphore"
import { Dequeue, empty, of } from "../Support/Dequeue"
import { makeTicket, ticketExit, ticketUse } from "../Ticket"

export interface ConcurrentQueue<A> {
  readonly take: Async<A>
  offer(a: A): Async<void>
}

type State<A> = Either<Dequeue<Deferred<unknown, unknown, never, A>>, Dequeue<A>>
const initial = <A>(): State<A> => right(empty())

const poption = pipeable(option)

const unboundedOffer = <A>(queue: Dequeue<A>, a: A): Dequeue<A> => queue.offer(a)

const natNumber = (msg: unknown) => (n: number): Sync<void> =>
  n < 0 || Math.round(n) !== n ? raiseAbort(msg) : unit

const slidingOffer = (n: number) => <A>(queue: Dequeue<A>, a: A): Dequeue<A> =>
  queue.size() >= n
    ? pipe(
        queue.take(),
        poption.map((t) => t[1]),
        getOrElse(() => queue)
      ).offer(a)
    : queue.offer(a)

const droppingOffer = (n: number) => <A>(queue: Dequeue<A>, a: A): Dequeue<A> =>
  queue.size() >= n ? queue : queue.offer(a)

function makeConcurrentQueueImpl<A>(
  state: Ref<State<A>>,
  factory: Async<Deferred<unknown, unknown, never, A>>,
  overflowStrategy: FunctionN<[Dequeue<A>, A], Dequeue<A>>,
  // This is effect that precedes offering
  // in the case of a boudned queue it is responsible for acquiring the semaphore
  offerGate: Async<void>,
  // This is the function that wraps the constructed take IO action
  // In the case of a bounded queue, it is responsible for releasing the
  // semaphore and re-acquiring it on interrupt
  takeGate: FunctionN<[Async<A>], Async<A>>
): ConcurrentQueue<A> {
  function cleanupLatch(latch: Deferred<unknown, unknown, never, A>): Async<void> {
    return asUnit(
      state.update((current) =>
        pipe(
          current,
          fold(
            (waiting) => left(waiting.filter((item) => item !== latch)),
            (available) => right(available) as State<A>
          )
        )
      )
    )
  }

  const take = takeGate(
    bracketExit(
      chain_(factory, (latch) =>
        state.modify((current) =>
          pipe(
            current,
            fold(
              (waiting) =>
                [
                  makeTicket(latch.wait, cleanupLatch(latch)),
                  left(waiting.offer(latch)) as State<A>
                ] as const,
              (ready) =>
                pipe(
                  ready.take(),
                  poption.map(
                    ([next, q]) =>
                      [makeTicket(pure(next), unit), right(q) as State<A>] as const
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
  )

  const offer = (a: A): Async<void> =>
    applySecond(
      offerGate,
      uninterruptible(
        flatten(
          state.modify((current) =>
            pipe(
              current,
              fold(
                (waiting) =>
                  pipe(
                    waiting.take(),
                    poption.map(
                      ([next, q]) => [next.done(a), left(q) as State<A>] as const
                    ),
                    getOrElse(
                      () =>
                        [unit, right(overflowStrategy(empty(), a)) as State<A>] as const
                    )
                  ),
                (available) =>
                  [unit, right(overflowStrategy(available, a)) as State<A>] as const
              )
            )
          )
        )
      )
    )
  return {
    take,
    offer
  }
}

/**
 * Create an unbounded concurrent queue
 */
export function unboundedQueue<A>(): Sync<ConcurrentQueue<A>> {
  return map_(makeRef(initial<A>()), (ref) =>
    makeConcurrentQueueImpl(
      ref,
      makeDeferred<unknown, unknown, never, A>(),
      unboundedOffer,
      unit,
      identity
    )
  )
}

const natCapacity = natNumber(new Error("Die: capacity must be a natural number"))

/**
 * Create a bounded queue with the given capacity that drops older offers
 * @param capacity
 */
export function slidingQueue<A>(capacity: number): Sync<ConcurrentQueue<A>> {
  return applySecond(
    natCapacity(capacity),
    map_(makeRef(initial<A>()), (ref) =>
      makeConcurrentQueueImpl(
        ref,
        makeDeferred<unknown, unknown, never, A>(),
        slidingOffer(capacity),
        unit,
        identity
      )
    )
  )
}

/**
 * Create a dropping queue with the given capacity that drops offers on full
 * @param capacity
 */
export function droppingQueue<A>(capacity: number): Sync<ConcurrentQueue<A>> {
  return applySecond(
    natCapacity(capacity),
    map_(makeRef(initial<A>()), (ref) =>
      makeConcurrentQueueImpl(
        ref,
        makeDeferred<unknown, unknown, never, A>(),
        droppingOffer(capacity),
        unit,
        identity
      )
    )
  )
}

/**
 * Create a bounded queue that blocks offers on capacity
 * @param capacity
 */
export function boundedQueue<A>(capacity: number): Sync<ConcurrentQueue<A>> {
  return applySecond(
    natCapacity(capacity),
    zipWith_(makeRef(initial<A>()), makeSemaphore(capacity), (ref, sem) =>
      makeConcurrentQueueImpl(
        ref,
        makeDeferred<unknown, unknown, never, A>(),
        unboundedOffer,
        sem.acquire,
        (inner) =>
          // Before take, we must release the semaphore. If we are interrupted we should re-acquire the item
          bracketExit(
            sem.release,
            (_, exit) => (exit._tag === "Interrupt" ? sem.acquire : unit),
            () => inner
          )
      )
    )
  )
}
