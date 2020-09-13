import type { Has, Tag } from "../Has"
import * as L from "../Layer"
import type { Effect } from "./effect"

/**
 * Constructs a layer from this effect.
 */
export const toLayerRaw = <S, R, E, A>(
  effect: Effect<S, R, E, A>
): L.Layer<S, R, E, A> => L.fromRawEffect(effect)

/**
 * Constructs a layer from this effect.
 */
export const toLayer = <A>(tag: Tag<A>) => <S, R, E>(
  effect: Effect<S, R, E, A>
): L.Layer<S, R, E, Has<A>> => L.fromEffect(tag)(effect)
