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

/**
 * Constructs a Fiber ID
 */
export const FiberID = (startTimeMillis: number, seqNumber: number): FiberID => ({
  _tag: "FiberID",
  seqNumber,
  startTimeMillis
})

/**
 * A sentinel value to indicate a fiber without identity.
 */
export const None = FiberID(0, 0)

/**
 * Checks equality of Fiber IDs
 */
export const equalsFiberID = (x: FiberID, y: FiberID) =>
  x.seqNumber === y.seqNumber && x.startTimeMillis === y.startTimeMillis

const _fiberCounter = new AtomicNumber(0)

/**
 * Constructs a new Fiber ID using current time and global increment
 */
export const newFiberId = () =>
  FiberID(new Date().getTime(), _fiberCounter.getAndIncrement())
