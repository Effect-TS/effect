import * as O from "../Option"
import { chain_, unit } from "./core"
import type { Effect } from "./effect"
import { map_ } from "./map_"

export function whenM<S, R, E>(b: Effect<S, R, E, boolean>) {
  return <S1, R1, E1, A>(f: Effect<S1, R1, E1, A>) =>
    chain_(b, (a) => (a ? map_(f, O.some) : map_(unit, () => O.none)))
}
