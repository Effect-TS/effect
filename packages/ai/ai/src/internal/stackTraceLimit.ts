/**
 * Under frozen intrinsics (e.g. SES lockdown or the Temporal workflow sandbox)
 * `Error.stackTraceLimit` is read-only and assigning it throws.
 */
const canSetStackTraceLimit = (() => {
  const desc = Object.getOwnPropertyDescriptor(Error, "stackTraceLimit")
  return desc === undefined ? Object.isExtensible(Error) : desc.writable === true || desc.set !== undefined
})()

/** @internal */
export const setStackTraceLimit = (limit: number): void => {
  if (canSetStackTraceLimit) {
    Error.stackTraceLimit = limit
  }
}
