import { makeRef } from "../Ref"

import * as T from "./deps"
import { makeExit_ } from "./makeExit_"
import { Finalizer } from "./releaseMap"

/**
 * Creates an effect that executes a finalizer stored in a `Ref`.
 * The `Ref` is yielded as the result of the effect, allowing for
 * control flows that require mutating finalizers.
 */
export const finalizerRef = (initial: Finalizer) =>
  makeExit_(makeRef(initial), (ref, exit) => T.chain_(ref.get, (f) => f(exit)))
