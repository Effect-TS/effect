// tracing: off

import { managedUse_ as use_ } from "../Effect/excl-forEach"
import type * as T from "./deps"
import type { Managed } from "./managed"

/**
 * Run an effect while acquiring the resource before and releasing it after
 *
 * @dataFirst use_
 */
export function use<A, R2, E2, B>(f: (a: A) => T.Effect<R2, E2, B>, __trace?: string) {
  return <R, E>(self: Managed<R, E, A>): T.Effect<R & R2, E | E2, B> =>
    use_(self, f, __trace)
}

export { use_ }
