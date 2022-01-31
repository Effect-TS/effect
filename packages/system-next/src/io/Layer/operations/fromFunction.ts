import type { Has, Tag } from "../../../data/Has"
import { Effect } from "../../Effect"
import { Layer } from "../../Layer"

/**
 * Constructs a layer from the environment using the specified function.
 *
 * @tsplus static ets/LayerOps fromFunction
 */
export function fromFunction<B>(_: Tag<B>) {
  return <A>(f: (a: A) => B): Layer<A, never, Has<B>> =>
    Layer.fromEffect(_)(Effect.environmentWith<A, B>(f))
}
