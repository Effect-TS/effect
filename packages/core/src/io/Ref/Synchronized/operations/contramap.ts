import { Effect } from "../../../Effect"
import type { XSynchronized } from "../definition"

/**
 * Transforms the `set` value of the `XRef.Synchronized` with the specified
 * function.
 *
 * @tsplus fluent ets/XSynchronized contramap
 */
export function contramap_<RA, RB, EA, EB, A, B, C>(
  self: XSynchronized<RA, RB, EA, EB, A, B>,
  f: (c: C) => A
): XSynchronized<RA, RB, EA, EB, C, B> {
  return self.contramapEffect((c) => Effect.succeedNow(f(c)))
}

/**
 * Transforms the `set` value of the `XRef.Synchronized` with the specified
 * function.
 *
 * @ets_data_first contramap_
 */
export function contramap<C, A>(f: (c: C) => A) {
  return <RA, RB, EA, EB, B>(
    self: XSynchronized<RA, RB, EA, EB, A, B>
  ): XSynchronized<RA, RB, EA, EB, C, B> => self.contramap(f)
}
