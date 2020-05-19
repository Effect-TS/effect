import * as T from "../Effect"
import type { FunctionN } from "../Function"
import { makeSemaphore } from "../Semaphore"

export interface ConcurrentRef<A> {
  /**
   * Get the current value of the ConcurrentRef
   */
  readonly get: T.Async<A>
  /**
   * Set the current value of the ConcurrentRef
   * @param a
   */
  set<R>(a: T.AsyncRE<R, never, A>): T.AsyncRE<R, never, A>
  /**
   * Update the current value of the ConcurrentRef with an effect.
   * Produces the new value
   * @param f
   */
  update<R>(f: FunctionN<[A], T.AsyncRE<R, never, A>>): T.AsyncRE<R, never, A>
  /**
   * Update the current value of a ConcurrentRef with an effect.
   *
   * This function may return a second value of type B that will be produced on complete
   * @param f
   */
  modify<R, B>(
    f: FunctionN<[A], T.AsyncRE<R, never, readonly [B, A]>>
  ): T.AsyncRE<R, never, B>
}

/**
 * Creates an IO that will allocate a ConcurrentRef.
 */
export const makeConcurrentRef = <A>(initial: A): T.Sync<ConcurrentRef<A>> =>
  T.map_(makeSemaphore(1), (semaphore) => {
    let value = initial

    const get = T.sync(() => value)

    const set = <R>(a: T.AsyncRE<R, never, A>): T.AsyncRE<R, never, A> =>
      semaphore.withPermit(
        T.map_(a, (a) => {
          const prev = value
          value = a
          return prev
        })
      )

    const update = <R>(
      f: FunctionN<[A], T.AsyncRE<R, never, A>>
    ): T.AsyncRE<R, never, A> =>
      semaphore.withPermit(
        T.map_(
          T.chain_(
            T.sync(() => value),
            f
          ),
          (v) => {
            value = v
            return v
          }
        )
      )

    const modify = <R, B>(
      f: FunctionN<[A], T.AsyncRE<R, never, readonly [B, A]>>
    ): T.AsyncRE<R, never, B> =>
      semaphore.withPermit(
        T.map_(
          T.chain_(
            T.sync(() => value),
            f
          ),
          (v) => {
            const [b, a] = v
            value = a
            return b
          }
        )
      )

    return {
      get,
      set,
      update,
      modify
    }
  })
