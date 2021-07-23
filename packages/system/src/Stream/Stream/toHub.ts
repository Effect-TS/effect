// ets_tracing: off

import { pipe } from "../../Function"
import * as H from "../../Hub"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import type * as Take from "../Take"
import type { Stream } from "./definitions"
import { intoHubManaged_ } from "./intoHubManaged"

/**
 * Converts the stream to a managed hub of chunks. After the managed hub is used,
 * the hub will never again produce values and should be discarded.
 */
export function toHub_<R, E, O>(
  self: Stream<R, E, O>,
  capacity: number
): M.Managed<R, never, H.XHub<never, unknown, unknown, never, never, Take.Take<E, O>>> {
  return pipe(
    H.makeBounded<Take.Take<E, O>>(capacity),
    T.toManagedRelease((_) => H.shutdown(_)),
    M.tap((hub) => M.fork(intoHubManaged_(self, hub)))
  )
}

/**
 * Converts the stream to a managed hub of chunks. After the managed hub is used,
 * the hub will never again produce values and should be discarded.
 */
export function toHub(capacity: number) {
  return <R, E, O>(self: Stream<R, E, O>) => toHub_(self, capacity)
}
