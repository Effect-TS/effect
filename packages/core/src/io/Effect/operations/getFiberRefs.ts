/**
 * Returns a collection of all `FiberRef` values for the fiber running this
 * effect.
 *
 * @tsplus static effect/core/io/Effect.Ops getFiberRefs
 */
export const getFiberRefs: Effect<never, never, FiberRefs> = Effect.withFiberRuntime((state) =>
  Effect.succeed(state.getFiberRefs)
)
