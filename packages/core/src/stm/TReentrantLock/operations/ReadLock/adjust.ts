import { concreteReadLock } from "@effect/core/stm/TReentrantLock/operations/_internal/InternalReadLock"
import { pipe } from "@fp-ts/data/Function"
import * as HashMap from "@fp-ts/data/HashMap"
import * as Option from "@fp-ts/data/Option"

/**
 * Adjusts the number of read locks held by the specified fiber id.
 *
 * @tsplus static effect/core/stm/TReentrantLock/ReadLock.Aspects adjust
 * @tsplus pipeable effect/core/stm/TReentrantLock/ReadLock adjust
 * @category mutations
 * @since 1.0.0
 */
export function adjust(fiberId: FiberId, adjust: number) {
  return (self: TReentrantLock.ReadLock): TReentrantLock.ReadLock => {
    concreteReadLock(self)

    const total = self.readLocksHeld(fiberId)
    const newTotal = total + adjust

    if (newTotal < 0) {
      throw new Error(
        `Defect: Fiber ${fiberId} releasing read lock it does not hold: ${self.readers}`
      )
    }

    return TReentrantLock.ReadLock(
      newTotal === 0 ?
        pipe(self.readers, HashMap.remove(fiberId)) :
        pipe(self.readers, HashMap.modify(fiberId, (_) => Option.some(newTotal)))
    )
  }
}
