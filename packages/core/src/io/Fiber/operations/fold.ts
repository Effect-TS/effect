import { realFiber } from "@effect/core/io/Fiber/definition"

/**
 * Folds over the runtime or synthetic fiber.
 *
 * @tsplus static effect/core/io/Fiber.Aspects fold
 * @tsplus static effect/core/io/RuntimeFiber.Aspects fold
 * @tsplus pipeable effect/core/io/Fiber fold
 * @tsplus pipeable effect/core/io/RuntimeFiber fold
 */
export function fold<E, A, Z>(
  onRuntime: (_: Fiber.Runtime<E, A>) => Z,
  onSynthetic: (_: Fiber.Synthetic<E, A>) => Z
) {
  return (self: Fiber<E, A>): Z => {
    realFiber(self)
    switch (self._tag) {
      case "RuntimeFiber": {
        return onRuntime(self)
      }
      case "SyntheticFiber": {
        return onSynthetic(self)
      }
    }
  }
}
