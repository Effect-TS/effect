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
export const canWriteStackTraceLimit = isStackTraceLimitWritable()
