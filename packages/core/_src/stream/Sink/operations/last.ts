/**
 * Creates a sink containing the last value.
 *
 * @tsplus static ets/Sink/Ops last
 */
export function last<In>(
  __tsplusTrace?: string
): Sink<never, never, In, In, Maybe<In>> {
  return Sink.foldLeft(Maybe.emptyOf<In>(), (_, input) => Maybe.some(input))
}
