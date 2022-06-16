import { concreteReadLock } from "@effect/core/stm/TReentrantLock/operations/_internal/InternalReadLock"

/**
 * Adjusts the number of read locks held by the specified fiber id.
 *
 * @tsplus fluent ets/TReentrantLock/ReadLock adjust
 */
export function adjust_(self: TReentrantLock.ReadLock, fiberId: FiberId, adjust: number): TReentrantLock.ReadLock {
  concreteReadLock(self)

  const total = self.readLocksHeld(fiberId)
  const newTotal = total + adjust

  if (newTotal < 0) {
    throw new Error(`Defect: Fiber ${fiberId} releasing read lock it does not hold: ${self.readers}`)
  }

  return TReentrantLock.ReadLock(
    newTotal === 0 ? self.readers.remove(fiberId) : self.readers.modify(fiberId, (_) => Option.some(newTotal))
  )
}

/**
 * Adjusts the number of read locks held by the specified fiber id.
 *
 * @tsplus static ets/TReentrantLock/ReadLock/Aspects adjust
 */
export const adjust = Pipeable(adjust_)
