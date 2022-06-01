/**
 * Zips this stream with another point-wise, and keeps only elements from the
 * other stream.
 *
 * The provided default value will be used if this stream ends before the
 * other one.
 *
 * @tsplus fluent ets/Stream zipAllRight
 */
export function zipAllRight_<R, E, A, R2, E2, A2>(
  self: Stream<R, E, A>,
  that: LazyArg<Stream<R2, E2, A2>>,
  def: LazyArg<A2>,
  __tsplusTrace?: string
): Stream<R | R2, E | E2, A2> {
  return self.zipAllWith(that, def, identity, (_, a2) => a2)
}

/**
 * Zips this stream with another point-wise, and keeps only elements from the
 * other stream.
 *
 * The provided default value will be used if this stream ends before the
 * other one.
 *
 * @tsplus static ets/Stream/Aspects zipAllRight
 */
export const zipAllRight = Pipeable(zipAllRight_)
