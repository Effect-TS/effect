// ets_tracing: off

import { pipe } from "../Function"
import * as fromEffect from "../Managed/fromEffect"
import type { Managed } from "../Managed/managed"
import * as api from "./api"
import type { Ref } from "./XRef"

/**
 * Creates a new `XRef` with the specified value.
 */
export function makeManagedRef<A>(a: A): Managed<unknown, never, Ref<A>> {
  return pipe(a, api.makeRef, fromEffect.fromEffect)
}
