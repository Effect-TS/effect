import { reloadableTag } from "@effect/core/io/Reloadable/operations/_internal/ReloadableInternal"
import type * as Context from "@fp-ts/data/Context"

/**
 * @tsplus static effect/core/io/Reloadable.Ops reloadFork
 * @category environment
 * @since 1.0.0
 */
export function reloadFork<Service>(
  tag: Context.Tag<Service>
): Effect<Reloadable<Service>, never, void> {
  return Effect.serviceWithEffect(reloadableTag(tag), (reloadable) => reloadable.reloadFork)
}
