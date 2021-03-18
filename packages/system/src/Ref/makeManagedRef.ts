// tracing: off

import { pipe } from "../Function"
import { fromEffect } from "../Managed/fromEffect"
import type { Managed } from "../Managed/managed"
import { makeRef } from "./api"
import type { Ref } from "./XRef"

/**
 * Creates a new `XRef` with the specified value.
 */
export function makeManagedRef<A>(a: A): Managed<unknown, never, Ref<A>> {
  return pipe(a, makeRef, fromEffect)
}
