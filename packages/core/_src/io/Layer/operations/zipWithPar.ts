import { ILayerZipWithPar } from "@effect/core/io/Layer/definition"

/**
 * Combines this layer the specified layer, producing a new layer that has the
 * inputs of both, and the outputs of both combined using the specified
 * function.
 *
 * @tsplus static effect/core/io/Layer.Aspects zipWithPar
 * @tsplus pipeable effect/core/io/Layer zipWithPar
 */
export function zipWithPar<R1, E1, A1, A, A2>(
  that: LazyArg<Layer<R1, E1, A1>>,
  f: (a: Env<A>, b: Env<A1>) => Env<A2>
) {
  return <R, E>(self: Layer<R, E, A>): Layer<R | R1, E | E1, A2> =>
    Layer.suspend(
      new ILayerZipWithPar(self, that(), f)
    )
}
