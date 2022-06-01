/**
 * Zips this stream with another point-wise, and keeps only elements from this
 * stream.
 *
 * The provided default value will be used if the other stream ends before
 * this one.
 *
 * @tsplus fluent ets/Stream zipAllLeft
 */
export function zipAllLeft_<R, E, A, R2, E2, A2>(
  self: Stream<R, E, A>,
  that: LazyArg<Stream<R2, E2, A2>>,
  def: LazyArg<A>,
  __tsplusTrace?: string
): Stream<R | R2, E | E2, A> {
  return self.zipAllWith(that, identity, def, (a, _) => a)
}

/**
 * Zips this stream with another point-wise, and keeps only elements from this
 * stream.
 *
 * The provided default value will be used if the other stream ends before
 * this one.
 *
 * @tsplus static ets/Stream/Aspects zipAllLeft
 */
export const zipAllLeft = Pipeable(zipAllLeft_)
