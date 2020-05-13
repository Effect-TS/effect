import type { Deferred } from "../Deferred"
import {
  applySecond,
  asUnit,
  Async,
  bracketExit,
  chain_,
  flatten,
  pure,
  uninterruptible,
  unit
} from "../Effect"
import { fold, left, right } from "../Either"
import type { FunctionN } from "../Function"
import { map, getOrElse } from "../Option"
import { pipe } from "../Pipe"
import type { Ref } from "../Ref"
import { Dequeue, empty, of } from "../Support/Dequeue"
import { makeTicket, ticketExit, ticketUse } from "../Ticket"

import type { ConcurrentQueue } from "./ConcurrentQueue"
import type { State } from "./State"

export function makeConcurrentQueueImpl<A>(
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
                  map(
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
                    map(([next, q]) => [next.done(a), left(q) as State<A>] as const),
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
