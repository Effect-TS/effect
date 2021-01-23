import type * as T from "../../Effect"
import * as M from "../_internal/managed"
import type { Stream } from "./definitions"
import { managed } from "./managed"

/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed
 */
export function bracket_<R, E, A>(
  acquire: T.Effect<R, E, A>,
  release: (a: A) => T.Effect<R, never, any>
): Stream<R, E, A> {
  return managed(M.make_(acquire, release))
}

/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed
 */
export function bracket<R, A>(release: (a: A) => T.Effect<R, never, any>) {
  return <E>(acquire: T.Effect<R, E, A>) => bracket_(acquire, release)
}
