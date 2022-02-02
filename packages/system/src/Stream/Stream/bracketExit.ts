// ets_tracing: off

import type * as Ex from "../../Exit"
import type * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import type { Stream } from "./definitions"
import { managed } from "./managed"

/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed
 */
export function bracketExit_<R, E, A, X>(
  acquire: T.Effect<R, E, A>,
  release: (a: A, exit: Ex.Exit<any, any>) => T.Effect<R, never, X>
): Stream<R, E, A> {
  return managed(M.makeExit_(acquire, release))
}

/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed
 */
export function bracketExit<R, A, X>(
  release: (a: A, exit: Ex.Exit<any, any>) => T.Effect<R, never, X>
) {
  return <E>(acquire: T.Effect<R, E, A>) => bracketExit_(acquire, release)
}
