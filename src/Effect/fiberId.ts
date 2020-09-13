import { checkDescriptor, succeed } from "./core"

/**
 * Returns the `FiberID` of the fiber executing the effect that calls this method.
 */
export function fiberId() {
  return checkDescriptor((d) => succeed(d.id))
}
