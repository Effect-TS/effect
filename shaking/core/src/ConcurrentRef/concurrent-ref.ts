import { Async, AsyncRE, Sync, effect, sync } from "../Effect"
import { FunctionN } from "../Function"
import { makeSemaphore } from "../Semaphore"

export interface ConcurrentRef<A> {
  /**
   * Get the current value of the ConcurrentRef
   */
  readonly get: Async<A>
  /**
   * Set the current value of the ConcurrentRef
   * @param a
   */
  set<R>(a: AsyncRE<R, never, A>): AsyncRE<R, never, A>
  /**
   * Update the current value of the ConcurrentRef with an effect.
   * Produces the new value
   * @param f
   */
  update<R>(f: FunctionN<[A], AsyncRE<R, never, A>>): AsyncRE<R, never, A>
  /**
   * Update the current value of a ConcurrentRef with an effect.
   *
   * This function may return a second value of type B that will be produced on complete
   * @param f
   */
  modify<R, B>(
    f: FunctionN<[A], AsyncRE<R, never, readonly [B, A]>>
  ): AsyncRE<R, never, B>
}

/**
 * Creates an IO that will allocate a ConcurrentRef.
 */
export const makeConcurrentRef = <A>(initial: A): Sync<ConcurrentRef<A>> =>
  effect.map(makeSemaphore(1), (semaphore) => {
    let value = initial

    const get = sync(() => value)

    const set = <R>(a: AsyncRE<R, never, A>): AsyncRE<R, never, A> =>
      semaphore.withPermit(
        effect.map(a, (a) => {
          const prev = value
          value = a
          return prev
        })
      )

    const update = <R>(f: FunctionN<[A], AsyncRE<R, never, A>>): AsyncRE<R, never, A> =>
      semaphore.withPermit(
        effect.map(
          effect.chain(
            sync(() => value),
            f
          ),
          (v) => {
            value = v
            return v
          }
        )
      )

    const modify = <R, B>(
      f: FunctionN<[A], AsyncRE<R, never, readonly [B, A]>>
    ): AsyncRE<R, never, B> =>
      semaphore.withPermit(
        effect.map(
          effect.chain(
            sync(() => value),
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
