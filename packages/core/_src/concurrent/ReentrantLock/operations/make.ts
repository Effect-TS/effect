import { ReentrantLockInternal, ReentrantLockState } from "@effect/core/concurrent/ReentrantLock/definition"

/**
 * @tsplus static effect/core/concurrent/ReentrantLock.Ops __call
 * @tsplus static effect/core/concurrent/ReentrantLock.Ops make
 */
export function make(fairness = false): Effect<never, never, ReentrantLock> {
  return Ref.make(new ReentrantLockState(0, Maybe.none, 0, HashMap.empty()))
    .map((state) => new ReentrantLockInternal(fairness, state))
}
