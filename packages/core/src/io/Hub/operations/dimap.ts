import { Effect } from "../../Effect"
import type { XHub } from "../definition"

/**
 * Transforms messages published to and taken from the hub using the
 * specified functions.
 *
 * @tsplus fluent ets/XHub dimap
 */
export function dimap_<RA, RB, EA, EB, A, B, C, D>(
  self: XHub<RA, RB, EA, EB, A, B>,
  f: (c: C) => A,
  g: (b: B) => D
): XHub<RA, RB, EA, EB, C, D> {
  return self.dimapEffect(
    (c) => Effect.succeed(f(c)),
    (b) => Effect.succeed(g(b))
  )
}

/**
 * Transforms messages published to and taken from the hub using the
 * specified functions.
 */
export const dimap = Pipeable(dimap_)
