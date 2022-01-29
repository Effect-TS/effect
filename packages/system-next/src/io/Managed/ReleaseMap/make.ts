import { identity } from "../../../data/Function"
import { Effect } from "../../Effect"
import { unsafeMake as unsafeMakeRef } from "../../Ref/operations/make"
import { ReleaseMap } from "./definition"
import type { State } from "./state"
import { Running } from "./state"

/**
 * Creates a new `ReleaseMap`.
 *
 * @ets static ets/ReleaseMapOps make
 */
export const make = Effect.succeed(unsafeMake)

/**
 * Unsafely creates a new `ReleaseMap`.
 *
 * @ets static ets/ReleaseMapOps unsafeMake
 */
export function unsafeMake(): ReleaseMap {
  return ReleaseMap(unsafeMakeRef<State>(new Running(0, new Map(), identity)))
}
