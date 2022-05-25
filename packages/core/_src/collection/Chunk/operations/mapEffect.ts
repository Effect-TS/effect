/**
 * Effectfully maps the elements of this chunk.
 *
 * @tsplus fluent Chunk mapEffect
 */
export function mapEffect_<A, R, E, B>(
  self: Chunk<A>,
  f: (a: A) => Effect<R, E, B>,
  __tsplusTrace?: string
): Effect<R, E, Chunk<B>> {
  return Effect.forEach(self, f)
}

/**
 * Effectfully maps the elements of this chunk.
 *
 * @tsplus static Chunk/Aspects mapEffect
 */
export const mapEffect = Pipeable(mapEffect_)
