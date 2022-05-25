/**
 * Returns a combined string resulting from concatenating each of the values
 * from the stream beginning with `before` interspersed with `middle` and
 * ending with `after`.
 *
 * @tsplus fluent ets/Stream mkStringAffixes
 */
export function mkStringAffixes_<R, E, A>(
  self: Stream<R, E, A>,
  start: LazyArg<string>,
  middle: LazyArg<string>,
  end: LazyArg<string>,
  __tsplusTrace?: string
): Effect<R, E, string> {
  return self.intersperseAffixes(start, middle, end).mkString()
}

/**
 * Returns a combined string resulting from concatenating each of the values
 * from the stream beginning with `before` interspersed with `middle` and
 * ending with `after`.
 *
 * @tsplus static ets/Stream/Aspects mkStringAffixes
 */
export const mkStringAffixes = Pipeable(mkStringAffixes_)
