/**
 * Creates a new supervisor that tracks children in a set.
 *
 * @tsplus static ets/Supervisor/Ops fibersIn
 */
export function fibersIn(
  ref: AtomicReference<SortedSet<Fiber.Runtime<any, any>>>
): Effect<never, never, Supervisor<SortedSet<Fiber.Runtime<any, any>>>> {
  return Effect.succeed(
    new Supervisor(
      Effect.succeed(() => ref.get),
      (_environment, _effect, _parent, fiber) => {
        const set = ref.get
        ref.set(set.add(fiber))
      },
      (_exit, fiber) => {
        const set = ref.get
        ref.set(set.remove(fiber))
      }
    )
  )
}
