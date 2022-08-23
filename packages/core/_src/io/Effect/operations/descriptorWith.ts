/**
 * Constructs an effect based on information about the current fiber, such as
 * its identity.
 *
 * @tsplus static effect/core/io/Effect.Ops descriptorWith
 */
export function descriptorWith<R, E, A>(
  f: (descriptor: Fiber.Descriptor) => Effect<R, E, A>
): Effect<R, E, A> {
  return Effect.withFiberRuntime((state, status) => {
    return f({
      id: state.id,
      status,
      interrupters: state.getFiberRef(FiberRef.interruptedCause).interruptors
    })
  })
}
