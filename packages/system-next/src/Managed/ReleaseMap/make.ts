// ets_tracing: off

import * as T from "../../Effect/operations/succeed"
import { identity } from "../../Function"
import * as Ref from "../operations/_internal/ref"
import { ReleaseMap } from "./definition"
import type { State } from "./state"
import { Running } from "./state"

/**
 * Creates a new `ReleaseMap`.
 */
export const make = T.succeed(unsafeMake)

/**
 * Creates a new `ReleaseMap`.
 */
export function unsafeMake(): ReleaseMap {
  return new ReleaseMap(Ref.unsafeMake<State>(new Running(0, new Map(), identity)))
}
