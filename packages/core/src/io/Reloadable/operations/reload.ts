import { reloadableTag } from "@effect/core/io/Reloadable/operations/_internal/ReloadableInternal"
import type * as Context from "@fp-ts/data/Context"

/**
 * @tsplus static effect/core/io/Reloadable.Ops reload
 * @category environment
 * @since 1.0.0
 */
export function reload<Service>(
  tag: Context.Tag<Service>
): Effect<Reloadable<Service>, unknown, void> {
  return Effect.serviceWithEffect(reloadableTag(tag), (reloadable) => reloadable.reload)
}
