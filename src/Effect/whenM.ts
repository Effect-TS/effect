import * as O from "../Option"
import { chain_, unit } from "./core"
import type { Effect } from "./effect"
import { map_ } from "./map_"

export function whenM<R, E>(b: Effect<R, E, boolean>) {
  return <R1, E1, A>(f: Effect<R1, E1, A>) =>
    chain_(b, (a) => (a ? map_(f, O.some) : map_(unit, () => O.none)))
}
