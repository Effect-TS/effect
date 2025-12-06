/**
 * Utility for safely manipulating Error.stackTraceLimit in environments
 * where intrinsics may be frozen (e.g., SES/hardened JavaScript).
 * @internal
 */

const ObjectGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor
const ObjectPrototypeHasOwnProperty = Object.prototype.hasOwnProperty
const ObjectIsExtensible = Object.isExtensible

/**
 * Check if Error.stackTraceLimit is writable.
 * Returns false if the property is frozen, non-writable, or Error is non-extensible.
 * @internal
 */
export const isStackTraceLimitWritable = (): boolean => {
  const desc = ObjectGetOwnPropertyDescriptor(Error, "stackTraceLimit")
  if (desc === undefined) {
    return ObjectIsExtensible(Error)
  }

  return ObjectPrototypeHasOwnProperty.call(desc, "writable")
    ? desc.writable === true
    : desc.set !== undefined
}

// Cache the check result since it won't change during runtime
const canWriteStackTraceLimit = isStackTraceLimitWritable()

/**
 * Safely set Error.stackTraceLimit if possible, otherwise no-op.
 * @internal
 */
export const setStackTraceLimit = (value: number): void => {
  if (canWriteStackTraceLimit) {
    Error.stackTraceLimit = value
  }
}

/**
 * Get the current Error.stackTraceLimit value.
 * Returns undefined if the property doesn't exist.
 * @internal
 */
export const getStackTraceLimit = (): number | undefined => {
  return Error.stackTraceLimit
}

/**
 * Execute a function with a temporarily modified Error.stackTraceLimit.
 * If the limit cannot be modified (frozen intrinsics), executes the function without modification.
 * @internal
 */
export const withStackTraceLimit = <T>(limit: number, fn: () => T): T => {
  if (!canWriteStackTraceLimit) {
    return fn()
  }

  const prevLimit = Error.stackTraceLimit
  try {
    Error.stackTraceLimit = limit
    return fn()
  } finally {
    Error.stackTraceLimit = prevLimit
  }
}
