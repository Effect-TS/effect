import type { Tag } from "../Has"
import type { Effect } from "./effect"
import { map_ } from "./map_"

/**
 * Maps the success value of this effect to a service.
 */
export function asService<A>(has: Tag<A>) {
  return <S, R, E>(fa: Effect<S, R, E, A>) => map_(fa, has.of)
}
