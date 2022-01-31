// ets_tracing: off

import type * as T from "../../Effect/index.js"
import * as M from "../_internal/managed.js"
import type { Stream } from "./definitions.js"
import { managed } from "./managed.js"

/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed
 */
export function bracket_<R, E, A, X>(
  acquire: T.Effect<R, E, A>,
  release: (a: A) => T.Effect<R, never, X>
): Stream<R, E, A> {
  return managed(M.make_(acquire, release))
}

/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed
 */
export function bracket<R, A, X>(release: (a: A) => T.Effect<R, never, X>) {
  return <E>(acquire: T.Effect<R, E, A>) => bracket_(acquire, release)
}
