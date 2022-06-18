/**
 * Locally installs a supervisor and an effect that succeeds with all the
 * children that have been forked in the returned effect.
 *
 * @tsplus static ets/Effect/Ops withChildren
 */
export function withChildren<R, E, A>(
  get: (children: Effect<never, never, Chunk<Fiber.Runtime<any, any>>>) => Effect<R, E, A>,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return Supervisor.track().flatMap((supervisor) =>
    get(
      supervisor.value.flatMap((children) =>
        Effect.descriptor.map((descriptor) =>
          // Filter out the fiber id of whoever is calling `withChildren`
          children.filter((fiber) => !(fiber.id() == descriptor.id))
        )
      )
    ).supervised(supervisor)
  )
}
