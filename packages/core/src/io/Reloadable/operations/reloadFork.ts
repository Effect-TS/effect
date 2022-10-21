/**
 * @tsplus static effect/core/io/Reloadable.Ops reloadFork
 */
export function reloadFork<Service>(
  tag: Tag<Service>
): Effect<Reloadable<Service>, never, void> {
  return Effect.serviceWithEffect(tag.reloadable, (reloadable) => reloadable.reloadFork)
}
