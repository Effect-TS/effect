import * as Effect from "../Effect.ts"
import * as Fiber from "../Fiber.ts"

// Cleanup fibers started by atom finalizers, so an effectful registry owner can
// wait for them while `dispose` itself stays synchronous.
const pendingFinalizers = new WeakMap<object, Set<Fiber.Fiber<unknown, unknown>>>()

/** @internal */
export const trackFinalizer = (registry: object, fiber: Fiber.Fiber<unknown, unknown>): void => {
  if (fiber.pollUnsafe() !== undefined) return
  let fibers = pendingFinalizers.get(registry)
  if (fibers === undefined) {
    fibers = new Set()
    pendingFinalizers.set(registry, fibers)
  }
  const set = fibers
  set.add(fiber)
  fiber.addObserver(() => set.delete(fiber))
}

/** @internal */
export const awaitFinalizers = (registry: object): Effect.Effect<void> =>
  Effect.suspend(() => {
    const fibers = pendingFinalizers.get(registry)
    return fibers === undefined ? Effect.void : Effect.asVoid(Fiber.awaitAll(Array.from(fibers)))
  })
