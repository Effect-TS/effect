import type { Managed } from "../../Managed"
import { fromEffect } from "../../Managed/operations/fromEffect"
import type { Ref } from "../definition"
import { make } from "./make"

/**
 * Creates a new managed `XRef` with the specified value.
 */
export function makeManaged<A>(
  value: A,
  __etsTrace?: string
): Managed<unknown, never, Ref<A>> {
  return fromEffect(make(value))
}
