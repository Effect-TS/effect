import * as T from "../../Effect/operations/serviceWith"
import type { Has, Tag } from "../../Has"
import type { Managed } from "../definition"
import { fromEffect } from "./fromEffect"

/**
 * Accesses the specified service in the environment of the effect.
 */
export function serviceWith<T>(_: Tag<T>) {
  return <A>(f: (service: T) => A, __trace?: string): Managed<Has<T>, never, A> =>
    fromEffect(T.serviceWith(_)(f), __trace)
}
