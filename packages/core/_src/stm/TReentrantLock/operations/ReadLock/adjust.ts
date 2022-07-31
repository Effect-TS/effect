import { concreteReadLock } from "@effect/core/stm/TReentrantLock/operations/_internal/InternalReadLock"

/**
 * Adjusts the number of read locks held by the specified fiber id.
 *
 * @tsplus static effect/core/stm/TReentrantLock/ReadLock.Aspects adjust
 * @tsplus pipeable effect/core/stm/TReentrantLock/ReadLock adjust
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
        self.readers.remove(fiberId) :
        self.readers.modify(fiberId, (_) => Maybe.some(newTotal))
    )
  }
}
