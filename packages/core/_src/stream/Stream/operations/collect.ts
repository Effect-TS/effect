/**
 * Performs a filter and map in a single step.
 *
 * @tsplus fluent ets/Stream collect
 */
export function collect_<R, E, A, B>(
  self: Stream<R, E, A>,
  pf: (a: A) => Option<B>,
  __tsplusTrace?: string
): Stream<R, E, B> {
  return self.mapChunks((chunk) => chunk.collect(pf));
}

/**
 * Performs a filter and map in a single step.
 *
 * @tsplus static ets/Stream/Aspects collect
 */
export const collect = Pipeable(collect_);
