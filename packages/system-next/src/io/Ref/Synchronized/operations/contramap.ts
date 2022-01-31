import { Effect } from "../../../Effect"
import type { XSynchronized } from "../definition"
import { contramapEffect_ } from "./contramapEffect"

/**
 * Transforms the `set` value of the `XRef.Synchronized` with the specified
 * function.
 */
export function contramap_<RA, RB, EA, EB, A, B, C>(
  self: XSynchronized<RA, RB, EA, EB, A, B>,
  f: (c: C) => A
): XSynchronized<RA, RB, EA, EB, C, B> {
  return contramapEffect_(self, (c) => Effect.succeedNow(f(c)))
}

export function contramap<C, A>(f: (c: C) => A) {
  return <RA, RB, EA, EB, B>(
    self: XSynchronized<RA, RB, EA, EB, A, B>
  ): XSynchronized<RA, RB, EA, EB, C, B> => contramap_(self, f)
}
