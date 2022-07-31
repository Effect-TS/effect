/**
 * Effectfully maps the elements of this chunk in parallel purely for the
 * effects.
 *
 * @tsplus fluent Chunk mapEffectParDiscard
 */
export function mapEffectParDiscard_<A, R, E, B>(
  self: Chunk<A>,
  n: number,
  f: (a: A) => Effect<R, E, B>
): Effect<R, E, void> {
  return Effect.forEachParDiscard(self, f).withParallelism(n)
}

/**
 * Effectfully maps the elements of this chunk in parallel purely for the effects.
 *
 * @tsplus static Chunk/Aspects mapEffectParDiscard
 */
export const mapEffectParDiscard = Pipeable(mapEffectParDiscard_)
