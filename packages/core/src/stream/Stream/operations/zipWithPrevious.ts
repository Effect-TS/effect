import * as Option from "@fp-ts/data/Option"

/**
 * Zips each element with the previous element. Initially accompanied by
 * `None`.
 *
 * @tsplus getter effect/core/stream/Stream zipWithPrevious
 * @category zipping
 * @since 1.0.0
 */
export function zipWithPrevious<R, E, A>(
  self: Stream<R, E, A>
): Stream<R, E, readonly [Option.Option<A>, A]> {
  return self.mapAccum(
    Option.none as Option.Option<A>,
    (prev, next) => [Option.some(next), [prev, next] as const]
  )
}
