/**
 * Effectfully maps the elements of this chunk in parallel.
 *
 * @tsplus fluent Chunk mapEffectPar
 */
export function mapEffectPar_<A, R, E, B>(
  self: Chunk<A>,
  f: (a: A) => Effect<R, E, B>,
  __tsplusTrace?: string
): Effect<R, E, Chunk<B>> {
  return Effect.forEachPar(self, f)
}

/**
 * Effectfully maps the elements of this chunk in parallel.
 *
 * @tsplus static Chunk/Aspects mapEffectPar
 */
export const mapEffectPar = Pipeable(mapEffectPar_)
