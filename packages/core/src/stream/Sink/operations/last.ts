/**
 * Creates a sink containing the last value.
 *
 * @tsplus static effect/core/stream/Sink.Ops last
 */
export function last<In>(): Sink<never, never, In, In, Maybe<In>> {
  return Sink.foldLeft(Maybe.empty<In>(), (_, input) => Maybe.some(input))
}
