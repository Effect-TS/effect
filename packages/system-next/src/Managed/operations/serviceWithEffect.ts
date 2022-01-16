// ets_tracing: off

import type { Effect } from "../../Effect/definition"
import * as T from "../../Effect/operations/serviceWithEffect"
import type { Has, Tag } from "../../Has"
import type { Managed } from "../definition"
import { fromEffect } from "./fromEffect"

/**
 * Effectfully accesses the specified service in the environment of the
 * effect.
 */
export function serviceWithEffect<T>(_: Tag<T>) {
  return <R, E, A>(
    f: (service: T) => Effect<R, E, A>,
    __trace?: string
  ): Managed<R & Has<T>, E, A> => fromEffect(T.serviceWithEffect(_)(f), __trace)
}
