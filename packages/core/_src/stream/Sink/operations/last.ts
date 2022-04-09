/**
 * Creates a sink containing the last value.
 *
 * @tsplus static ets/Sink/Ops last
 */
export function last<In>(
  __tsplusTrace?: string
): Sink<unknown, never, In, In, Option<In>> {
  return Sink.foldLeft(Option.emptyOf<In>(), (_, input) => Option.some(input));
}
