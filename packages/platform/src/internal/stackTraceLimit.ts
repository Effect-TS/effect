const Err = globalThis.Error as any

/**
 * Under frozen intrinsics (e.g. SES lockdown or the Temporal workflow sandbox)
 * `Error.stackTraceLimit` is read-only and assigning it throws.
 */
const canSetStackTraceLimit = (() => {
  const desc = Object.getOwnPropertyDescriptor(Err, "stackTraceLimit")
  return desc === undefined ? Object.isExtensible(Err) : desc.writable === true || desc.set !== undefined
})()

/** @internal */
export const setStackTraceLimit = (limit: number): void => {
  if (canSetStackTraceLimit) {
    Err.stackTraceLimit = limit
  }
}
