import { Option, some, none } from "fp-ts/lib/Option"

import { Effect } from "../Support/Common/effect"

import { map_ } from "./map"
import { pure } from "./pure"

export function when(
  predicate: boolean
): <S, R, E, A>(ma: Effect<S, R, E, A>) => Effect<S, R, E, Option<A>> {
  return (ma) => (predicate ? map_(ma, some) : pure(none))
}
