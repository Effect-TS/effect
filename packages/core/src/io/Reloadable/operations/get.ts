import { reloadableTag } from "@effect/core/io/Reloadable/operations/_internal/ReloadableInternal"
import type * as Context from "@fp-ts/data/Context"

/**
 * @tsplus static effect/core/io/Reloadable.Ops get
 * @category environment
 * @since 1.0.0
 */
export function get<Service>(
  tag: Context.Tag<Service>
): Effect<Reloadable<Service>, never, Service> {
  return Effect.serviceWithEffect(reloadableTag(tag), (reloadable) => reloadable.get)
}
