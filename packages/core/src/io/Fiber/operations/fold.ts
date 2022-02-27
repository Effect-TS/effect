import type { Fiber } from "../definition"
import { realFiber } from "../definition"

/**
 * Folds over the runtime or synthetic fiber.
 *
 * @tsplus fluent ets/Fiber fold
 * @tsplus fluent ets/RuntimeFiber fold
 */
export function fold_<E, A, Z>(
  self: Fiber<E, A>,
  onRuntime: (_: Fiber.Runtime<E, A>) => Z,
  onSynthetic: (_: Fiber.Synthetic<E, A>) => Z
): Z {
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

/**
 * Folds over the runtime or synthetic fiber.
 *
 * @ets_data_first fold_
 */
export function fold<E, A, Z>(
  onRuntime: (_: Fiber.Runtime<E, A>) => Z,
  onSynthetic: (_: Fiber.Synthetic<E, A>) => Z
) {
  return (self: Fiber<E, A>): Z => self.fold(onRuntime, onSynthetic)
}
