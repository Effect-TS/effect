import { ILayerSuspend, ILayerZipWithPar } from "@effect/core/io/Layer/definition"
import type { Context } from "@fp-ts/data/Context"

/**
 * Combines this layer the specified layer, producing a new layer that has the
 * inputs of both, and the outputs of both combined using the specified
 * function.
 *
 * @tsplus static effect/core/io/Layer.Aspects zipWithPar
 * @tsplus pipeable effect/core/io/Layer zipWithPar
 * @category zipping
 * @since 1.0.0
 */
export function zipWithPar<R1, E1, A1, A, A2>(
  that: Layer<R1, E1, A1>,
  f: (a: Context<A>, b: Context<A1>) => Context<A2>
) {
  return <R, E>(self: Layer<R, E, A>): Layer<R | R1, E | E1, A2> =>
    new ILayerSuspend(() => new ILayerZipWithPar(self, that, f))
}
