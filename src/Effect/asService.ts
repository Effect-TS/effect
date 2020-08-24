import type { Augmented, Has } from "../Has"
import { HasURI } from "../Has"
import type { Effect } from "./effect"
import { map_ } from "./map_"

/**
 * Maps the success value of this effect to a service.
 */
export function asService<A>(has: Augmented<A>) {
  return <S, R, E>(fa: Effect<S, R, E, A>) =>
    map_(fa, (a) => (({ [has[HasURI].key]: a } as unknown) as Has<A>))
}
