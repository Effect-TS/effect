import { IStateful } from "@effect/core/io/Effect/definition/primitives"
import type { FiberRuntime } from "@effect/core/io/Fiber/_internal/runtime"
import type { Running } from "@effect/core/io/Fiber/status"

/**
 * Access the fiber runtime that is currently running this fiber.
 *
 * @tsplus static effect/core/io/Effect.Ops withFiberRuntime
 * @category constructors
 * @since 1.0.0
 */
export function withFiberRuntime<R, E, A>(
  onState: (fiber: FiberRuntime<E, A>, status: Running) => Effect<R, E, A>
): Effect<R, E, A> {
  return new IStateful(onState)
}
