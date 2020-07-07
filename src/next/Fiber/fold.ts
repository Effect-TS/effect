import { Fiber, Runtime, Syntetic } from "./fiber"

/**
 * Folds over the runtime or synthetic fiber.
 */
export const fold = <E, A, Z>(
  runtime: (_: Runtime<E, A>) => Z,
  syntetic: (_: Syntetic<E, A>) => Z
) => (fiber: Fiber<E, A>) => {
  switch (fiber._tag) {
    case "RuntimeFiber": {
      return runtime(fiber)
    }
    case "SynteticFiber": {
      return syntetic(fiber)
    }
  }
}
