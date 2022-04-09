/**
 * Effectfully maps the elements of this chunk purely for the effects.
 *
 * @tsplus fluent Chunk mapEffectDiscard
 */
export function mapEffectDiscard_<A, R, E, B>(
  self: Chunk<A>,
  f: (a: A) => Effect<R, E, B>,
  __tsplusTrace?: string
): Effect<R, E, void> {
  return Effect.forEachDiscard(self, f);
}

/**
 * Effectfully maps the elements of this chunk purely for the effects.
 *
 * @tsplus static Chunk/Aspects mapEffectDiscard
 */
export const mapEffectDiscard = Pipeable(mapEffectDiscard_);
