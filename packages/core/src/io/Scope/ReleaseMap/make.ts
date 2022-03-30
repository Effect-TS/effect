import { identity } from "../../../data/Function"
import { Effect } from "../../Effect"
import { Ref } from "../../Ref"
import { ReleaseMap } from "./definition"
import type { State } from "./state"
import { Running } from "./state"

/**
 * Creates a new `ReleaseMap`.
 *
 * @tsplus static ets/ReleaseMapOps make
 */
export const make = Effect.succeed(unsafeMake)

/**
 * Unsafely creates a new `ReleaseMap`.
 *
 * @tsplus static ets/ReleaseMapOps unsafeMake
 */
export function unsafeMake(): ReleaseMap {
  return ReleaseMap(Ref.unsafeMake<State>(new Running(0, new Map(), identity)))
}
