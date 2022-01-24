import type { Has, Tag } from "../../../data/Has"
import { environmentWith } from "../../Effect/operations/environmentWith"
import type { Layer } from "../../Layer"
import { fromEffect_ } from "./fromEffect"

/**
 * Constructs a layer from the environment using the specified function.
 */
export function fromFunction_<A, B>(
  f: (a: A) => B,
  tag: Tag<B>
): Layer<A, never, Has<B>> {
  return fromEffect_(environmentWith(f), tag)
}

/**
 * Constructs a layer from the environment using the specified function.
 *
 * @ets_data_first fromFunction_
 */
export function fromFunction<B>(tag: Tag<B>) {
  return <A>(f: (a: A) => B): Layer<A, never, Has<B>> => fromFunction_(f, tag)
}
