import type { LazyArg } from "../../../data/Function"
import type { Has, Tag } from "../../../data/Has"
import { Effect } from "../../Effect"
import { Managed } from "../../Managed"
import type { Layer } from "../definition"
import { ILayerManaged } from "../definition"
import { environmentFor } from "./_internal/environmentFor"

/**
 * Construct a service layer from a value
 *
 * @tsplus static ets/LayerOps fromValue
 */
export function fromValue<T>(_: Tag<T>) {
  return (resource: LazyArg<T>): Layer<{}, never, Has<T>> =>
    new ILayerManaged(
      Managed.fromEffect(Effect.succeed(resource)).flatMap((a) => environmentFor(_, a))
    ).setKey(_.key)
}
