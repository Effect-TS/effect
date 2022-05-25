/**
 * Switches over to the stream produced by the provided function in case this
 * one fails with some typed error.
 *
 * @tsplus fluent ets/Stream catchSome
 */
export function catchSome_<R, E, A, R2, E2, A2>(
  self: Stream<R, E, A>,
  pf: (e: E) => Option<Stream<R2, E2, A2>>,
  __tsplusTrace?: string
): Stream<R & R2, E | E2, A | A2> {
  return self.catchAll((e): Stream<R2, E | E2, A2> => pf(e).getOrElse(Stream.fail(e)))
}

/**
 * Switches over to the stream produced by the provided function in case this
 * one fails with some typed error.
 *
 * @tsplus static ets/Stream/Aspects catchSome
 */
export const catchSome = Pipeable(catchSome_)
