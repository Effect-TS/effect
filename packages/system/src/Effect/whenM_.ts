import * as O from "../Option"
import { chain_, unit } from "./core"
import type { Effect } from "./effect"
import { map_ } from "./map_"

export const whenM_ = <S1, R1, E1, A, S, R, E>(
  f: Effect<S1, R1, E1, A>,
  b: Effect<S, R, E, boolean>
) => chain_(b, (a) => (a ? map_(f, O.some) : map_(unit, () => O.none)))
