// ets_tracing: off

import { pipe } from "../Function/index.js"
import * as fromEffect from "../Managed/fromEffect.js"
import type { Managed } from "../Managed/managed.js"
import * as api from "./api.js"
import type { Ref } from "./XRef.js"

/**
 * Creates a new `XRef` with the specified value.
 */
export function makeManagedRef<A>(a: A): Managed<unknown, never, Ref<A>> {
  return pipe(a, api.makeRef, fromEffect.fromEffect)
}
