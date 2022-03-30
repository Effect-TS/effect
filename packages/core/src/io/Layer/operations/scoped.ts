import type { LazyArg } from "../../../data/Function"
import type { Has, Tag } from "../../../data/Has"
import type { Effect } from "../../Effect"
import type { HasScope } from "../../Scope"
import { ILayerScoped, Layer } from "../definition"
import { environmentFor } from "./_internal/environmentFor"

/**
 * Constructs a layer from the specified scoped effect.
 *
 * @tsplus static ets/LayerOps scoped
 */
export function scoped<T>(_: Tag<T>) {
  return <R, E, A>(
    effect: LazyArg<Effect<R & HasScope, E, T>>,
    __tsplusTrace?: string
  ): Layer<R, E, Has<T>> =>
    Layer.suspend(
      new ILayerScoped(effect().flatMap((a) => environmentFor(_, a))).setKey(_.key)
    )
}
