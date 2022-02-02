// -----------------------------------------------------------------------------
// Model
// -----------------------------------------------------------------------------

/**
 * The `InterruptStatus` of a fiber determines whether or not it can be
 * interrupted. The status can change over time in different regions.
 *
 * @tsplus type ets/InterruptStatus
 */
export interface InterruptStatus {
  readonly isInterruptible: boolean
  readonly isUninterruptible: boolean
  readonly toBoolean: boolean
}

/**
 * @tsplus type ets/InterruptStatusOps
 */
export interface InterruptStatusOps {}
export const InterruptStatus: InterruptStatusOps = {}

export class InterruptStatusImpl implements InterruptStatus {
  constructor(readonly isInterruptible: boolean) {}

  get isUninterruptible(): boolean {
    return !this.isInterruptible
  }

  get toBoolean(): boolean {
    return this.isInterruptible
  }
}

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/**
 * Indicates the fiber can be interrupted right now.
 *
 * @tsplus static ets/InterruptStatusOps Interruptible
 */
export const Interruptible: InterruptStatus = new InterruptStatusImpl(true)

/**
 * Indicates the fiber cannot be interrupted right now.
 *
 * @tsplus static ets/InterruptStatusOps Uninterruptible
 */
export const Uninterruptible: InterruptStatus = new InterruptStatusImpl(false)

/**
 * @tsplus static ets/InterruptStatusOps fromBoolean
 */
export function fromBoolean(b: boolean): InterruptStatus {
  return b ? Interruptible : Uninterruptible
}
