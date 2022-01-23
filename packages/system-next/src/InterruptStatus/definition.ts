// -----------------------------------------------------------------------------
// Model
// -----------------------------------------------------------------------------

/**
 * The `InterruptStatus` of a fiber determines whether or not it can be
 * interrupted. The status can change over time in different regions.
 */
export class InterruptStatus {
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
 */
export const Interruptible: InterruptStatus = new InterruptStatus(true)

/**
 * Indicates the fiber cannot be interrupted right now.
 */
export const Uninterruptible: InterruptStatus = new InterruptStatus(false)

export function fromBoolean(b: boolean): InterruptStatus {
  return b ? Interruptible : Uninterruptible
}
