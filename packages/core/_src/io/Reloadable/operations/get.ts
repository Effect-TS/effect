/**
 * @tsplus static effect/core/io/Reloadable.Ops get
 */
export function get<Service>(
  tag: Tag<Reloadable<Service>>
): Effect<Reloadable<Service>, never, Service> {
  return Effect.serviceWithEffect(tag, (reloadable) => reloadable.get)
}
