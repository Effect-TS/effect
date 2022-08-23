/**
 * Updates the `FiberRef` values for the fiber running this effect using the
 * specified function.
 *
 * @tsplus static effect/core/io/Effect.Ops updateFiberRefs
 */
export function updateFiberRefs(
  f: (fiberId: FiberId.Runtime, fiberRefs: FiberRefs) => FiberRefs
): Effect<never, never, void> {
  return Effect.withFiberRuntime((state) => {
    state.setFiberRefs(f(state.id, state.getFiberRefs))
    return Effect.unit
  })
}
