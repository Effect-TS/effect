import { Eq } from "../../Eq"
import { AtomicNumber } from "../Support/AtomicNumber"

/**
 * The identity of a Fiber, described by the time it began life, and a
 * monotonically increasing sequence number generated from an atomic counter.
 */
export interface FiberID {
  readonly _tag: "FiberID"
  readonly startTimeMillis: number
  readonly seqNumber: number
}

export const FiberID = (startTimeMillis: number, seqNumber: number): FiberID => ({
  _tag: "FiberID",
  seqNumber,
  startTimeMillis
})

/**
 * A sentinel value to indicate a fiber without identity.
 */
export const None =
  
  FiberID(0, 0)

export const EqFiberID: Eq<FiberID> = {
  equals: (x, y) =>
    x.seqNumber === y.seqNumber && x.startTimeMillis === y.startTimeMillis
}

const _fiberCounter = new AtomicNumber(0)

export const newFiberId = () =>
  FiberID(new Date().getTime(), _fiberCounter.getAndIncrement())
