import * as O from "../Option"
import { chain_, unit } from "./core"
import type { Effect } from "./effect"
import { map_ } from "./map_"

export function whenM_<R1, E1, A, R, E>(
  f: Effect<R1, E1, A>,
  b: Effect<R, E, boolean>
) {
  return chain_(b, (a) => (a ? map_(f, O.some) : map_(unit, () => O.none)))
}
