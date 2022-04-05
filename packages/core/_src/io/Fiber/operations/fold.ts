import { realFiber } from "@effect-ts/core/io/Fiber/definition";

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
  realFiber(self);
  switch (self._tag) {
    case "RuntimeFiber": {
      return onRuntime(self);
    }
    case "SyntheticFiber": {
      return onSynthetic(self);
    }
  }
}

/**
 * Folds over the runtime or synthetic fiber.
 *
 * @tsplus static ets/Fiber/Aspects fold
 */
export const fold = Pipeable(fold_);
